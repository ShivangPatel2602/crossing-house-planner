// A number field with large − / + buttons, so counts can be changed without typing.
export default function Stepper({ value, onChange, min = 0, max = 999, label, size }) {
  const clamp = (n) => Math.min(max, Math.max(min, n));
  return (
    <div className={`stepper ${size === "large" ? "stepper-large" : ""}`}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min}
        aria-label={`Decrease ${label}`}>−</button>
      <input
        type="number" inputMode="numeric" value={value} min={min} max={max} aria-label={label}
        onChange={(e) => onChange(e.target.value === "" ? min : clamp(parseInt(e.target.value, 10) || 0))}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max}
        aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
