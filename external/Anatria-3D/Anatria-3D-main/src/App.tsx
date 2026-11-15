import { useEffect } from "react";

import { ChatPanel } from "@/features/chat/ChatPanel";
import { LeftPanel } from "@/features/layout/LeftPanel";
import { SplashScreen } from "@/features/splash/SplashScreen";
import { useSplash } from "@/features/splash/useSplash";
import { ResizeHandle } from "@/features/layout/ResizeHandle";
import { CHAT_LIMITS, TREE_LIMITS, useLayout } from "@/features/layout/useLayout";
import { AnatomyViewer } from "@/features/viewer/AnatomyViewer";
import { CinematicAiCore } from "@/features/nasa/CinematicAiCore";
import { startViewPersistence } from "@/stores/persistView";
import { useSceneStore } from "@/stores/sceneStore";

/**
 * NASA P.U.L.S.E. Autonomous Flight Surgeon Medical Deck.
 */
export default function App() {
  const { layout, setTreeWidth, setChatWidth } = useLayout();
  const atlasReady = useSceneStore((s) => s.manifest !== null);
  const splash = useSplash(atlasReady);

  useEffect(startViewPersistence, []);

  return (
    <div className="flex h-full w-full bg-gray-950 text-slate-100 overflow-hidden font-['Rajdhani']">
      {splash.visible && <SplashScreen leaving={splash.leaving} />}

      <aside
        hidden={layout.treeCollapsed}
        inert={layout.treeCollapsed}
        className="min-h-0 shrink-0 overflow-hidden"
        style={{ width: layout.treeWidth }}
      >
        <LeftPanel />
      </aside>
      {!layout.treeCollapsed && (
        <ResizeHandle
          width={layout.treeWidth}
          onResize={setTreeWidth}
          side="left"
          min={TREE_LIMITS.min}
          max={TREE_LIMITS.max}
          defaultWidth={TREE_LIMITS.default}
          label="Resize the anatomy panel"
        />
      )}

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gray-950">
        <div className="relative min-h-0 flex-1">
          <AnatomyViewer paused={false} />
          <CinematicAiCore />
        </div>
      </main>

      {!layout.chatCollapsed && (
        <ResizeHandle
          width={layout.chatWidth}
          onResize={setChatWidth}
          side="right"
          min={CHAT_LIMITS.min}
          max={CHAT_LIMITS.max}
          defaultWidth={CHAT_LIMITS.default}
          label="Resize the assistant panel"
        />
      )}
      <aside
        hidden={layout.chatCollapsed}
        inert={layout.chatCollapsed}
        className="min-h-0 shrink-0 overflow-hidden"
        style={{ width: layout.chatWidth }}
      >
        <ChatPanel />
      </aside>
    </div>
  );
}
