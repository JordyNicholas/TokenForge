import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { formatTokens, tokensByFileClass, topOffenders } from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { ChartCard } from "../ui/ChartCard";
import { ClassChart } from "../ui/ClassChart";
import { DataTable } from "../ui/DataTable";
import { Page } from "../ui/Page";

export function OffendersPage() {
  const { reports } = useDashboard();
  const offenders = topOffenders(reports, 10);
  const classes = tokensByFileClass(reports);

  return (
    <Page
      title="Top offenders"
      lead="Highest-token paths marked excluded or filtered, plus waste by filetype class from risk-core."
    >
      <ChartCard title="By filetype class" subheader="Hover a bar for token counts">
        <ClassChart buckets={classes} />
      </ChartCard>

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          By path
        </Typography>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell>Path</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell align="right">Tokens</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {offenders.map((row) => (
              <TableRow key={`${row.team}:${row.path}`} hover>
                <TableCell sx={{ wordBreak: "break-all" }}>{row.path}</TableCell>
                <TableCell>{row.team}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.fileClass} variant="outlined" />
                </TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTokens(row.estTokens)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </Box>
    </Page>
  );
}
