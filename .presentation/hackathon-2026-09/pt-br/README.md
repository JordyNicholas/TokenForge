# Apresentação hackathon — Set 2026 (contextual)

**Não é documentação de produto.** Esta pasta é só para a apresentação de 1–2 de setembro. **Não** está linkada em [`docs/README.md`](../../../docs/README.md) nem no README do repositório.

English: [`../en/`](../en/).

Depois do evento, apague esta pasta ou arquive localmente.

## Ativos do repositório usados na demo (permanecem no tree)

| Ativo | Caminho |
| --- | --- |
| Deck de pitch | [`docs/pitch/TokenForge-Pitch.pptx`](../../../docs/pitch/TokenForge-Pitch.pptx) |
| Relatório hybrid de backup | [`dashboard/public/demo-hybrid-cursor-report.json`](../../../dashboard/public/demo-hybrid-cursor-report.json) |
| Slot hybrid ao vivo (copiado na demo) | `dashboard/public/live-hybrid-report.json` |

Regenerar deck: `python3 scripts/generate-pitch-deck.py` (na raiz do repo).

## Esta pasta

| Arquivo | Propósito |
| --- | --- |
| [`EQUIPE.md`](./EQUIPE.md) | Horário, papéis A/B/C/D, timekeeper |
| [`ROTEIRO_APRESENTADOR.md`](./ROTEIRO_APRESENTADOR.md) | Run-of-show 10 min, falas dos slides, Q&A, ensaios |
| [`DEMO-10min.md`](./DEMO-10min.md) | Roteiro da demo ao vivo (Detect → Fix → Prove + hybrid + variância) |
| [`../prestage.sh`](../prestage.sh) | Build, testes, refresh opcional do JSON hybrid |

Demo genérica ≤5 min (runbook de produto): [`docs/runbooks/DEMO_RUNBOOK.md`](../../../docs/runbooks/DEMO_RUNBOOK.md).

FAQ para jurados: [`docs/product/PITCH_FAQ.md`](../../../docs/product/PITCH_FAQ.md).
