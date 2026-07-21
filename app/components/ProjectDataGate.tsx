/**
 * 文件说明: 在浏览器运行时加载项目快照，并处理加载、失败和重试状态。
 */

import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProjectSnapshot } from "../lib/projects";
import { ProjectExplorer } from "./ProjectExplorer";

const dataUrl = "/data/projects.json";

type SnapshotState =
  | { status: "loading"; snapshot: null; error: null }
  | { status: "loaded"; snapshot: ProjectSnapshot; error: null }
  | { status: "failed"; snapshot: null; error: string };

function isProjectSnapshot(value: unknown): value is ProjectSnapshot {
  const snapshot = value as ProjectSnapshot;
  return Boolean(
    snapshot
      && typeof snapshot === "object"
      && snapshot.meta
      && Array.isArray(snapshot.projects)
      && typeof snapshot.meta.total === "number",
  );
}

export function ProjectDataGate() {
  const [state, setState] = useState<SnapshotState>({ status: "loading", snapshot: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch(dataUrl, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload: unknown = await response.json();
        if (!isProjectSnapshot(payload)) throw new Error("Invalid project snapshot");
        setState({ status: "loaded", snapshot: payload, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "failed",
          snapshot: null,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return () => controller.abort();
  }, [reloadKey]);

  function reloadData() {
    setState({ status: "loading", snapshot: null, error: null });
    setReloadKey((value) => value + 1);
  }

  if (state.status === "loaded") return <ProjectExplorer snapshot={state.snapshot} />;

  return (
    <main className="data-state-shell">
      <div className="data-state-card" role={state.status === "failed" ? "alert" : "status"} aria-live="polite">
        <span className="data-state-icon" aria-hidden="true">
          {state.status === "failed" ? <AlertCircle size={24} /> : <Database size={24} />}
        </span>
        <h1>Vibe Coding Atlas</h1>
        {state.status === "failed" ? (
          <>
            <p>项目数据暂时不可用。</p>
            <button type="button" onClick={reloadData}>
              <RefreshCw size={16} aria-hidden="true" />
              <span>重试</span>
            </button>
          </>
        ) : (
          <p>正在加载项目数据。</p>
        )}
      </div>
    </main>
  );
}
