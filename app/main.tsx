/**
 * 文件说明: 挂载 Vibe Coding Atlas 静态 React 页面入口。
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProjectDataGate } from "./components/ProjectDataGate";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProjectDataGate />
  </StrictMode>,
);
