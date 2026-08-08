import json
from pathlib import Path

import pytest


CONTRACT_PATH = str(
    Path(__file__).resolve().parents[2] / "contracts" / "Frostline.py"
)

POLICY = (
    "Release requires attributable sensor telemetry inside the declared range, "
    "an unbroken custody chain, independent receipt, and an applicable public "
    "handling standard. Any unsupported excursion, conflicting source, custody "
    "gap, unavailable evidence, or material uncertainty requires quarantine or "
    "physical inspection. Release is never the uncertainty fallback."
)

BASE_SHIPMENT = (
    "lot-arctic-17",
    "Temperature-sensitive biologic",
    "BATCH-ARCTIC-17",
    "Lyon distribution center",
    "Paris receiving pharmacy",
    1893456000,
    1893542400,
    2000,
    8000,
    "https://example.org/shipments/arctic-17",
)


def deploy_protocol(direct_vm, direct_deploy, owner):
    direct_vm.sender = owner
    contract = direct_deploy(CONTRACT_PATH)
    contract.configure_protocol("Frostline Release Board", POLICY, 300, 300)
    return contract


def register_base(contract):
    contract.register_shipment(*BASE_SHIPMENT)


def attach_required(contract):
    contract.attach_sensor_manifest(
        "sensor-arctic-17",
        "lot-arctic-17",
        "https://example.org/telemetry/arctic-17",
        2,
        288,
        3100,
        6900,
        "Two calibrated sensors reported samples throughout the transport window.",
    )
    contract.record_custody_handoff(
        "handoff-arctic-17",
        "lot-arctic-17",
        "https://example.org/custody/arctic-17",
        "Lyon Carrier",
        "Paris Pharmacy",
        1893542400,
        "The sealed lot was transferred to the receiving pharmacist at arrival.",
    )
    contract.attach_release_standard(
        "standard-arctic-17",
        "lot-arctic-17",
        "https://example.org/standards/cold-chain",
        "Public Medicines Authority",
        "Cold-chain handling standard",
        "The cited standard defines the applicable two-to-eight Celsius envelope.",
    )


def acknowledge_and_seal(contract, direct_vm, owner, receiver):
    direct_vm.sender = receiver
    contract.acknowledge_receipt(
        "lot-arctic-17",
        "https://example.org/receipts/arctic-17",
        "The receiver confirms seal integrity and possession of the logged shipment.",
    )
    direct_vm.sender = owner
    contract.seal_dossier("lot-arctic-17")


def prepare_sealed(contract, direct_vm, owner, receiver):
    register_base(contract)
    attach_required(contract)
    acknowledge_and_seal(contract, direct_vm, owner, receiver)


def assessment(
    disposition="release",
    risk="low",
    confidence=8800,
    excursion_minutes=0,
    reason_codes=None,
):
    return {
        "disposition": disposition,
        "risk_class": risk,
        "confidence_bps": confidence,
        "excursion_minutes": excursion_minutes,
        "summary": "Telemetry, custody, receipt, and the release standard support this decision.",
        "reason_codes": reason_codes or ["telemetry_within_range"],
        "source_findings": [
            "The manifest reports temperatures inside the declared envelope.",
            "The custody and receiver records identify both sides of the handoff.",
        ],
    }


def mock_assessment(direct_vm, value=None):
    direct_vm.clear_mocks()
    direct_vm.mock_web(
        r".*example\.org.*",
        {
            "status": 200,
            "body": (
                "Public cold-chain record. Two calibrated sensors stayed between "
                "3.1 C and 6.9 C. Custody transferred from Lyon Carrier to Paris "
                "Pharmacy with an intact seal. The applicable range is 2 C to 8 C."
            ),
        },
    )
    direct_vm.mock_llm(
        r".*independent cold-chain release assessor.*",
        json.dumps(value or assessment()),
    )


