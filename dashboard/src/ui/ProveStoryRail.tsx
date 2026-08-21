import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import QueryStatsOutlined from "@mui/icons-material/QueryStatsOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const STEPS = [
  {
    label: "Detect",
    body: "Scan IDE tabs and repo paths for high-cost, low-value context.",
    icon: VisibilityOutlined,
  },
  {
    label: "Fix",
    body: "Apply a provider policy pack (exclusions + lean instructions).",
    icon: AutoFixHighOutlined,
  },
  {
    label: "Prove",
    body: "Show tokens avoided and $ under editable assumptions.",
    icon: QueryStatsOutlined,
  },
] as const;

export function ProveStoryRail() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
        gap: 1.5,
        mb: 0.5,
      }}
      aria-label="Detect Fix Prove loop"
    >
      {STEPS.map((step, index) => (
        <Stack
          key={step.label}
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: "flex-start",
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              flexShrink: 0,
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {index + 1}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.25 }}>
              <step.icon fontSize="small" color="primary" />
              <Typography variant="subtitle2">{step.label}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {step.body}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
}
