import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import App from "./App";
import "./index.css";

// GitHub Pages 배포 시 서브디렉토리 경로를 base로 설정
// 예: https://leeseulbi53.github.io/am-materials-database/
const base = (import.meta.env.VITE_ROUTER_BASE as string) ?? "";

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    <App />
  </Router>
);
