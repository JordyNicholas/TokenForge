import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

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
  const sliderMax = max ?? Math.max(min + step, value * 2, 1);

  return (
    <FormControl fullWidth>
      <FormLabel sx={{ mb: 1, fontWeight: 600, color: "text.primary" }}>{label}</FormLabel>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Slider
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={sliderMax}
          step={step}
          onChange={(_event, next) => {
            if (typeof next === "number") {
              onChange(next);
            }
          }}
          valueLabelDisplay="auto"
          aria-label={label}
          sx={{ flex: 1 }}
        />
        <TextField
          type="number"
          size="small"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) {
              onChange(next);
            }
          }}
          slotProps={{
            htmlInput: { min, max, step },
          }}
          sx={{ width: 112 }}
        />
      </Stack>
      <FormHelperText sx={{ mx: 0, mt: 0.75 }}>{hint}</FormHelperText>
    </FormControl>
  );
}
