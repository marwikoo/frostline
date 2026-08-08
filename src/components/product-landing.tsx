"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Snowflake, Thermometer } from "lucide-react";
import { contractAddress, contractExplorerUrl } from "@/lib/deployment";

const checkpoints = ["Received", "Telemetry", "Consensus", "Release"];

export function ProductLanding() {
  return (
    <main className="frost-entry" data-landing="cold-chain-console">
      <header className="mast">
        <Link href="./" className="brand"><Snowflake size={20} /> FROSTLINE</Link>
        <div className="network"><i /> STUDIONET 61999</div>
        <Link href="./shipments/">OPEN SHIPMENT CONTROL</Link>
      </header>

      <section className="hero">
        <div className="reading">
          <span className="unit">CHAIN / 02</span>
          <div className="temperature">
            <Thermometer size={28} />
            <strong>2.8</strong><sup>°C</sup>
          </div>
          <span className="signal">REFERENCE BAND 2–8°C</span>
        </div>
        <div className="mission">
          <p>COLD-CHAIN RELEASE AUTHORITY</p>
          <h1>Evidence stays cold.<br />Decisions stay clear.</h1>
          <p className="summary">
            Assemble custody records and public telemetry before releasing or
            quarantining a temperature-sensitive lot.
          </p>
          <Link href="./control/" className="launch">
            Enter flight deck <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="sequence">
        {checkpoints.map((label, index) => (
          <div key={label}>
            <span>0{index + 1}</span>
            <i />
            <strong>{label}</strong>
          </div>
        ))}
      </section>

      <footer className="statusbar">
        <span>CONTRACT</span>
        <code>{contractAddress || "DEPLOYMENT PENDING"}</code>
        <a href={contractExplorerUrl} target="_blank" rel="noreferrer">
          OPEN EXPLORER <ExternalLink size={13} />
        </a>
      </footer>

      <style jsx global>{`
        .frost-entry{min-height:100vh;background:#07152c;color:#f7fbff;font-family:"IBM Plex Sans",sans-serif;border:10px solid #d9ff43}
        .mast{height:70px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 clamp(18px,4vw,56px);border-bottom:1px solid #567195;font-family:"IBM Plex Mono",monospace;font-size:12px}
        .mast a{color:inherit;text-decoration:none}.mast>a:last-child{text-align:right}.brand{font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px}.network{display:flex;align-items:center;gap:8px}.network i{width:8px;height:8px;background:#20e2a8;border-radius:50%;box-shadow:0 0 0 4px #20e2a826}
        .hero{min-height:590px;display:grid;grid-template-columns:minmax(260px,.7fr) 1.5fr}
        .reading{border-right:1px solid #567195;padding:38px clamp(22px,4vw,58px);display:flex;flex-direction:column;justify-content:space-between;background:#0e2241}
        .unit,.signal{font-family:"IBM Plex Mono",monospace;font-size:11px}.temperature{display:flex;align-items:flex-start;color:#d9ff43}.temperature strong{font-family:"IBM Plex Mono",monospace;font-size:clamp(76px,9vw,134px);line-height:.8}.temperature sup{font-size:28px}
        .mission{padding:clamp(50px,8vw,112px);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;position:relative;overflow:hidden}
        .mission:after{content:"";position:absolute;right:-95px;bottom:-120px;width:390px;height:390px;border:70px solid #173761;border-radius:50%;z-index:0}
        .mission>*{position:relative;z-index:1}.mission>p:first-child{font-family:"IBM Plex Mono",monospace;font-size:12px;color:#20e2a8}
        h1{font-size:clamp(48px,6vw,84px);line-height:.98;margin:16px 0 28px;max-width:900px;font-weight:600}.summary{font-size:19px;line-height:1.5;max-width:640px;color:#b7c8de}
        .launch{display:flex;align-items:center;gap:12px;background:#d9ff43;color:#07152c!important;text-decoration:none;font-weight:700;padding:15px 20px;margin-top:24px}
        .sequence{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #567195}.sequence div{padding:22px 26px;border-right:1px solid #567195;display:grid;grid-template-columns:auto 1fr;gap:8px 14px}.sequence div:last-child{border-right:0}.sequence span{font-family:"IBM Plex Mono",monospace;color:#20e2a8}.sequence i{height:3px;background:#567195;align-self:center}.sequence strong{grid-column:2;font-size:14px}
        .statusbar{display:grid;grid-template-columns:auto 1fr auto;gap:18px;padding:16px 24px;background:#d9ff43;color:#07152c;font:11px "IBM Plex Mono",monospace}.statusbar code{overflow:hidden;text-overflow:ellipsis}.statusbar a{color:inherit;display:flex;align-items:center;gap:7px;font-weight:700}
        @media(max-width:720px){.frost-entry{border-width:6px}.mast{grid-template-columns:1fr auto;height:62px}.network{display:none}.hero{grid-template-columns:1fr}.reading{min-height:210px;border-right:0;border-bottom:1px solid #567195}.temperature strong{font-size:78px}.mission{padding:46px 24px;min-height:430px}.mission:after{width:250px;height:250px;border-width:45px}h1{font-size:46px}.sequence{grid-template-columns:1fr 1fr}.sequence div:nth-child(2){border-right:0}.sequence div{border-bottom:1px solid #567195}.statusbar{grid-template-columns:1fr}.statusbar span{display:none}}
      `}</style>
    </main>
  );
}
