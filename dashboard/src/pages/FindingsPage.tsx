import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { explainFinding } from "@tokenforge/risk-core";
import {
  ACTION_LABELS,
  SCAN_LAYER_LABELS,
  SCAN_LAYER_LEADS,
  SOURCE_LABELS,
  formatPercent,
  formatTokens,
  listFindings,
  tokensByFileClass,
  truncateText,
  type FindingRow,
} from "../domain";
import { useLayerView } from "../state/useLayerView";
import { ChartCard } from "../ui/ChartCard";
import { ClassChart } from "../ui/ClassChart";
import { DataTable } from "../ui/DataTable";
import { FindingDetailDrawer } from "../ui/FindingDetailDrawer";
import { Page } from "../ui/Page";

export function FindingsPage() {
  const { reports, boardLayer } = useLayerView();
  const includeKept = boardLayer !== "heuristic";
  const findings = listFindings(reports, { includeKept });
  const classes = tokensByFileClass(reports);
  const [selected, setSelected] = useState<FindingRow | null>(null);
  const keptVisible =
    boardLayer !== "heuristic" && findings.some((row) => row.action === "kept");

  return (
    <Page
      title={`Findings · ${SCAN_LAYER_LABELS[boardLayer]}`}
      lead={
        <>
          {SCAN_LAYER_LEADS[boardLayer]} Click a row for the explanation and copy-only
          advice. TokenForge does not apply suggestions.
        </>
      }
    >
      <ChartCard title="By filetype class" subheader="Hover a bar for token counts (kept rows omitted)">
        <ClassChart buckets={classes} />
      </ChartCard>

      {keptVisible ? (
        <Alert severity="info" variant="outlined">
          Review rows are shown here and labeled as not counted in saved tokens.
        </Alert>
      ) : null}

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          By path
        </Typography>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell>Path</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Detail</TableCell>
              <TableCell align="right">Confidence</TableCell>
              <TableCell align="right">Tokens</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {findings.map((row) => {
              const explained = explainFinding(row);
              const preview = explained.detail ?? explained.explanation;
              return (
                <TableRow
                  key={`${row.team}:${row.path}:${row.source ?? "heuristic"}`}
                  hover
                  selected={
                    selected?.team === row.team &&
                    selected.path === row.path &&
                    selected.source === row.source
                  }
                  onClick={() => setSelected(row)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell sx={{ wordBreak: "break-all" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      {row.path}
                      {row.action === "kept" ? (
                        <Chip size="small" color="warning" label={ACTION_LABELS.kept} />
                      ) : null}
                    </Box>
                  </TableCell>
                  <TableCell>{row.team}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={SOURCE_LABELS[row.source ?? "heuristic"]}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{row.reason}</TableCell>
                  <TableCell sx={{ maxWidth: 280, color: "text.secondary" }}>
                    {truncateText(preview)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {row.confidence !== undefined
                      ? formatPercent(row.confidence * 100)
                      : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatTokens(row.estTokens)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      </Box>

      <FindingDetailDrawer finding={selected} onClose={() => setSelected(null)} />
    </Page>
  );
}
