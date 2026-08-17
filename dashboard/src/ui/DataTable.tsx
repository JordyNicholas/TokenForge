import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import type { ReactNode } from "react";

export function DataTable({
  children,
  size = "medium",
}: {
  children: ReactNode;
  size?: "small" | "medium";
}) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4 }}>
      <Table size={size}>{children}</Table>
    </TableContainer>
  );
}
