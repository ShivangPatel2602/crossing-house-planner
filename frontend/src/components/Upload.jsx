import { useRef, useState } from "react";

export default function Upload({ onFile, onExample, busy, error }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const drop = (e) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <button
        type="button"
        className={`dropzone ${over ? "dropzone-over" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        disabled={busy}
      >
        <span className="dropzone-icon" aria-hidden="true">📄</span>
        <span className="dropzone-title">{busy ? "Reading spreadsheet…" : "Drop your spreadsheet here"}</span>
        <span className="dropzone-sub">or click to choose an Excel file (.xlsx)</span>
      </button>
      <input
        ref={input} type="file" accept=".xlsx,.xlsm" hidden
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ""; }}
      />
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <p className="hint">
        No spreadsheet handy? <button type="button" className="link" onClick={onExample} disabled={busy}>
          Try the example data</button>
      </p>
      <details className="hint">
        <summary>What should the spreadsheet look like?</summary>
        <p>Two sheets:</p>
        <ul>
          <li><b>DesiredCrosses</b>: columns <i>Male</i>, <i>Female</i>, <i>Priority</i> (1 = high, 3 = low)</li>
          <li><b>ParentInventory</b>: columns <i>Parent</i>, <i>Sex</i> (1 = male, 2 = female), <i>NumberAvailable</i> (flowers today)</li>
        </ul>
        <p>If the file uses formulas, open it in Excel and save it once so the values are stored.</p>
      </details>
    </div>
  );
}
