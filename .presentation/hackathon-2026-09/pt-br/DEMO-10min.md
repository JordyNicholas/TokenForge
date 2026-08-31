# Roteiro da demo — 10 minutos (1–2 set)

Roteiro situacional para a final do hackathon. Runbook de produto: [`docs/runbooks/DEMO_RUNBOOK.md`](../../../docs/runbooks/DEMO_RUNBOOK.md) (≤5 min).

Falas do apresentador: [`ROTEIRO_APRESENTADOR.md`](./ROTEIRO_APRESENTADOR.md). Papéis: [`EQUIPE.md`](./EQUIPE.md).

> **Honestidade:** o Context Guard **não** intercepta o pipeline do agente. A economia bruta do CLI em `noisy-app` é **~99,8%**; o pitch de **~30%** vem só das Assumptions do dashboard.

> **Três apresentadores:** mescle o papel **D no B** (veja [`EQUIPE.md`](./EQUIPE.md)). Use **duas abas no dashboard** — Aba 1 = Prove (`demo-seed` + variância); Aba 2 = boards hybrid (URL de backup ou JSON ao vivo após o scan).

## Setup pré-demo

1. `npm install` na raiz; opcional: `bash .presentation/hackathon-2026-09/prestage.sh`
2. Reset dos fixtures (seguro antes de cada ensaio):
   ```bash
   rm -rf fixtures/noisy-app/.tokenforge fixtures/noisy-app/.github/copilot-instructions.md \
     fixtures/noisy-app/.cursor/rules/tokenforge.mdc fixtures/noisy-app/.cursor/tokenforge-exclusion-candidates.yml
   rm -rf fixtures/instructions-app/.tokenforge
   ```
3. `npm run tokenforge:extension` → F5 Extension Development Host
4. Abrir abas com antecedência: `fixtures/noisy-app/package-lock.json`, `dist/bundle.js`, `config/app-settings.json`
5. `npm run tokenforge:dashboard`
6. **Aba 1 — Prove:** pré-carregar URL de variância:
   `http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`
7. **Aba 2 — Hybrid backup:**  
   `http://localhost:5173/?src=/demo-hybrid-cursor-report.json`
8. Atualizar backup hybrid (opcional): `prestage.sh --hybrid-live` → copia o relatório ao vivo para `dashboard/public/demo-hybrid-cursor-report.json`
9. `agent login && agent status --format json`

## Ordem da apresentação

| Horário | Responsável | Bloco |
| --- | --- | --- |
| **0:00–2:15** | **A** | Slides 1–6: problema, concorrência, diferenciação, comprador, loop central |
| **2:15–4:30** | **B** | Extension Detect → scan CLI → **apply ao vivo** (policy pack) |
| **4:30–6:45** | **C** | Dashboard Aba 1 → Assumptions ~30% → Variância (3 KPIs) |
| **6:45–8:15** | **B** | Hybrid: `cursor-cli:composer-2.5` em `instructions-app` → Dashboard Aba 2 (boards F6) |
| **8:30–9:30** | **A** | Slides: Honestidade → Arquitetura → Takeaway |
| **9:30–10:00** | Todos | Buffer; pedido de piloto |

Ocultar slides durante a demo ao vivo (2:15–8:30).

### Bloco B — Detect + Fix (ao vivo)

Extension → Filter no lockfile. Depois:

```bash
npm run tokenforge:scan -- --json
npm run tokenforge:apply -- --provider cursor
```

**Dizer:** o scan é a linha de base heurística; o apply grava o **policy pack Cursor** (`.cursor/rules/tokenforge.mdc` + candidatos de exclusão) — merge-section seguro, reversível no git.

**Se preferir não gravar na primeira vez:** use `--dry-run` primeiro e remova na ensaio #2. Reset dos fixtures entre runs (ver Setup pré-demo).

### Bloco C — Prove + variância (Aba 1)

1. KPIs do Overview + cards **Hybrid complementarity** / **Instruction stack** (F6 — já no `demo-seed` para `payments-platform`).
2. Assumptions → `realizedWasteShare ≈ 0.3`.
3. Board de variância: estimated / actual / variance (3 KPIs).

### Bloco D — Hybrid AI (Aba 2)

```bash
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/live-hybrid-report.json
```

Atualizar Aba 2: `http://localhost:5173/?src=/live-hybrid-report.json`

**Mostrar no Overview:** `LlmAnalysisOverview`, **Hybrid complementarity** (`hybridDelta`), **Instruction stack** (`instructionBudget`). Opcional: `apply fixtures/instructions-app --provider cursor --dry-run` para higiene sintetizada.

**Fallback:** URL de backup na Aba 2 (`demo-hybrid-cursor-report.json`) — diga *"pré-gerado no ensaio de ontem"* se o scan ao vivo passar de ~90s.

## Log de validação hybrid

| Run | Data | Tempo real | Notas |
| --- | --- | --- | --- |
| | | | |

```bash
time npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/demo-hybrid-cursor-report.json
```

## Ordem de corte (se passar de 10 min)

1. Remover drill-down por time
2. Trocar hybrid por JSON pré-gerado
3. Encurtar slide de Arquitetura
4. Pular slide de Roadmap

## Checklist de timing

| Bloco | Meta |
| --- | --- |
| Abertura (slides) | 2:15 |
| Extension + scan CLI + apply | 2:15 |
| Prove + variância | 2:15 |
| Hybrid AI + boards do dashboard | 1:30 |
| Fechamento | 1:00 |
| Buffer | 0:30 |
| **Total** | **10:00** |
