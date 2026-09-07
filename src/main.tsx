import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./app/App";
import { initializeFirebaseAnalytics } from "./app/lib/firebase";
import "./styles/index.css";

void initializeFirebaseAnalytics();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster richColors position="top-right" />
  </>,
);
