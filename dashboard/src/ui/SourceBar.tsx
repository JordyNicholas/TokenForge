import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useDashboard } from "../state/DashboardProvider";

function shortSource(label: string): string {
  const parts = label.split(/[\\/]/);
  return parts[parts.length - 1] || label;
}

export function SourceBar() {
  const { sourceLabel, loadError, loadFromFile, loadFromUrl, resetToDemo } =
    useDashboard();
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSnackOpen(Boolean(loadError));
  }, [loadError]);

  async function onSubmitUrl(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return;
    }
    await loadFromUrl(trimmed);
    setUrlOpen(false);
  }

  return (
    <>
      <Tooltip title={sourceLabel}>
        <Chip
          size="small"
          variant="outlined"
          label={shortSource(sourceLabel)}
          sx={{ maxWidth: { xs: 96, sm: 180 }, display: { xs: "none", sm: "inline-flex" } }}
        />
      </Tooltip>
      <Tooltip title="Data source">
        <IconButton
          color="inherit"
          aria-label="Data source"
          onClick={(event: MouseEvent<HTMLElement>) => setMenuEl(event.currentTarget)}
        >
          <MoreVert />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            fileRef.current?.click();
          }}
        >
          <FolderOpenOutlined fontSize="small" sx={{ mr: 1 }} />
          Load JSON file
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            setUrlOpen(true);
          }}
        >
          Load from URL
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            void resetToDemo();
          }}
        >
          Reset to demo seed
        </MenuItem>
      </Menu>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadFromFile(file);
          }
          event.target.value = "";
        }}
      />
      <Dialog open={urlOpen} onClose={() => setUrlOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={onSubmitUrl}>
          <DialogTitle>Load scan report</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              type="url"
              label="URL"
              placeholder="https://…/scan-report.json"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUrlOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Load
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        open={Boolean(loadError) && snackOpen}
        onClose={() => setSnackOpen(false)}
        autoHideDuration={8000}
        message={loadError}
      />
    </>
  );
}
