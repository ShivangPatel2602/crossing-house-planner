import { useState } from "react";
import { PRIORITY_LABEL } from "./DataTables.jsx";

// Distinct, colour-blind-friendly fills for female clones; each dot also shows its letter.
const FEMALE_COLORS = ["#e07a5f", "#81b29a", "#f2cc8f", "#c77dff", "#4cc9f0", "#f4a261", "#90be6d", "#ef476f"];

export function PriorityBadge({ p }) {
  return <span className={`pbadge p${p}`}>{PRIORITY_LABEL[p] || `P${p}`}</span>;
}

function Summary({ plan }) {
  const all = [...plan.made, ...plan.unmade];
  const byPriority = [1, 2, 3].map((p) => ({
    p,
    made: plan.made.filter((c) => c.priority === p).length,
    total: all.filter((c) => c.priority === p).length,
  })).filter((x) => x.total > 0);

  return (
    <div className="summary">
      <div className="summary-main">
        <span className="big">{plan.made.length}</span> of {plan.totalCrosses} crosses planned
        <span className="summary-sub">using {plan.rooms.length} of {plan.settings.rooms} rooms</span>
      </div>
      <div className="summary-breakdown">
        {byPriority.map(({ p, made, total }) => (
          <div key={p} className="breakdown-item">
            <PriorityBadge p={p} />
            <span>{made} of {total}</span>
            <div className="meter" aria-hidden="true"><div style={{ width: `${(100 * made) / total}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomCard({ index, room, capacity, priorityOf, colorOf }) {
  const slots = [];
  if (room) {
    for (let i = 0; i < room.maleStalks; i++) slots.push({ kind: "male", name: room.male });
    for (const f of room.females) {
      for (let i = 0; i < f.stalks; i++) slots.push({ kind: "female", name: f.female });
    }
  }
  while (slots.length < capacity) slots.push({ kind: "empty" });

  return (
    <article className={`room ${room ? "" : "room-free"}`}>
      <header>
        <h4>Room {index}</h4>
        <span className="room-fill">{room ? `${room.size} / ${capacity}` : "Free"}</span>
      </header>
      {capacity <= 24 && (
        <div className="slots" aria-hidden="true">
          {slots.map((s, i) => (
            <span key={i} className={`slot slot-${s.kind}`}
              style={s.kind === "female" ? { background: colorOf(s.name) } : undefined}>
              {s.kind === "empty" ? "" : s.name.slice(0, 3)}
            </span>
          ))}
        </div>
      )}
      {room ? (
        <>
          <p className="room-male">
            Male <b>{room.male}</b> · {room.maleStalks} stalk{room.maleStalks > 1 ? "s" : ""}
          </p>
          <ul className="room-crosses">
            {room.females.map((f) => (
              <li key={f.female}>
                <span className="swatch" style={{ background: colorOf(f.female) }} aria-hidden="true" />
                <span className="cross-text">
                  <span className="cross-name">{room.male} × {f.female}</span>
                  <span className="stalks">{f.stalks} stalk{f.stalks > 1 ? "s" : ""}</span>
                </span>
                <PriorityBadge p={priorityOf(room.male, f.female)} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="room-empty-text">Not needed today</p>
      )}
    </article>
  );
}

// Group the model's free-text reasons so a long list can be filtered by cause.
function reasonKind(reason) {
  if (reason.startsWith("No flowers")) return "No flowers on a parent";
  if (reason.includes("fewer than")) return "Too few female flowers";
  if (reason.includes("flowers went to")) return "Flowers used up";
  if (reason.includes("no free room")) return "No room left";
  return "Other crosses worth more";
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Unplanned({ crosses }) {
  const [priority, setPriority] = useState(0);
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");

  const kinds = [...new Set(crosses.map((c) => reasonKind(c.reason)))];
  const q = query.trim().toLowerCase();
  const shown = crosses.filter((c) =>
    (!priority || c.priority === priority)
    && (!kind || reasonKind(c.reason) === kind)
    && (!q || c.male.toLowerCase().includes(q) || c.female.toLowerCase().includes(q)));
  const countWhere = (fn) => crosses.filter(fn).length;

  return (
    <>
      <h3>Crosses not planned today <span className="count">{crosses.length}</span></h3>
      {crosses.length > 6 && (
        <div className="filters no-print">
          <div className="chips" role="group" aria-label="Filter by priority">
            <Chip on={!priority} onClick={() => setPriority(0)}>All {crosses.length}</Chip>
            {[1, 2, 3].map((p) => {
              const n = countWhere((c) => c.priority === p);
              return n > 0 && (
                <Chip key={p} on={priority === p} onClick={() => setPriority(priority === p ? 0 : p)}>
                  {PRIORITY_LABEL[p]} {n}
                </Chip>
              );
            })}
          </div>
          {kinds.length > 1 && (
            <div className="chips" role="group" aria-label="Filter by reason">
              {kinds.map((k) => (
                <Chip key={k} on={kind === k} onClick={() => setKind(kind === k ? "" : k)}>
                  {k} {countWhere((c) => reasonKind(c.reason) === k)}
                </Chip>
              ))}
            </div>
          )}
          <input type="search" className="search" placeholder="Find a parent…" aria-label="Find a parent"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}
      <div className="scroll-box">
        <table className="unplanned">
          <thead><tr><th>Cross</th><th>Priority</th><th>Why</th></tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={`${c.male}-${c.female}`}>
                <td className="cross-name">{c.male} × {c.female}</td>
                <td><PriorityBadge p={c.priority} /></td>
                <td>{c.reason}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={3} className="empty-row">No crosses match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {shown.length < crosses.length && (
        <p className="table-foot">
          Showing {shown.length} of {crosses.length}.{" "}
          <button type="button" className="link" onClick={() => { setPriority(0); setKind(""); setQuery(""); }}>
            Show all
          </button>
        </p>
      )}
    </>
  );
}

function FlowerUse({ flowers }) {
  const relevant = flowers.filter((f) => f.used > 0 || f.available > 0);
  const download = () => saveCsv([["Parent", "Used"], ...flowers.map((f) => [f.parent, f.used])], "flower-use");
  return (
    <>
      <div className="section-head flower-head">
        <h3>Flower use by parent <span className="count">{relevant.length}</span></h3>
        <button type="button" className="secondary no-print" onClick={download}>
          ⬇ Download parent use (CSV)</button>
      </div>
      <div className="scroll-box flower-box">
        <table className="flower-table">
          <thead><tr><th>Parent</th><th>Used</th><th>Left</th><th aria-hidden="true"></th></tr></thead>
          <tbody>
            {relevant.map((f) => (
              <tr key={f.parent}>
                <td>{f.parent}</td>
                <td>{f.used}</td>
                <td>{f.available - f.used}</td>
                <td className="bar-cell" aria-hidden="true">
                  <div className="meter"><div style={{ width: `${f.available ? (100 * f.used) / f.available : 0}%` }} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function saveCsv(rows, name) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), {
    href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPlan(plan, priorityOf) {
  const rows = [["Room", "Male", "Male stalks", "Female", "Female stalks", "Priority"]];
  plan.rooms.forEach((r, i) => r.females.forEach((f) =>
    rows.push([i + 1, r.male, r.maleStalks, f.female, f.stalks, priorityOf(r.male, f.female)])));
  saveCsv(rows, "crossing-plan");
}

export default function Results({ plan }) {
  const priorityOf = (m, f) => plan.made.find((c) => c.male === m && c.female === f)?.priority;
  const females = [...new Set(plan.rooms.flatMap((r) => r.females.map((f) => f.female)))].sort();
  const colorOf = (name) => FEMALE_COLORS[females.indexOf(name) % FEMALE_COLORS.length];
  const cap = plan.settings.capacity;

  return (
    <div className="results">
      <Summary plan={plan} />

      {plan.warnings.length > 0 && (
        <div className="notice notice-warn">
          <b>Please check your data</b>
          <ul>{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <div className="results-actions no-print">
        <button type="button" className="secondary" onClick={() => window.print()}>🖨 Print plan</button>
        <button type="button" className="secondary" onClick={() => downloadPlan(plan, priorityOf)}
          disabled={plan.rooms.length === 0}>⬇ Download as spreadsheet (CSV)</button>
      </div>

      <h3>Room plan</h3>
      {plan.settings.rooms === 0 ? (
        <p className="notice">There are no free rooms today, so nothing can be planned.</p>
      ) : (
        <div className="rooms">
          {Array.from({ length: plan.settings.rooms }, (_, i) => (
            <RoomCard key={i} index={i + 1} room={plan.rooms[i]} capacity={cap}
              priorityOf={priorityOf} colorOf={colorOf} />
          ))}
        </div>
      )}
      <p className="legend">
        <span className="slot slot-male">M</span> male stalk
        <span className="slot slot-female" style={{ background: FEMALE_COLORS[0] }}>F</span> female stalk
        <span className="slot slot-empty" /> empty space
      </p>

      {plan.unmade.length > 0 && <Unplanned crosses={plan.unmade} />}

      <FlowerUse flowers={plan.flowers} />
    </div>
  );
}
