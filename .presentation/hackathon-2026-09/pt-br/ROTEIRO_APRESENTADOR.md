# Roteiro do apresentador — Final hackathon (1–2 set)

**10 minutos** de apresentação + demo, **5 minutos** de Q&A. Espelha o slide 7 do deck (não mostrar o slide 7 aos jurados).

Preencha os papéis em [`EQUIPE.md`](./EQUIPE.md). Roteiro da demo: [`DEMO-10min.md`](./DEMO-10min.md).

---

## Ordem da apresentação

| Bloco | Horário | Responsável | Slides / ação |
| --- | --- | --- | --- |
| Abertura | 0:00–2:15 | **A** | Slides **1–6** (falas abaixo) |
| Detect + Fix | 2:15–4:30 | **B** | Extension → scan → **apply ao vivo** (`--provider cursor`) |
| Prove + variância | 4:30–6:45 | **C** | Dashboard **Aba 1** → Assumptions ~30% → Variância 3 KPIs |
| Hybrid AI | 6:45–8:15 | **B** | `cursor-cli:composer-2.5` → Dashboard **Aba 2** (boards F6) |
| Fechamento | 8:15–10:00 | **A** | Slides **8 → 10 → 11** (pular slide 9 salvo Q&A) |

**Timekeeper:** cartões de 2 min / 1 min / 30 s. Aplicar [ordem de corte](./DEMO-10min.md#ordem-de-corte-se-passar-de-10-min).

Durante **2:15–8:30**: ocultar slides; compartilhar só IDE / terminal / browser.

---

## Falas dos slides (Apresentador A — abertura)

| Slide | Horário | Dizer / mostrar |
| --- | --- | --- |
| **1 Título** | 0:00 | *"AI Coding FinOps — Detect, Fix, Prove para agentes de código com cobrança por uso."* |
| **2 Problema** | 0:20 | Gestores veem a **fatura**, não o ciclo de desperdício. Escolha lockfile + no-proof; não leia os quatro cards. |
| **3 Análise de concorrência** | 0:45 | **Tópico mentor.** *"O mercado tem pedaços — ninguém fecha Detect → Fix → Prove no desperdício de contexto IDE/repo."* |
| **4 Diferenciação** | 1:15 | **Tópicos mentor.** Auto Memory vs TokenForge; leia a caixa **What makes us unique**. Sound bite. |
| **5 Para quem é** | 1:45 | Comprador = Eng Manager / FinOps. Passe para a demo. |
| **6 Loop central** | 2:00 | *"Provamos isso ao vivo em quatro blocos."* Passe para B. |

---

## Falas da demo ao vivo

### B — Detect + Fix (2:15–4:30)

1. Extension Dev Host → sidebar TokenForge → Filter no lockfile.
2. `npm run tokenforge:scan -- --json`
3. `npm run tokenforge:apply -- --provider cursor` (policy pack ao vivo)
4. *"~99,8% é matemática bruta do fixture — vejam o passo Assumptions no dashboard."*

### C — Prove + variância (4:30–6:45)

1. Dashboard **Aba 1** (URL de variância já aberta).
2. Role até **Hybrid complementarity** + **Instruction stack** no Overview (F6 — no demo seed).
3. Assumptions → `realizedWasteShare ≈ 0.3`.
4. Board de variância: estimated / actual / variance.

### B — Hybrid AI (6:45–8:15)

```bash
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/live-hybrid-report.json
```

Mudar para **Aba 2:** `http://localhost:5173/?src=/live-hybrid-report.json`  
Destacar: **Model analysis**, **Hybrid complementarity**, **Instruction stack**.

**Fallback:** Aba 2 `?src=/demo-hybrid-cursor-report.json` se o scan passar de ~90s.

### A — Fechamento (8:30–10:00)

Slides **8 Honestidade** → **10 Arquitetura** → **11 Takeaway**.

---

## Cola de comandos

```bash
npm run tokenforge:extension
npm run tokenforge:dashboard
npm run tokenforge:scan -- --json
npm run tokenforge:apply -- --provider cursor
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/live-hybrid-report.json
```

**Dashboard Aba 1 (Prove + variância):**  
`http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`

**Dashboard Aba 2 (Hybrid backup):**  
`http://localhost:5173/?src=/demo-hybrid-cursor-report.json`

**Dashboard Aba 2 (após hybrid ao vivo):**  
`http://localhost:5173/?src=/live-hybrid-report.json`

**Pré-stage:** `bash .presentation/hackathon-2026-09/prestage.sh`

---

## Q&A (5 min)

| Pergunta | Responsável |
| --- | --- |
| Arquitetura? | A |
| Por que IA / hybrid complementar? | B |
| Prove / variância / economia? | C |
| ~30% vs ~99,8%? | C |
| vs Auto Memory? | A |
| Codex repo audit vs Cursor CLI? | B |
| Dados saindo da org? | B |

FAQ de produto: [`docs/product/PITCH_FAQ.md`](../../../docs/product/PITCH_FAQ.md) · Prep board: [`docs/pitch/PITCH_BOARD_PREP.md`](../../../docs/pitch/PITCH_BOARD_PREP.md).

### Respostas rápidas (forma, não script)

| Pergunta | Resposta (~15 s) |
| --- | --- |
| Interceptam o agente? | Não — higiene de abas + policy packs; exportamos Token Risk JSON |
| ~30% vs ~99,8%? | Ratio do scan é exclusão bruta; Assumptions aplicam aplicabilidade do desperdício |
| Por que IA se heurística basta? | Complementar — bloat de instruções, overview, linhas advisory que heurística não pega |
| Cursor CLI vs Codex? | Cursor = trechos limitados; Codex = cópia sanitizada do repo + propostas de índice |
| Quebra o agente? | dry-run/PR primeiro; merge-section; policy reversível no git |
| vs Auto Memory? | Eles melhoram recall; nós cortamos waste faturável e provamos $ |

---

## Checklists de ensaio

### Ensaio seco #1

- [ ] 10 min completos com timekeeper
- [ ] Apply ao vivo em `noisy-app` (`--provider cursor`) incluído
- [ ] Duas abas do dashboard ensaiadas (Prove + Hybrid)
- [ ] `cursor-cli:composer-2.5` ao vivo cronometrado; fallback JSON testado

### Ensaio seco #2 + Q&A simulado

- [ ] 10 min + 5 min Q&A simulado
- [ ] Gravar vídeo backup (extension + boards hybrid)

### Smoke test (manhã da apresentação)

- [ ] `npm run typecheck && npm test`
- [ ] Extension F5; dashboard + JSON hybrid OK
- [ ] `agent status --format json` OK