def prepare_review(contract, direct_vm, owner, receiver, value=None):
    prepare_sealed(contract, direct_vm, owner, receiver)
    mock_assessment(direct_vm, value)
    direct_vm.sender = owner
    contract.run_initial_assessment("lot-arctic-17")


def open_hold(contract, direct_vm, receiver):
    direct_vm.sender = receiver
    contract.open_quality_hold(
        "hold-arctic-17",
        "lot-arctic-17",
        "https://example.org/holds/arctic-17",
        "A receiver-side logger suggests a possible gap that requires independent review.",
    )


def test_protocol_configuration_and_schema(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    protocol = contract.get_protocol()
    assert protocol["configured"] is True
    assert protocol["neutral_disposition"] == "inspection_required"
    assert protocol["review_window_seconds"] == 300
    assert protocol["evidence_types"] == [
        "sensor_manifest",
        "custody_handoff",
        "excursion_report",
        "release_standard",
    ]


def test_only_owner_can_configure(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the Frostline quality authority"):
        contract.configure_protocol("Frostline", POLICY, 300, 300)


def test_configuration_is_single_use(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("already configured"):
        contract.configure_protocol("Frostline Again", POLICY, 300, 300)


@pytest.mark.parametrize("window", [0, 299, 604801])
def test_rejects_invalid_review_windows(
    direct_vm,
    direct_deploy,
    direct_alice,
    window,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    with direct_vm.expect_revert("Review window"):
        contract.configure_protocol("Frostline", POLICY, window, 300)


@pytest.mark.parametrize("window", [0, 299, 604801])
def test_rejects_invalid_appeal_windows(
    direct_vm,
    direct_deploy,
    direct_alice,
    window,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    with direct_vm.expect_revert("Appeal window"):
        contract.configure_protocol("Frostline", POLICY, 300, window)


def test_registration_persists_domain_fields(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["batch_code"] == "BATCH-ARCTIC-17"
    assert shipment["min_temp_milli_c"] == 2000
    assert shipment["max_temp_milli_c"] == 8000
    assert shipment["status"] == "draft"
    assert contract.get_counts()["shipments"] == 1


def test_registration_requires_configuration(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    with direct_vm.expect_revert("Configure Frostline"):
        register_base(contract)


def test_rejects_duplicate_shipment_id(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    with direct_vm.expect_revert("already exists"):
        register_base(contract)


@pytest.mark.parametrize(
    "shipment_id",
    ["A", "UPPERCASE", "white space", "bad/slash", "punctuation!"],
)
def test_rejects_malformed_shipment_ids(
    direct_vm,
    direct_deploy,
    direct_alice,
    shipment_id,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    args = list(BASE_SHIPMENT)
    args[0] = shipment_id
    with direct_vm.expect_revert("Shipment ID"):
        contract.register_shipment(*args)


@pytest.mark.parametrize(
    "url",
    [
        "http://example.org/file",
        "https://localhost/file",
        "https://127.0.0.1/file",
        "https://10.0.0.1/file",
        "https://192.168.1.1/file",
        "https://user@example.org/file",
    ],
)
def test_rejects_unsafe_primary_urls(
    direct_vm,
    direct_deploy,
    direct_alice,
    url,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    args = list(BASE_SHIPMENT)
    args[-1] = url
    with direct_vm.expect_revert("Primary evidence URL"):
        contract.register_shipment(*args)


@pytest.mark.parametrize(
    ("start", "end", "message"),
    [
        (1893542400, 1893456000, "after transport start"),
        (1893456000, 1893456000, "after transport start"),
        (1893456000, 1896134401, "thirty days"),
    ],
)
def test_rejects_invalid_transport_windows(
    direct_vm,
    direct_deploy,
    direct_alice,
    start,
    end,
    message,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    args = list(BASE_SHIPMENT)
    args[5] = start
    args[6] = end
    with direct_vm.expect_revert(message):
        contract.register_shipment(*args)


@pytest.mark.parametrize(
    ("minimum", "maximum", "message"),
    [
        (8000, 2000, "must exceed"),
        (2000, 2000, "must exceed"),
        (-100001, 8000, "Minimum temperature"),
    ],
)
def test_rejects_invalid_temperature_envelopes(
    direct_vm,
    direct_deploy,
    direct_alice,
    minimum,
    maximum,
    message,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    args = list(BASE_SHIPMENT)
    args[7] = minimum
    args[8] = maximum
    with direct_vm.expect_revert(message):
        contract.register_shipment(*args)


def test_sensor_manifest_is_indexed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    contract.attach_sensor_manifest(
        "sensor-one",
        "lot-arctic-17",
        "https://example.org/sensor",
        1,
        20,
        3000,
        7000,
        "A calibrated sensor exported twenty attributable temperature samples.",
    )
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["evidence_counts"]["sensor_manifest"] == 1
    assert shipment["evidence"][0]["facts"]["sample_count"] == 20
    assert contract.get_counts()["sensor_manifests"] == 1


@pytest.mark.parametrize(
    ("sensor_count", "sample_count", "minimum", "maximum"),
    [(0, 20, 3000, 7000), (1, 1, 3000, 7000), (1, 20, 8000, 7000)],
)
def test_rejects_invalid_sensor_manifest_values(
    direct_vm,
    direct_deploy,
    direct_alice,
    sensor_count,
    sample_count,
    minimum,
    maximum,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    with direct_vm.expect_revert():
        contract.attach_sensor_manifest(
            "sensor-invalid",
            "lot-arctic-17",
            "https://example.org/sensor",
            sensor_count,
            sample_count,
            minimum,
            maximum,
            "A sensor manifest with enough descriptive content for validation.",
        )


def test_custody_handoff_requires_distinct_parties(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    with direct_vm.expect_revert("must be different"):
        contract.record_custody_handoff(
            "handoff-invalid",
            "lot-arctic-17",
            "https://example.org/handoff",
            "Same Party",
            "same party",
            1893542400,
            "This handoff is deliberately invalid because both parties are identical.",
        )


def test_excursion_report_persists_peak_and_duration(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    contract.declare_excursion(
        "excursion-one",
        "lot-arctic-17",
        "https://example.org/excursion",
        9200,
        17,
        "The logger records a brief peak above the declared release envelope.",
    )
    item = contract.get_shipment("lot-arctic-17")["evidence"][0]
    assert item["facts"]["peak_temp_milli_c"] == 9200
    assert item["facts"]["duration_minutes"] == 17
    assert contract.get_counts()["excursion_reports"] == 1


def test_only_operator_can_attach_evidence(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the shipment operator"):
        contract.attach_release_standard(
            "standard-wrong-actor",
            "lot-arctic-17",
            "https://example.org/standard",
            "Authority",
            "Public standard",
            "A different account must not attach standards to this shipment.",
        )


def test_rejects_duplicate_evidence_id(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    attach_required(contract)
    with direct_vm.expect_revert("Evidence ID already exists"):
        contract.declare_excursion(
            "sensor-arctic-17",
            "lot-arctic-17",
            "https://example.org/excursion",
            9000,
            10,
            "The evidence ID collides with the existing sensor manifest identifier.",
        )


def test_caps_evidence_attachments_at_seven(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    for index in range(7):
        contract.declare_excursion(
            f"excursion-{index}",
            "lot-arctic-17",
            f"https://example.org/excursion/{index}",
            9000 + index,
            10 + index,
            "A bounded excursion attachment used to verify dossier source limits.",
        )
    with direct_vm.expect_revert("at most seven"):
        contract.declare_excursion(
            "excursion-overflow",
            "lot-arctic-17",
            "https://example.org/excursion/overflow",
            9900,
            20,
            "The eighth evidence attachment must be rejected by the contract.",
        )


def test_operator_cannot_acknowledge_own_receipt(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    with direct_vm.expect_revert("cannot acknowledge their own receipt"):
        contract.acknowledge_receipt(
            "lot-arctic-17",
            "https://example.org/receipt",
            "An operator cannot serve as the independent receiving party.",
        )


def test_receipt_is_single_use(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    direct_vm.sender = direct_bob
    contract.acknowledge_receipt(
        "lot-arctic-17",
        "https://example.org/receipt",
        "The receiving pharmacist confirms possession and seal integrity.",
    )
    with direct_vm.expect_revert("already acknowledged"):
        contract.acknowledge_receipt(
            "lot-arctic-17",
            "https://example.org/receipt/two",
            "A second acknowledgement must not replace the canonical receiver.",
        )


@pytest.mark.parametrize(
    "missing",
    ["receipt", "sensor_manifest", "custody_handoff", "release_standard"],
)
def test_seal_requires_complete_dossier(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    missing,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    if missing != "sensor_manifest":
        contract.attach_sensor_manifest(
            "sensor-one",
            "lot-arctic-17",
            "https://example.org/sensor",
            1,
            20,
            3000,
            7000,
            "The sensor source is present for the dossier threshold test.",
        )
    if missing != "custody_handoff":
        contract.record_custody_handoff(
            "handoff-one",
            "lot-arctic-17",
            "https://example.org/handoff",
            "Carrier",
            "Receiver",
            1893542400,
            "The custody source is present for the dossier threshold test.",
        )
    if missing != "release_standard":
        contract.attach_release_standard(
            "standard-one",
            "lot-arctic-17",
            "https://example.org/standard",
            "Authority",
            "Handling standard",
            "The release standard is present for the dossier threshold test.",
        )
    if missing != "receipt":
        direct_vm.sender = direct_bob
        contract.acknowledge_receipt(
            "lot-arctic-17",
            "https://example.org/receipt",
            "The independent receiver confirms possession for the threshold test.",
        )
        direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        contract.seal_dossier("lot-arctic-17")


def test_sealed_dossier_is_immutable(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_sealed(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert("before sealing"):
        contract.declare_excursion(
            "late-excursion",
            "lot-arctic-17",
            "https://example.org/late",
            9000,
            20,
            "Late evidence cannot mutate a dossier after it has been sealed.",
        )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("not-json", "inspection_required"),
        ({}, "inspection_required"),
        (
            assessment("release", "medium", 9000),
            "inspection_required",
        ),
        (
            assessment("release", "low", 6900),
            "inspection_required",
        ),
        (
            assessment(
                "release",
                "low",
                9000,
                reason_codes=["prompt_injection_detected"],
            ),
            "inspection_required",
        ),
    ],
)
def test_normalization_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
    raw,
    expected,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    assert contract._normalize_release_disposition(raw)["disposition"] == expected


def test_initial_assessment_opens_timed_review(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["status"] == "review_window"
    assert shipment["active_disposition"] == "release"
    assert shipment["challenge_deadline"] == 1893456300
    assert shipment["active_review"]["phase"] == "initial_release"


def test_only_owner_runs_assessment(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_sealed(contract, direct_vm, direct_alice, direct_bob)
    mock_assessment(direct_vm)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the Frostline quality authority"):
        contract.run_initial_assessment("lot-arctic-17")


def test_quality_hold_requires_independent_actor(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("cannot challenge their own dossier"):
        contract.open_quality_hold(
            "hold-self",
            "lot-arctic-17",
            "https://example.org/hold",
            "The operator is deliberately attempting to challenge their own dossier.",
        )


def test_quality_hold_deadline_is_enforced(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.warp("2030-01-01T00:05:01+00:00")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("deadline has passed"):
        contract.open_quality_hold(
            "hold-late",
            "lot-arctic-17",
            "https://example.org/hold",
            "This hold is filed one second after the configured review deadline.",
        )


def test_hold_resolution_replaces_active_disposition(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    open_hold(contract, direct_vm, direct_bob)
    mock_assessment(
        direct_vm,
        assessment(
            "quarantine",
            "high",
            9100,
            75,
            ["excursion_supported"],
        ),
    )
    direct_vm.sender = direct_alice
    contract.resolve_quality_hold("lot-arctic-17")
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["status"] == "appeal_window"
    assert shipment["active_disposition"] == "quarantine"
    assert shipment["active_review"]["phase"] == "quality_hold"
    assert shipment["quality_hold"]["resolved_disposition"] == "quarantine"


def test_open_hold_blocks_finalization(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    open_hold(contract, direct_vm, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not ready for final disposition"):
        contract.finalize_disposition("lot-arctic-17")


def test_uncontested_review_cannot_close_early(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert("still open"):
        contract.close_uncontested_review("lot-arctic-17")


def test_uncontested_review_closes_after_deadline(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.warp("2030-01-01T00:05:01+00:00")
    contract.close_uncontested_review("lot-arctic-17")
    contract.finalize_disposition("lot-arctic-17")
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["status"] == "released"
    assert shipment["finalized"] is True


def prepare_appeal_window(contract, direct_vm, owner, receiver):
    prepare_review(contract, direct_vm, owner, receiver)
    open_hold(contract, direct_vm, receiver)
    mock_assessment(
        direct_vm,
        assessment(
            "quarantine",
            "high",
            9000,
            75,
            ["excursion_supported"],
        ),
    )
    direct_vm.sender = owner
    contract.resolve_quality_hold("lot-arctic-17")


def test_operator_can_file_release_appeal(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_appeal_window(contract, direct_vm, direct_alice, direct_bob)
    contract.file_release_appeal(
        "appeal-arctic-17",
        "lot-arctic-17",
        "https://example.org/appeals/arctic-17",
        "The counter logger was outside the insulated payload and should not control disposition.",
    )
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["status"] == "release_appeal"
    assert shipment["release_appeal"]["previous_disposition"] == "quarantine"


def test_unrelated_actor_cannot_file_appeal(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_appeal_window(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the shipment operator or hold author"):
        contract.file_release_appeal(
            "appeal-stranger",
            "lot-arctic-17",
            "https://example.org/appeal",
            "An unrelated account cannot inject itself into the release appeal.",
        )


def test_appeal_resolution_replaces_hold_outcome(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_appeal_window(contract, direct_vm, direct_alice, direct_bob)
    contract.file_release_appeal(
        "appeal-arctic-17",
        "lot-arctic-17",
        "https://example.org/appeals/arctic-17",
        "The appeal provides calibrated payload telemetry that resolves the logger placement conflict.",
    )
    mock_assessment(direct_vm, assessment("release", "low", 8200))
    contract.resolve_release_appeal("lot-arctic-17")
    contract.finalize_disposition("lot-arctic-17")
    shipment = contract.get_shipment("lot-arctic-17")
    assert shipment["active_disposition"] == "release"
    assert shipment["status"] == "released"
    assert shipment["release_appeal"]["resolved_disposition"] == "release"
    assert shipment["quality_hold"]["resolved_disposition"] == "quarantine"


def test_appeal_window_cannot_close_early(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_appeal_window(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert("still open"):
        contract.close_appeal_window("lot-arctic-17")


def test_appeal_window_closes_after_deadline(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_appeal_window(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.warp("2030-01-01T00:05:01+00:00")
    contract.close_appeal_window("lot-arctic-17")
    assert (
        contract.get_shipment("lot-arctic-17")["status"]
        == "ready_for_disposition"
    )


def test_only_owner_finalizes_disposition(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.warp("2030-01-01T00:05:01+00:00")
    contract.close_uncontested_review("lot-arctic-17")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the Frostline quality authority"):
        contract.finalize_disposition("lot-arctic-17")


@pytest.mark.parametrize(
    ("value", "expected_status"),
    [
        (assessment("release", "low", 8500), "released"),
        (
            assessment(
                "quarantine",
                "high",
                9000,
                90,
                ["excursion_supported"],
            ),
            "quarantined",
        ),
        (
            assessment(
                "inspection_required",
                "unknown",
                3200,
                0,
                ["insufficient_evidence"],
            ),
            "inspection_required",
        ),
    ],
)
def test_final_disposition_maps_to_canonical_status(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    value,
    expected_status,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob, value)
    direct_vm.warp("2030-01-01T00:05:01+00:00")
    contract.close_uncontested_review("lot-arctic-17")
    contract.finalize_disposition("lot-arctic-17")
    assert contract.get_shipment("lot-arctic-17")["status"] == expected_status
    assert contract.get_counts()[expected_status] == 1


def test_finalization_cannot_replay(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.warp("2030-01-01T00:00:00+00:00")
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.warp("2030-01-01T00:05:01+00:00")
    contract.close_uncontested_review("lot-arctic-17")
    contract.finalize_disposition("lot-arctic-17")
    with direct_vm.expect_revert("not ready for final disposition"):
        contract.finalize_disposition("lot-arctic-17")


def test_timeline_is_ordered_and_attributed(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_sealed(contract, direct_vm, direct_alice, direct_bob)
    timeline = contract.get_shipment_timeline("lot-arctic-17")
    sequences = [item["sequence"] for item in timeline]
    assert sequences == sorted(sequences)
    assert timeline[0]["action"] == "shipment_registered"
    assert timeline[-1]["action"] == "dossier_sealed"
    assert timeline[-2]["actor"].lower() == "0x" + direct_bob.hex()
    chain = contract.get_custody_chain("lot-arctic-17")
    assert chain["consignment"]["batch_code"] == "BATCH-ARCTIC-17"
    assert len(chain["sensor_manifests"]) == 1
    assert len(chain["custody_edges"]) == 1
    assert chain["custody_edges"][0]["from"] == "Lyon Carrier"
    assert chain["custody_edges"][0]["to"] == "Paris Pharmacy"


def test_missing_entities_fail_explicitly(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("Shipment does not exist"):
        contract.get_shipment("missing-shipment")
    with direct_vm.expect_revert("Quality hold does not exist"):
        contract.get_quality_hold("missing-hold")
    with direct_vm.expect_revert("Release appeal does not exist"):
        contract.get_release_appeal("missing-appeal")


def test_dashboard_is_bounded_and_queryable(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    register_base(contract)
    dashboard = contract.get_dashboard()
    assert dashboard["protocol"]["name"] == "Frostline"
    assert dashboard["counts"]["shipments"] == 1
    assert len(dashboard["shipments"]) == 1
    assert contract.get_recent_shipments(999)[0]["id"] == "lot-arctic-17"


def test_validator_accepts_equivalent_independent_result(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    mock_assessment(direct_vm, assessment("release", "low", 8300, 0))
    assert direct_vm.run_validator() is True


@pytest.mark.parametrize(
    "validator_value",
    [
        assessment("quarantine", "high", 9000, 60, ["excursion_supported"]),
        assessment("release", "medium", 8300, 0),
        assessment("release", "low", 3900, 0),
        assessment("release", "low", 8300, 91),
        assessment(
            "inspection_required",
            "unknown",
            3000,
            0,
            ["source_unavailable"],
        ),
    ],
)
def test_validator_rejects_material_disagreement(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    validator_value,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    mock_assessment(direct_vm, validator_value)
    assert direct_vm.run_validator() is False


def test_validator_allows_score_variation_inside_same_bucket(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = deploy_protocol(direct_vm, direct_deploy, direct_alice)
    prepare_review(contract, direct_vm, direct_alice, direct_bob)
    mock_assessment(direct_vm, assessment("release", "low", 9900, 25))
    assert direct_vm.run_validator() is True
