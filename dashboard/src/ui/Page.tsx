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
        <Typography variant="h4" component="h1" gutterBottom>
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
