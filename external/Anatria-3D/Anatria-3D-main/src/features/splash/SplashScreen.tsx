/**
 * The opening screen.
 *
 * Restrained on purpose. This is a teaching tool that a student may open twenty
 * times a day, and an animation that is charming once is an obstruction by the
 * fifth time — so it is quiet, it is short, and it never asks to be watched.
 *
 * The trace is a cardiac rhythm because it is the one motif that is both alive
 * and unmistakably anatomical: a bright segment sweeping a dim line, the way a
 * monitor draws it. Pure SVG and CSS — no image to load, which matters for a
 * screen whose entire job is to be there before anything has loaded.
 */
export function SplashScreen({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030712] transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-label="P.U.L.S.E. Medical Intelligence Initializing"
    >
      <div className="relative flex items-center justify-center">
        {/* Glowing holographic orb */}
        <div className="h-32 w-32 rounded-full border border-cyan-500/40 animate-ping opacity-25"></div>
        <div className="absolute h-24 w-24 rounded-full border-2 border-dashed border-cyan-400/60 animate-spin"></div>
        <div className="absolute h-16 w-16 rounded-full bg-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.8)] backdrop-blur"></div>
        <div className="absolute h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_20px_#22d3ee]"></div>
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-2xl font-bold tracking-[0.3em] uppercase text-cyan-400 font-['Orbitron']">
          P.U.L.S.E.
        </h1>
        <p className="mt-1 text-xs tracking-widest text-slate-400 font-mono uppercase">
          Autonomous Deep-Space Clinical Guardian · Artemis IV
        </p>
      </div>

      <p className="mt-6 text-[11px] font-mono text-cyan-400/80 animate-pulse">
        CALIBRATING 3D SOMATIC ATLAS & BIOMARKER SENSORS...
      </p>
    </div>
  );
}

/**
 * Two PQRST complexes across the viewBox: baseline, P bump, the QRS spike, T
 * bump, baseline. Drawn in straight segments rather than curves because that is
 * how a monitor renders it, and the sharp R spike is what makes it legible at
 * this size.
 */
const TRACE =
  "M0,30 L18,30 L22,24 L26,30 L40,30 L44,33 L48,9 L52,49 L56,30 L70,30 " +
  "L78,30 L84,21 L90,30 L118,30 " +
  "L138,30 L142,24 L146,30 L160,30 L164,33 L168,9 L172,49 L176,30 L190,30 " +
  "L198,30 L204,21 L210,30 L240,30";
