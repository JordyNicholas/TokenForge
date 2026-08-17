import { useState, type FormEvent } from "react";
import { useDashboard } from "./DashboardContext";

export function SourceBar() {
  const { sourceLabel, loadError, loadFromFile, loadFromUrl, resetToDemo } =
    useDashboard();
  const [url, setUrl] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return;
    }
    await loadFromUrl(trimmed);
  }

  return (
    <div className="source-bar">
      <p className="source-label">
        Source: <code>{sourceLabel}</code>
      </p>
      <div className="source-actions">
        <label className="source-file">
          Load JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void loadFromFile(file);
              }
              event.target.value = "";
            }}
          />
        </label>
        <form className="source-url" onSubmit={onSubmit}>
          <input
            type="url"
            placeholder="URL to scan-report.json"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit">Load URL</button>
        </form>
        <button type="button" onClick={() => void resetToDemo()}>
          Demo seed
        </button>
      </div>
      {loadError ? <p className="source-error">{loadError}</p> : null}
    </div>
  );
}
