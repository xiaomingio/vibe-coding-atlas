/**
 * 文件说明: 挂载 Vibe Coding Atlas 静态 React 页面并载入项目快照。
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProjectExplorer } from "./components/ProjectExplorer";
import snapshotData from "./data/projects.json";
import type { ProjectSnapshot } from "./lib/projects";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProjectExplorer snapshot={snapshotData as ProjectSnapshot} />
  </StrictMode>,
);
