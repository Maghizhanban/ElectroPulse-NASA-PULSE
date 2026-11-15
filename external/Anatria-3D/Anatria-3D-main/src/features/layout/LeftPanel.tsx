import { useState } from "react";

import { AutonomousDiagnosticDossier } from "@/features/nasa/AutonomousDiagnosticDossier";
import { NasaRisksPanel } from "@/features/nasa/NasaRisksPanel";
import { NasaEnginesPanel } from "@/features/nasa/NasaEnginesPanel";
import { AnatomyTree } from "@/features/tree/AnatomyTree";
import { ViewControls } from "@/features/viewer/ViewControls";
import { StatusWindow } from "@/features/help/StatusWindow";
import { StorageNotice } from "./StorageNotice";
import { APP_VERSION_LABEL } from "@/lib/appVersion";

type Tab = "diagnosis" | "risks" | "engines" | "atlas";

/**
 * The left column: Autonomous Clinical Diagnostic Dossier, NASA HRP Risks, Engines, and optional Atlas.
 */
export function LeftPanel() {
  const [tab, setTab] = useState<Tab>("diagnosis");
  const [status, setStatus] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-slate-800">
        <TabButton active={tab === "diagnosis"} onClick={() => setTab("diagnosis")}>
          Diagnosis
        </TabButton>
        <TabButton active={tab === "risks"} onClick={() => setTab("risks")}>
          NASA Risks
          <span className="ml-1 rounded-full bg-red-950/80 border border-red-800/60 px-1 text-[9px] font-bold text-red-300">
            5
          </span>
        </TabButton>
        <TabButton active={tab === "engines"} onClick={() => setTab("engines")}>
          Engines
        </TabButton>
        <TabButton active={tab === "atlas"} onClick={() => setTab("atlas")}>
          Atlas
        </TabButton>
        <button
          type="button"
          onClick={() => setStatus(true)}
          className="shrink-0 self-center px-1.5 text-[9px] font-medium tabular-nums text-slate-600 transition hover:text-slate-300"
          title={`P.U.L.S.E. / Anatria3D ${APP_VERSION_LABEL} — status and log`}
        >
          {APP_VERSION_LABEL}
        </button>
      </div>

      {status && <StatusWindow onClose={() => setStatus(false)} />}

      <div className={`min-h-0 flex-1 ${tab === "diagnosis" ? "" : "hidden"}`}>
        <AutonomousDiagnosticDossier />
      </div>
      <div className={`min-h-0 flex-1 ${tab === "risks" ? "" : "hidden"}`}>
        <NasaRisksPanel />
      </div>
      <div className={`min-h-0 flex-1 ${tab === "engines" ? "" : "hidden"}`}>
        <NasaEnginesPanel />
      </div>
      <div className={`min-h-0 flex-1 ${tab === "atlas" ? "" : "hidden"}`}>
        <AnatomyTree />
      </div>

      <StorageNotice />
      <ViewControls />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 border-b-2 px-3 py-1.5 text-[11px] font-medium transition ${
        active
          ? "border-sky-500 text-slate-100"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
