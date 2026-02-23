import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { isTauri } from "./lib/platform";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
    </div>
  );
}

// Lazy-load web routing so Tauri never bundles react-router-dom
const WebRouter = lazy(() => import("./WebRouter"));

function Root() {
  if (isTauri) {
    return <App />;
  }
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WebRouter />
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
);
