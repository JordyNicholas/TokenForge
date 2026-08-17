export function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max?: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) {
            onChange(next);
          }
        }}
      />
      <span className="field-hint">{hint}</span>
    </label>
  );
}
