import CompareArrowsOutlined from "@mui/icons-material/CompareArrowsOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { errorMessage } from "../domain";
import { useDashboard } from "../state/DashboardProvider";

function shortSource(label: string): string {
  const parts = label.split(/[\\/]/);
  return parts[parts.length - 1] || label;
}

export function SourceBar() {
  const {
    sourceLabel,
    loadError,
    loadFromFile,
    loadFromUrl,
    resetToDemo,
    afterFixLabel,
    loadAfterFixFile,
    clearAfterFix,
  } = useDashboard();
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const afterFixRef = useRef<HTMLInputElement>(null);

  const snackMessage = loadError ?? localError;

  useEffect(() => {
    setSnackOpen(Boolean(loadError));
  }, [loadError]);

  useEffect(() => {
    if (localError) {
      setSnackOpen(true);
    }
  }, [localError]);

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
      {afterFixLabel ? (
        <Tooltip title={`After-Fix compare: ${afterFixLabel}`}>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`vs ${shortSource(afterFixLabel)}`}
            onDelete={clearAfterFix}
            sx={{ maxWidth: 140, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
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
        <MenuItem disabled>
          <Typography variant="overline">Load Detect output</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            fileRef.current?.click();
          }}
        >
          <ListItemIcon>
            <FolderOpenOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load JSON file"
            secondary="CLI .tokenforge/scan-report.json or extension last-scan.json"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            setUrlOpen(true);
          }}
        >
          <ListItemText
            primary="Load from URL"
            secondary="Same-origin /last-scan.json or https://"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            void resetToDemo();
          }}
        >
          <ListItemText primary="Reset to demo seed" secondary="Retail Banking BU sample" />
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <Typography variant="overline">Prove after Fix</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            afterFixRef.current?.click();
          }}
        >
          <ListItemIcon>
            <CompareArrowsOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load after-Fix report…"
            secondary="Compare a second scan JSON (local snapshot)"
          />
        </MenuItem>
        {afterFixLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearAfterFix();
            }}
          >
            Clear after-Fix compare
          </MenuItem>
        ) : null}
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
      <input
        ref={afterFixRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadAfterFixFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <Dialog open={urlOpen} onClose={() => setUrlOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={onSubmitUrl}>
          <DialogTitle>Load scan report</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Prefer CLI <code>.tokenforge/scan-report.json</code> or extension{" "}
              <code>.tokenforge/last-scan.json</code> (often staged as{" "}
              <code>/last-scan.json</code> for <code>?src=</code>).
            </Typography>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              type="url"
              label="URL"
              placeholder="https://…/scan-report.json or /last-scan.json"
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
        open={Boolean(snackMessage) && snackOpen}
        onClose={() => {
          setSnackOpen(false);
          setLocalError(null);
        }}
        autoHideDuration={8000}
        message={snackMessage}
      />
    </>
  );
}
