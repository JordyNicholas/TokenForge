import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  const body = (
    <CardContent>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.8 }}>
        {label}
      </Typography>
      <Typography variant="h4" component="p" color="primary" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      ) : null}
    </CardContent>
  );

  return (
    <Card sx={{ height: "100%" }}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        },
      }}
    >
      {children}
    </Box>
  );
}
