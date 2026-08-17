import Button from "@mui/material/Button";
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
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { formatPercent, formatTokens, tokenSavedPercent } from "../domain";

export function TeamDetailDialog({
  report,
  onClose,
}: {
  report: TokenRiskReport | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(report)} onClose={onClose} fullWidth maxWidth="sm">
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
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Path</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.findings.map((finding) => (
                  <TableRow key={finding.path}>
                    <TableCell sx={{ wordBreak: "break-all" }}>{finding.path}</TableCell>
                    <TableCell>{finding.reason}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatTokens(finding.estTokens)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
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
