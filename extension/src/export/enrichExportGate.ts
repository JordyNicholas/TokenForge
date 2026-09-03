/** True while Analyze rules holds the last-scan write path. */
let enrichExportBusy = false;

export function setEnrichExportBusy(busy: boolean): void {
  enrichExportBusy = busy;
}

export function isEnrichExportBusy(): boolean {
  return enrichExportBusy;
}
