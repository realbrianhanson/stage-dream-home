import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportClientError } from "./lib/errorReporter";

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    const message =
      (reason && (reason.message || (typeof reason === "string" ? reason : null))) ||
      "Unhandled promise rejection";
    const stack = reason && reason.stack ? String(reason.stack) : null;
    void reportClientError({ message, stack });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
