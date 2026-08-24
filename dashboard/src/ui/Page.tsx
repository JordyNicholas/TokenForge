import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function Page({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            overflowWrap: "anywhere",
            fontSize: { xs: "1.5rem", sm: "2.125rem" },
            lineHeight: 1.25,
            pr: { xs: 0.5, sm: 0 },
          }}
        >
          {title}
        </Typography>
        {lead ? (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 52 * 16 }}>
            {lead}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}
