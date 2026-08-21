import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  explainFinding,
  type TokenRiskFinding,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { useState } from "react";
import {
  ACTION_LABELS,
  SOURCE_LABELS,
  formatPercent,
  formatTokens,
  getLlmAnalysisOverview,
  tokenSavedPercent,
  truncateText,
} from "../domain";
import { FindingDetailDrawer } from "./FindingDetailDrawer";
import { LlmAnalysisOverviewCard } from "./LlmAnalysisOverviewCard";

export function TeamDetailDialog({
  report,
  onClose,
}: {
  report: TokenRiskReport | null;
  onClose: () => void;
}) {
  const [finding, setFinding] = useState<(TokenRiskFinding & { team: string; repo: string }) | null>(
    null,
  );

  const handleClose = () => {
    setFinding(null);
    onClose();
  };

  return (
    <>
      <Dialog open={Boolean(report)} onClose={handleClose} fullWidth maxWidth="md">
        {report ? (
          <>
            <DialogTitle>
              {report.team}
              <Typography variant="body2" color="text.secondary">
                {report.repo}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: "wrap" }}>
                <Stat label="Before" value={formatTokens(report.totals.beforeTokens)} />
                <Stat label="After" value={formatTokens(report.totals.afterTokens)} />
                <Stat label="Saved" value={formatTokens(report.totals.savedTokens)} />
                <Stat label="Scan" value={formatPercent(tokenSavedPercent(report.totals))} />
              </Stack>
              {(() => {
                const overview = getLlmAnalysisOverview(report);
                return overview ? (
                  <LlmAnalysisOverviewCard overview={overview} />
                ) : null;
              })()}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Path</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Detail</TableCell>
                    <TableCell align="right">Tokens</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.findings.map((row) => {
                    const explained = explainFinding(row);
                    return (
                    <TableRow
                      key={`${row.path}:${row.source ?? "heuristic"}`}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        setFinding({ ...row, team: report.team, repo: report.repo })
                      }
                    >
                      <TableCell sx={{ wordBreak: "break-all" }}>
                        {row.path}
                        {row.action === "kept" ? (
                          <Chip
                            size="small"
                            color="warning"
                            label={ACTION_LABELS.kept}
                            sx={{ ml: 1 }}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={SOURCE_LABELS[row.source ?? "heuristic"]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell sx={{ color: "text.secondary", maxWidth: 220 }}>
                        {truncateText(explained.detail ?? explained.explanation, 72)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatTokens(row.estTokens)}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
      <FindingDetailDrawer finding={finding} onClose={() => setFinding(null)} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Stack>
  );
}
