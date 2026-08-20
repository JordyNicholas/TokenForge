#!/usr/bin/env python3
"""Generate TokenForge pitch deck (docs/pitch/TokenForge-Pitch.pptx)."""

from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "pitch" / "TokenForge-Pitch.pptx"

SLIDES = [
    (
        "TokenForge",
        "AI Coding FinOps\nDetect → Fix → Prove",
    ),
    (
        "The problem",
        "Enterprises overspend on metered AI coding credits.\n"
        "Low-value context inflates Chat/Agent workflows:\n"
        "• inactive giant tabs\n"
        "• lockfiles & generated artifacts\n"
        "• fat always-on instructions\n"
        "• missing exclusions",
    ),
    (
        "Who it's for",
        "Eng Manager / FinOps — buyer (ROI, team waste, projected $)\n"
        "Developer — user (IDE risk signal + one-click repo fix)\n"
        "Platform / DevEx — rollout (CLI + policy pack at scale)",
    ),
    (
        "Core loop",
        "1. Detect — score risky context (provider-agnostic)\n"
        "2. Fix — lean instructions + exclusions via adapters\n"
        "3. Prove — Tokens Saved dashboard ($ / credits / tokens)",
    ),
    (
        "Detect: two layers",
        "Default: heuristic scan (fast, offline, deterministic)\n"
        "• file size × inactivity × filetype class\n"
        "• estTokens ≈ ceil(bytes / 4)\n\n"
        "Optional Phase 2: hybrid enrichment\n"
        "• same baseline + LLM semantic pass on bounded candidates\n"
        "• local (Ollama / Qwen) or external (OpenAI, Anthropic, …)",
    ),
    (
        "Hybrid scan honesty",
        "Default scan does NOT use AI.\n"
        "Hybrid is opt-in (--mode hybrid).\n"
        "Token math stays heuristic — not model guesses.\n"
        "External enrichers may send candidate excerpts off-machine.\n"
        "We advise / exclude — we do not intercept agent pipelines.",
    ),
    (
        "Architecture",
        "Ports & adapters (hexagonal)\n"
        "Kernel: packages/risk-core\n"
        "Edges: extension (Detect), CLI adapters (Fix + LLM enrichers), dashboard (Prove)\n"
        "Integration: .tokenforge/scan-report.json",
    ),
    (
        "MVP demo (≤5 min)",
        "Noisy IDE tabs → extension risk drops\n"
        "CLI tokenforge init → policy pack\n"
        "Dashboard → ~30% scenario on demo seed\n"
        "Sound bite: They help the agent remember. We help the org stop bleeding tokens.",
    ),
    (
        "Not Auto Memory",
        "Auto Memory: enriches continuity for one agent\n"
        "TokenForge: cuts billable waste for the enterprise\n"
        "Metric: tokens avoided / AI credits / $ — not memory quality",
    ),
    (
        "Roadmap (Phase 2)",
        "Shipped: heuristic default, Ollama hybrid, dashboard LLM boards\n"
        "F1 Hybrid Detect: OpenAI-compat + Anthropic enrichers, then extension hook\n"
        "F2 Org scale: live usage/billing (per provider) → org policy apply\n"
        "F3 Adjacent (do not pitch): chat compaction · model routing",
    ),
]


def add_title_slide(prs: Presentation, title: str, body: str) -> None:
    layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = title
    tf = slide.placeholders[1].text_frame
    tf.clear()
    for i, line in enumerate(body.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.size = Pt(20 if i == 0 else 18)
        p.level = 0


def main() -> None:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    title_layout = prs.slide_layouts[0]
    first = prs.slides.add_slide(title_layout)
    first.shapes.title.text = SLIDES[0][0]
    first.placeholders[1].text = SLIDES[0][1]

    for title, body in SLIDES[1:]:
        add_title_slide(prs, title, body)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
