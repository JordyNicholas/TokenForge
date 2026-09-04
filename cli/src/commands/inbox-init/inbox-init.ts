import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ROSTER_FILE, sampleRosterStub } from "../../io/roster";

const INBOX_README = `# TokenForge inbox

Drop per-team Prove artifacts here for EM / director rollup.

## Layout

\`\`\`
inbox/
  {team}/
    {repo}/
      .tokenforge/
        last-scan.json          # or scan-report.json
        session-stats.json
        prove-change-latest.json
        discover-latest.json
\`\`\`

## Workflow

1. Set \`tokenforge.team\` in each repo (not \`local\` or \`default\`).
2. Extension: **Export to inbox** — or CLI scan with \`TOKENFORGE_INBOX\` / \`.tokenforge/inbox-path.txt\`.
3. \`tokenforge inbox-validate .\` — compare folders vs \`tokenforge-roster.json\`.
4. \`tokenforge prove-pack .\` → \`org-prove-pack.json\`
5. \`tokenforge stage-dashboard .\` — boot dashboard with \`?pack=/org-prove-pack.json\`

Roster file (\`tokenforge-roster.json\`) at this root lists expected teams for coverage checks.
`;

export type InboxInitOptions = {
  root: string;
  withRoster?: boolean;
  businessUnit?: string;
};

export type InboxInitResult = {
  root: string;
  readmePath: string;
  rosterPath?: string;
};

/** Create inbox/README.md and optional sample \`tokenforge-roster.json\`. */
export async function initInbox(options: InboxInitOptions): Promise<InboxInitResult> {
  const root = resolve(options.root);
  const inboxDir = join(root, "inbox");
  await mkdir(inboxDir, { recursive: true });
  const readmePath = join(inboxDir, "README.md");
  await writeFile(readmePath, INBOX_README, "utf8");

  let rosterPath: string | undefined;
  if (options.withRoster) {
    rosterPath = join(root, ROSTER_FILE);
    const stub = sampleRosterStub(options.businessUnit);
    await writeFile(rosterPath, `${JSON.stringify(stub, null, 2)}\n`, "utf8");
  }

  return { root, readmePath, rosterPath };
}
