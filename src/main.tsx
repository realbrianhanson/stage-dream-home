import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportClientError } from "./lib/errorReporter";

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    const message =
      (reason instanceof Error ? reason.message : typeof reason === "string" ? reason : null) ||
      "Unhandled promise rejection";
    const stack = reason instanceof Error && reason.stack ? reason.stack : null;
    void reportClientError({ message, stack });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
