import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { AuthProvider } from "@/app/providers/AuthContext";
import { PermissionProvider } from "@/app/providers/PermissionContext"; // Explicação: Traz o Provedor Soberano de Portaria para a raiz da RAM.
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log(
        "Nova versão disponível. O app será atualizado no próximo carregamento.",
      );
    },
    onOfflineReady() {
      console.log("App pronto para trabalhar offline!");
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </AuthProvider>
  </React.StrictMode>,
);
