import Stepper from "./Stepper.jsx";

export const DEFAULT_SETTINGS = {
  rooms: 5,
  capacity: 8,
  ratio: 3,
  min_female_stalks: 1,
  weights: "strict",
  fill: true,
};

function Choice({ name, value, options, onChange }) {
  return (
    <div className="choices">
      {options.map((o) => (
        <label key={String(o.value)} className={`choice ${value === o.value ? "on" : ""}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>
            <b>{o.label}</b>
            <small>{o.help}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

function NumberSetting({ label, help, aria, ...stepper }) {
  return (
    <div className="setting-card">
      <div className="field-label">{label}</div>
      <div className="field-help">{help}</div>
      <Stepper {...stepper} label={aria} />
    </div>
  );
}

export default function Settings({ settings, onChange }) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  const changed = Object.keys(DEFAULT_SETTINGS).some(
    (k) => k !== "rooms" && settings[k] !== DEFAULT_SETTINGS[k]);

  return (
    <div>
      <div className="field-row">
        <div>
          <div className="field-label">Rooms free today</div>
          <div className="field-help">The plan updates as soon as you change this.</div>
        </div>
        <Stepper size="large" value={settings.rooms} onChange={set("rooms")} min={0} max={50} label="rooms free today" />
      </div>

      <details className="more">
        <summary>More settings {changed && <span className="badge">changed</span>}</summary>

        <div className="setting-grid">
          <NumberSetting label="Most clones in one room" help="Male and female stalks together."
            value={settings.capacity} onChange={set("capacity")} min={1} max={100} aria="clones per room" />
          <NumberSetting label="Female stalks per male stalk"
            help="At most this many females for every male stalk in a room."
            value={settings.ratio} onChange={set("ratio")} min={1} max={20} aria="females per male" />
          <NumberSetting label="Female stalks needed per cross"
            help="A cross only counts once it has this many female stalks."
            value={settings.min_female_stalks} onChange={set("min_female_stalks")} min={1} max={20}
            aria="female stalks per cross" />
        </div>

        <div className="choice-groups">
          <fieldset className="choice-group">
            <legend className="field-label">When priorities compete</legend>
            <Choice name="weights" value={settings.weights} onChange={set("weights")} options={[
              { value: "strict", label: "Higher priority always comes first",
                help: "One high-priority cross is never given up for any number of lower ones." },
              { value: "linear", label: "Balance priority and number of crosses",
                help: "Two medium crosses can win over one high cross (High = 3, Medium = 2, Low = 1 points)." },
            ]} />
          </fieldset>
          <fieldset className="choice-group">
            <legend className="field-label">Spare space in rooms</legend>
            <Choice name="fill" value={settings.fill} onChange={set("fill")} options={[
              { value: true, label: "Fill with extra stalks", help: "More pollinations and more seed today." },
              { value: false, label: "Leave it empty", help: "Use as few flowers as possible and keep the rest for later." },
            ]} />
          </fieldset>
        </div>

        {changed && (
          <button type="button" className="link reset"
            onClick={() => onChange({ ...DEFAULT_SETTINGS, rooms: settings.rooms })}>
            Reset to defaults
          </button>
        )}
      </details>
    </div>
  );
}
