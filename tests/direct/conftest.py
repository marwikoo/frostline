"""Windows compatibility for genlayer-test direct contract loading.

genlayer-test 0.29.2 unlinks its temporary message-context file immediately
after duplicating the file descriptor to stdin. POSIX permits that operation;
Windows keeps the file locked. This project-local shim preserves the file until
the pytest session has restored all direct-mode descriptors.
"""

from pathlib import Path
import os
import shutil
import sys
import tempfile


_TEMP_ROOT = Path(__file__).resolve().parent / ".genlayer-direct-tmp"


def _windows_message_injector(vm):
    from genlayer.py import calldata
    from genlayer.py.types import Address

    def address(value):
        return Address(value) if isinstance(value, bytes) else value

    message_data = {
        "contract_address": address(vm._contract_address),
        "sender_address": address(vm.sender),
        "origin_address": address(vm.origin),
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)
    _TEMP_ROOT.mkdir(exist_ok=True)
    fd, _ = tempfile.mkstemp(dir=_TEMP_ROOT)
    os.write(fd, encoded)
    os.lseek(fd, 0, os.SEEK_SET)
    vm._original_stdin_fd = os.dup(0)
    os.dup2(fd, 0)
    os.close(fd)


def pytest_configure():
    if sys.platform != "win32":
        return
    import gltest.direct.loader as loader

    loader._inject_message_to_fd0 = _windows_message_injector


def pytest_sessionfinish():
    if _TEMP_ROOT.exists():
        shutil.rmtree(_TEMP_ROOT, ignore_errors=True)
