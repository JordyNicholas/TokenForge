import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import CompareArrowsOutlined from "@mui/icons-material/CompareArrowsOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ManageSearchOutlined from "@mui/icons-material/ManageSearchOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import TimelineOutlined from "@mui/icons-material/TimelineOutlined";
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
    loadFromFiles,
    loadFromUrl,
    resetToDemo,
    afterFixLabel,
    loadAfterFixFile,
    clearAfterFix,
    usageLabel,
    loadUsageFromFile,
    resetUsageToDemo,
    clearUsage,
    afterUsageLabel,
    loadAfterUsageFromFile,
    clearAfterUsage,
    changeMarkersLabel,
    loadChangeMarkersFromFile,
    loadDemoChangeMarkers,
    clearChangeMarkers,
    sessionStatsLabel,
    loadSessionStatsFromFile,
    clearSessionStats,
    discoverLatestLabel,
    loadDiscoverLatestFromFile,
    clearDiscoverLatest,
    provePackLabel,
    loadProvePackFromFile,
    clearProvePack,
    usageTeamMapLabel,
    loadUsageTeamMapFromFile,
    clearUsageTeamMap,
    hasStoredProveSession,
    restoreLastProveSession,
    periodBindUnbound,
    dismissPeriodBindUnbound,
    usagePeriodsAutoCorrected,
    dismissUsagePeriodAutoCorrected,
  } = useDashboard();
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [bindSnackOpen, setBindSnackOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const afterFixRef = useRef<HTMLInputElement>(null);
  const usageRef = useRef<HTMLInputElement>(null);
  const afterUsageRef = useRef<HTMLInputElement>(null);
  const markersRef = useRef<HTMLInputElement>(null);
  const sessionStatsRef = useRef<HTMLInputElement>(null);
  const discoverRef = useRef<HTMLInputElement>(null);
  const provePackRef = useRef<HTMLInputElement>(null);
  const usageTeamMapRef = useRef<HTMLInputElement>(null);

  const snackMessage = loadError ?? localError;

  useEffect(() => {
    setSnackOpen(Boolean(loadError));
  }, [loadError]);

  useEffect(() => {
    if (localError) {
      setSnackOpen(true);
    }
  }, [localError]);

  useEffect(() => {
    if (periodBindUnbound || usagePeriodsAutoCorrected) {
      setBindSnackOpen(true);
    }
  }, [periodBindUnbound, usagePeriodsAutoCorrected]);

  useEffect(() => {
    const open = () => {
      setMenuEl(document.getElementById("tokenforge-source-trigger"));
    };
    window.addEventListener("tokenforge:open-source", open);
    return () => window.removeEventListener("tokenforge:open-source", open);
  }, []);

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
      {usageLabel ? (
        <Tooltip title={`Baseline billed usage: ${usageLabel}`}>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={shortSource(usageLabel)}
            onDelete={clearUsage}
            sx={{ maxWidth: 140, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      {afterUsageLabel ? (
        <Tooltip title={`After-period billed usage: ${afterUsageLabel}`}>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`after ${shortSource(afterUsageLabel)}`}
            onDelete={clearAfterUsage}
            sx={{ maxWidth: 160, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      {changeMarkersLabel ? (
        <Tooltip title={`Fix change markers: ${changeMarkersLabel}`}>
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`markers ${shortSource(changeMarkersLabel)}`}
            onDelete={clearChangeMarkers}
            sx={{ maxWidth: 160, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      {sessionStatsLabel ? (
        <Tooltip title={`Session hygiene: ${sessionStatsLabel}`}>
          <Chip
            size="small"
            color="secondary"
            variant="outlined"
            label={`session ${shortSource(sessionStatsLabel)}`}
            onDelete={clearSessionStats}
            sx={{ maxWidth: 160, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      {discoverLatestLabel ? (
        <Tooltip title={`Discover: ${discoverLatestLabel}`}>
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`discover ${shortSource(discoverLatestLabel)}`}
            onDelete={clearDiscoverLatest}
            sx={{ maxWidth: 160, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      {provePackLabel ? (
        <Tooltip title={`Prove pack: ${provePackLabel}`}>
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={`pack ${shortSource(provePackLabel)}`}
            onDelete={clearProvePack}
            sx={{ maxWidth: 160, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      {usageTeamMapLabel ? (
        <Tooltip title={`Usage team map: ${usageTeamMapLabel}`}>
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={`map ${shortSource(usageTeamMapLabel)}`}
            onDelete={clearUsageTeamMap}
            sx={{ maxWidth: 160, display: { xs: "none", md: "inline-flex" } }}
          />
        </Tooltip>
      ) : null}
      <Tooltip title="Data source">
        <IconButton
          id="tokenforge-source-trigger"
          color="inherit"
          aria-label="Data source"
          onClick={(event: MouseEvent<HTMLElement>) => setMenuEl(event.currentTarget)}
        >
          <MoreVert />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
        <MenuItem disabled>
          <Typography variant="overline">Detect package</Typography>
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
            filesRef.current?.click();
          }}
        >
          <ListItemIcon>
            <GroupsOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load team rollup (multi JSON)…"
            secondary="Merge several last-scan / scan-report files into one BU"
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
          <Typography variant="overline">Prove package</Typography>
        </MenuItem>
        {hasStoredProveSession ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              restoreLastProveSession();
            }}
          >
            <ListItemIcon>
              <HistoryOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Restore last Prove session"
              secondary="Reload seed, markers, session, discover from browser storage"
            />
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            provePackRef.current?.click();
          }}
        >
          <ListItemIcon>
            <Inventory2Outlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load Prove package…"
            secondary="org-prove-pack.json — seed, markers, session, discover"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            usageTeamMapRef.current?.click();
          }}
        >
          <ListItemIcon>
            <MapOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load usage team map…"
            secondary="Vendor FinOps labels → TF team ids for bill reconcile"
          />
        </MenuItem>
        {usageTeamMapLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearUsageTeamMap();
            }}
          >
            Clear usage team map
          </MenuItem>
        ) : null}
        {provePackLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearProvePack();
            }}
          >
            Clear prove pack extras
          </MenuItem>
        ) : null}
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
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            usageRef.current?.click();
          }}
        >
          <ListItemIcon>
            <ReceiptLongOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Import baseline usage CSV/JSON…"
            secondary="FinOps export → bill reconcile (not live billing)"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            afterUsageRef.current?.click();
          }}
        >
          <ListItemIcon>
            <ReceiptLongOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Import after-period usage…"
            secondary="Second bill window for variance (#86)"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            void resetUsageToDemo();
          }}
        >
          <ListItemText
            primary="Reset to demo usage"
            secondary="Keep the current scan; restore demo billed credits"
          />
        </MenuItem>
        {usageLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearUsage();
            }}
          >
            Clear baseline usage
          </MenuItem>
        ) : null}
        {afterUsageLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearAfterUsage();
            }}
          >
            Clear after-period usage
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            markersRef.current?.click();
          }}
        >
          <ListItemIcon>
            <TimelineOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load Fix change markers…"
            secondary="Cohort Fix-on vs control tags (#96)"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            void loadDemoChangeMarkers().catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }}
        >
          <ListItemText
            primary="Load demo Fix markers"
            secondary="sample-change-markers.json (checkout + payments-platform)"
          />
        </MenuItem>
        {changeMarkersLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearChangeMarkers();
            }}
          >
            Clear Fix change markers
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            sessionStatsRef.current?.click();
          }}
        >
          <ListItemIcon>
            <ShieldOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load session-stats.json…"
            secondary="Live hygiene tier — extension Filter/Shield estimate"
          />
        </MenuItem>
        {sessionStatsLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearSessionStats();
            }}
          >
            Clear session-stats
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuEl(null);
            discoverRef.current?.click();
          }}
        >
          <ListItemIcon>
            <ManageSearchOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Load discover-latest.json…"
            secondary="Missed savings — policy_gap / session_kept"
          />
        </MenuItem>
        {discoverLatestLabel ? (
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              clearDiscoverLatest();
            }}
          >
            Clear discover report
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
        ref={filesRef}
        type="file"
        hidden
        multiple
        accept="application/json,.json"
        onChange={(event) => {
          const list = event.target.files;
          if (list && list.length > 0) {
            void loadFromFiles([...list]);
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
      <input
        ref={usageRef}
        type="file"
        hidden
        accept="application/json,.json,text/csv,.csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadUsageFromFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <input
        ref={afterUsageRef}
        type="file"
        hidden
        accept="application/json,.json,text/csv,.csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadAfterUsageFromFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <input
        ref={markersRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadChangeMarkersFromFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <input
        ref={sessionStatsRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadSessionStatsFromFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <input
        ref={discoverRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadDiscoverLatestFromFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <input
        ref={provePackRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadProvePackFromFile(file).catch((error: unknown) => {
              setLocalError(errorMessage(error));
            });
          }
          event.target.value = "";
        }}
      />
      <input
        ref={usageTeamMapRef}
        type="file"
        hidden
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void loadUsageTeamMapFromFile(file).catch((error: unknown) => {
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
      <Snackbar
        open={bindSnackOpen && (periodBindUnbound || usagePeriodsAutoCorrected)}
        onClose={() => {
          setBindSnackOpen(false);
          dismissPeriodBindUnbound();
          dismissUsagePeriodAutoCorrected();
        }}
        autoHideDuration={9000}
        message={
          periodBindUnbound
            ? "Could not auto-bind baseline/after periods around Fix markers — pick periods on Variance."
            : "Baseline/after periods were reordered chronologically."
        }
      />
    </>
  );
}
