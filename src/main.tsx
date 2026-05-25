import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("A new version of FSA is available. Update now?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("[FSA PWA] App ready to work offline");
  },
});

// Expose to the platform-update worker so it can force-reload PWAs
// when a new platform update is broadcast.
(window as any).__fsaUpdateSW = updateSW;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
