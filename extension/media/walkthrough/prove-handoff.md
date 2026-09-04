# Export Prove handoff

Use **Send hygiene to dashboard** to copy a dashboard URL with `?session=/session-stats.json`.

TokenForge writes `.tokenforge/session-stats.json` next to `last-scan.json`. The dashboard **Live hygiene** tier loads session Filter/Shield estimates — not billed usage and not agent pipeline metering.

For same-origin boot, stage both files to `dashboard/public/` or run the local Vite dev server.
