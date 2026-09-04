import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** Labeled content group — title only; prefer GlossaryTip over long leads. */
export function OverviewSection({
  title,
  lead,
  titleAdornment,
  children,
}: {
  title: string;
  /** Prefer ≤80 characters; omit when GlossaryTip is enough. */
  lead?: string;
  titleAdornment?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {titleAdornment}
        </Stack>
        {lead ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.25, maxWidth: 52 * 16 }}
          >
            {lead}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}
