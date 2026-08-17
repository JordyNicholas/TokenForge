import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import type { ReactNode } from "react";

export function ChartCard({
  title,
  subheader,
  action,
  children,
}: {
  title: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={action}
        slotProps={{
          title: { variant: "h6" },
          subheader: { variant: "body2" },
        }}
      />
      <CardContent sx={{ flex: 1, pt: 0 }}>{children}</CardContent>
    </Card>
  );
}
