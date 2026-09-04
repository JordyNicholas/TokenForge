import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** Labeled content group for Overview priority layout (Uxcel section containers). */
export function OverviewSection({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {lead ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, maxWidth: 52 * 16 }}>
            {lead}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}
