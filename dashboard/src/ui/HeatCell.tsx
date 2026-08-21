import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import { formatPercent, formatTokens, displayPath } from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { heatFill, heatOnFill, resolveColorMode } from "../theme/heat";

export function HeatCell({
  team,
  repo,
  percent,
  savedTokens,
  selected,
  onSelect,
}: {
  team: string;
  repo: string;
  percent: number;
  savedTokens: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { mode, systemMode } = useColorScheme();
  const { redactPaths } = useDashboard();
  const resolved = resolveColorMode(mode, systemMode);
  const color = heatOnFill(resolved);

  return (
    <Card
      sx={{
        background: heatFill(percent, resolved),
        color,
        height: "100%",
        outline: selected ? "2px solid" : "none",
        outlineColor: "primary.main",
        outlineOffset: 2,
      }}
    >
      <CardActionArea onClick={onSelect} disabled={!onSelect} sx={{ height: "100%" }}>
        <CardContent sx={{ minHeight: 9 * 16 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {team}
          </Typography>
          <Typography variant="h4" component="p" sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
            {formatPercent(percent)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.85 }}>
            {displayPath(repo, redactPaths)}
            <br />
            {formatTokens(savedTokens)} tokens avoided
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
