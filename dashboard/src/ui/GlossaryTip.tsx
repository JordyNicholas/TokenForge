import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function GlossaryTip({
  term,
  definition,
  children,
}: {
  term: string;
  definition: string;
  children?: ReactNode;
}) {
  return (
    <Tooltip title={definition} arrow enterTouchDelay={0}>
      <Stack
        component="span"
        direction="row"
        spacing={0.5}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          cursor: "help",
          verticalAlign: "baseline",
        }}
      >
        {children ?? (
          <Typography component="span" variant="inherit" sx={{ borderBottom: "1px dotted" }}>
            {term}
          </Typography>
        )}
        <InfoOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
      </Stack>
    </Tooltip>
  );
}
