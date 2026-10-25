import { useEffect, useRef, useState } from "react";
import { loadExample, planCrosses, uploadWorkbook } from "./api.js";
import Upload from "./components/Upload.jsx";
import { CrossTable, ParentTable } from "./components/DataTables.jsx";
import Settings, { DEFAULT_SETTINGS } from "./components/Settings.jsx";
import Results from "./components/Results.jsx";

const STORAGE_KEY = "crossing-planner-session-v1";

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

const withIds = (rows) => rows.map((r) => ({ id: crypto.randomUUID(), ...r }));

function Step({ n, title, children, done }) {
  return (
    <section className={`step ${done ? "step-done" : ""}`}>
      <h2><span className="step-n">{done ? "✓" : n}</span>{title}</h2>
      {children}
    </section>
  );
}

function DataSummary({ source, data }) {
  const { crosses, parents } = data;
  const byPriority = [1, 2, 3].map((p) => crosses.filter((c) => c.priority === p).length);
  const males = parents.filter((p) => p.sex === "male").length;
  const flowering = parents.filter((p) => p.available > 0);
  const stats = [
    ["Spreadsheet", source, null],
    ["Crosses", crosses.length, `${byPriority[0]} high · ${byPriority[1]} medium · ${byPriority[2]} low`],
    ["Parents", parents.length, `${males} male · ${parents.length - males} female`],
    ["Flowers today", flowering.reduce((n, p) => n + p.available, 0), `on ${flowering.length} parents`],
  ];
  return (
    <dl className="stats">
      {stats.map(([label, value, sub]) => (
        <div key={label} className="stat">
          <dt>{label}</dt>
          <dd className={typeof value === "number" ? "stat-num" : "stat-text"} title={String(value)}>{value}</dd>
          {sub && <dd className="stat-sub">{sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

export default function App() {
  const saved = useRef(loadSession()).current;
  const [data, setData] = useState(saved.data || null);
  const [source, setSource] = useState(saved.source || "");
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...saved.settings });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState("");
  const [planning, setPlanning] = useState(false);
  const latest = useRef(0);

  // Remember the session so a refresh doesn't lose edits.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, source, settings }));
    } catch { /* storage unavailable; nothing to do */ }
  }, [data, source, settings]);

  // Re-plan automatically (debounced) whenever the data or settings change.
  useEffect(() => {
    if (!data) return;
    const crosses = data.crosses.filter((c) => c.male && c.female)
      .map(({ male, female, priority }) => ({ male, female, priority }));
    const parents = data.parents.filter((p) => p.parent.trim())
      .map(({ parent, sex, available }) => ({ parent, sex, available }));
    const id = ++latest.current;
    setPlanning(true);
    const t = setTimeout(() => {
      planCrosses(crosses, parents, settings)
        .then((p) => { if (id === latest.current) { setPlan(p); setPlanError(""); } })
        .catch((e) => { if (id === latest.current) setPlanError(e.message); })
        .finally(() => { if (id === latest.current) setPlanning(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [data, settings]);

  const receive = (name) => (tables) => {
    setData({ crosses: withIds(tables.crosses), parents: withIds(tables.parents) });
    setSource(name);
    setPlan(null);
    setLoadError("");
  };

  const load = (promise, name) => {
    setLoading(true);
    promise.then(receive(name)).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
  };

  const startOver = () => {
    setData(null);
    setPlan(null);
    setPlanError("");
    setSource("");
  };

  return (
    <div className="page">
      <header className="masthead no-print">
        <h1>🌾 Crossing House Planner</h1>
        <p>Decide which crosses go into which rooms today.</p>
      </header>

      <div className="print-only print-title">
        <h1>Crossing plan, {new Date().toLocaleDateString()}</h1>
        {source && <p>From: {source}</p>}
      </div>

      <main>
        <div className="no-print">
          <Step n={1} title="Load your crosses and flowers" done={!!data}>
            {!data ? (
              <Upload busy={loading} error={loadError}
                onFile={(f) => load(uploadWorkbook(f), f.name)}
                onExample={() => load(loadExample(), "Example data")} />
            ) : (
              <>
                <div className="loaded">
                  <DataSummary source={source} data={data} />
                  <button type="button" className="link" onClick={startOver}>Load a different spreadsheet</button>
                </div>
                <details className="more">
                  <summary>Review or edit the crosses and flower counts</summary>
                  <div className="tables">
                    <CrossTable crosses={data.crosses} parents={data.parents}
                      onChange={(crosses) => setData({ ...data, crosses })} />
                    <ParentTable parents={data.parents}
                      onChange={(parents) => setData({ ...data, parents })} />
                  </div>
                </details>
              </>
            )}
          </Step>

          <Step n={2} title="Set up today's crossing house">
            <Settings settings={settings} onChange={setSettings} />
          </Step>
        </div>

        <Step n={3} title={<>Today's plan {planning && <span className="updating no-print">updating…</span>}</>}>
          {!data && <p className="placeholder">Load your data in step 1 and the plan will appear here.</p>}
          {data && planError && <p className="notice notice-error" role="alert">{planError}</p>}
          {data && !plan && !planError && <p className="placeholder">Working out the best plan…</p>}
          {data && plan && <div className={planning ? "stale" : ""}><Results plan={plan} /></div>}
        </Step>
      </main>
    </div>
  );
}
