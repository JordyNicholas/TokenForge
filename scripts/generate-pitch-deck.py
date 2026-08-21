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
        "Market landscape",
        "Agent memory (Auto Memory, Cursor Memories) — continuity, not $ waste\n"
        "Cloud / infra FinOps — blind to IDE/repo AI-context waste\n"
        "LLM ops / prompt observability — API traces, not coding-agent hygiene\n"
        "Vendor usage dashboards — show spend; do not Detect → Fix waste",
    ),
    (
        "Why TokenForge is different",
        "Auto Memory: enriches continuity for one agent\n"
        "TokenForge: cuts billable waste for the enterprise\n"
        "Unique: Token Risk → policy pack → $ proof\n"
        "  + global BU and per-team/repo Prove across architectures\n"
        "Sound bite: They help the agent remember.\n"
        "  We help the organisation stop bleeding tokens.",
    ),
    (
        "Who it's for",
        "Eng Manager / FinOps — buyer (ROI, team waste, projected $)\n"
        "Developer — user (IDE risk signal + one-click repo fix)\n"
        "Platform / DevEx — rollout (CLI + org policy pack at scale)",
    ),
    (
        "Core loop",
        "1. Detect — score risky context (provider-agnostic; hybrid optional)\n"
        "2. Fix — lean instructions + exclusions via adapters\n"
        "   (Copilot, Cursor, Claude, generic) + org-pack aggregation\n"
        "3. Prove — global BU + per-team dashboards\n"
        "   (microservices / serverless / data platforms)",
    ),
    (
        "Live demo (≤5 min)",
        "Noisy IDE tabs → Context Guard risk drops\n"
        "CLI scan → apply policy pack\n"
        "Dashboard Global → team drill-down → architecture mix\n"
        "Assumptions → ~30% scenario · imported usage badge\n"
        "Close: memory products ≠ FinOps control loop",
    ),
    (
        "Honesty & trust",
        "We advise / exclude — we do not intercept agent pipelines.\n"
        "Default scan is heuristic (no AI); hybrid is opt-in.\n"
        "~30% = editable assumptions × scan totals — not a universal SLA.\n"
        "Usage metrics = file/demo import — not live vendor billing APIs.\n"
        "Pitch Chat/Agent metering — not unlimited completions.",
    ),
    (
        "Roadmap",
        "Shipped (demo): per-team Prove, usage import, org-pack,\n"
        "  Cursor/Claude adapters, compaction/routing advisories\n"
        "Next (true org scale): live billing sync per provider;\n"
        "  remote org exclusion apply APIs\n"
        "Do not lead pitch: chat compaction · model routing as products",
    ),
    (
        "Ask",
        "Category: AI Coding FinOps for metered coding agents.\n"
        "Next proof: pilot on one business unit.\n"
        "They help the agent remember.\n"
        "We help the organisation stop bleeding tokens.",
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
