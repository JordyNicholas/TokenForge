import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  boardScopeBase,
  glossaryHash,
  glossaryTerm,
  parseBoardLayerFromPath,
  parseTeamIdFromPath,
  type GlossaryTermId,
} from "../domain";

function GlossaryTooltipBody({
  short,
  glossaryPath,
}: {
  short: string;
  glossaryPath: string;
}) {
  return (
    <Box sx={{ maxWidth: 280 }}>
      <Typography variant="caption" component="p" sx={{ m: 0, mb: 0.75 }}>
        {short}
      </Typography>
      <Link
        component={RouterLink}
        to={glossaryPath}
        underline="hover"
        color="inherit"
        variant="caption"
        sx={{ fontWeight: 600 }}
      >
        Open Glossary
      </Link>
    </Box>
  );
}

/**
 * Hover definition for a Prove term. Prefer `termId` so short copy stays in the registry.
 * Pass `definition` only for one-off tips that are not glossary entries.
 */
export function GlossaryTip({
  term,
  definition,
  termId,
  children,
}: {
  term: string;
  definition?: string;
  termId?: GlossaryTermId;
  children?: ReactNode;
}) {
  const location = useLocation();
  const boardLayer = parseBoardLayerFromPath(location.pathname);
  const teamId = parseTeamIdFromPath(location.pathname);
  const base = boardScopeBase(boardLayer, teamId);

  const entry = termId ? glossaryTerm(termId) : null;
  const short = entry?.short ?? definition ?? "";
  const glossaryPath = entry
    ? `${base}/glossary#${glossaryHash(entry.id)}`
    : `${base}/glossary`;

  const title = short ? (
    <GlossaryTooltipBody short={short} glossaryPath={glossaryPath} />
  ) : (
    term
  );

  return (
    <Tooltip title={title} arrow enterTouchDelay={0} leaveDelay={200}>
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
