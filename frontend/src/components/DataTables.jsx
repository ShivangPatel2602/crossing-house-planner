import Stepper from "./Stepper.jsx";

export const PRIORITY_LABEL = { 1: "High", 2: "Medium", 3: "Low" };

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? `on ${o.className || ""}` : ""}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ParentSelect({ value, names, onChange, label }) {
  const missing = value && !names.includes(value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className={missing || !value ? "invalid" : ""}>
      {!value && <option value="">Choose…</option>}
      {missing && <option value={value}>{value} (not in flower list)</option>}
      {names.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

const PRIORITIES = [1, 2, 3].map((p) => ({ value: p, label: `${p} · ${PRIORITY_LABEL[p]}`, className: `p${p}` }));

export function CrossTable({ crosses, parents, onChange }) {
  const males = parents.filter((p) => p.sex === "male" && p.parent).map((p) => p.parent);
  const females = parents.filter((p) => p.sex === "female" && p.parent).map((p) => p.parent);
  const update = (id, patch) => onChange(crosses.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="table-block">
      <h3>Planned crosses <span className="count">{crosses.length}</span></h3>
      <table className="edit-table">
        <thead>
          <tr><th>Male</th><th aria-hidden="true"></th><th>Female</th><th>Priority</th><th><span className="sr">Remove</span></th></tr>
        </thead>
        <tbody>
          {crosses.map((c) => (
            <tr key={c.id}>
              <td><ParentSelect value={c.male} names={males} label="Male parent"
                onChange={(male) => update(c.id, { male })} /></td>
              <td className="times" aria-hidden="true">×</td>
              <td><ParentSelect value={c.female} names={females} label="Female parent"
                onChange={(female) => update(c.id, { female })} /></td>
              <td><Segmented options={PRIORITIES} value={c.priority} label="Priority"
                onChange={(priority) => update(c.id, { priority })} /></td>
              <td><button type="button" className="remove" aria-label={`Remove cross ${c.male} × ${c.female}`}
                onClick={() => onChange(crosses.filter((x) => x.id !== c.id))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="add"
        onClick={() => onChange([...crosses, { id: crypto.randomUUID(), male: "", female: "", priority: 2 }])}>
        + Add a cross
      </button>
    </div>
  );
}

const SEXES = [{ value: "male", label: "Male" }, { value: "female", label: "Female" }];

export function ParentTable({ parents, onChange }) {
  const update = (id, patch) => onChange(parents.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const dupes = new Set(parents.map((p) => p.parent).filter((n, i, all) => n && all.indexOf(n) !== i));

  return (
    <div className="table-block">
      <h3>Flowers available today <span className="count">{parents.length}</span></h3>
      <table className="edit-table">
        <thead>
          <tr><th>Parent</th><th>Role</th><th>Flowers</th><th><span className="sr">Remove</span></th></tr>
        </thead>
        <tbody>
          {parents.map((p) => (
            <tr key={p.id} className={p.available === 0 ? "muted" : ""}>
              <td><input className={`name ${!p.parent || dupes.has(p.parent) ? "invalid" : ""}`}
                value={p.parent} placeholder="Name" aria-label="Parent name"
                title={dupes.has(p.parent) ? "This name is listed more than once" : undefined}
                onChange={(e) => update(p.id, { parent: e.target.value })} /></td>
              <td><Segmented options={SEXES} value={p.sex} label="Role"
                onChange={(sex) => update(p.id, { sex })} /></td>
              <td><Stepper value={p.available} label={`flowers on ${p.parent}`}
                onChange={(available) => update(p.id, { available })} /></td>
              <td><button type="button" className="remove" aria-label={`Remove parent ${p.parent}`}
                onClick={() => onChange(parents.filter((x) => x.id !== p.id))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="add"
        onClick={() => onChange([...parents, { id: crypto.randomUUID(), parent: "", sex: "female", available: 0 }])}>
        + Add a parent
      </button>
    </div>
  );
}
