import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import {
  GLOSSARY_TERMS,
  boardScopeBase,
  glossaryHash,
  type GlossaryTermId,
} from "../domain";
import { useLayerView } from "../state/useLayerView";
import { Page } from "../ui/Page";

const RELATED_LABEL: Record<string, string> = {
  variance: "Open Variance",
  assumptions: "Open Assumptions",
  findings: "Open Findings",
  heatmap: "Open Heatmap",
};

export function GlossaryPage() {
  const { boardLayer, teamId } = useLayerView();
  const base = boardScopeBase(boardLayer, teamId);

  return (
    <Page
      title="Glossary"
      lead="Hover dotted terms on the board for short definitions. This page holds the full Prove vocabulary."
    >
      <Stack spacing={3}>
        {GLOSSARY_TERMS.map((term) => (
          <Stack
            key={term.id}
            id={glossaryHash(term.id as GlossaryTermId)}
            spacing={0.75}
            component="section"
            sx={{ scrollMarginTop: 96 }}
          >
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {term.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {term.long}
            </Typography>
            {term.relatedView ? (
              <Typography variant="body2">
                <Link
                  component={RouterLink}
                  to={`${base}/${term.relatedView}`}
                  underline="hover"
                >
                  {RELATED_LABEL[term.relatedView] ?? term.relatedView}
                </Link>
              </Typography>
            ) : null}
          </Stack>
        ))}
      </Stack>
    </Page>
  );
}
