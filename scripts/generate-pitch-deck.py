#!/usr/bin/env python3
"""Generate a board-ready TokenForge pitch deck (docs/pitch/TokenForge-Pitch.pptx)."""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "pitch" / "TokenForge-Pitch.pptx"

# Exec-room palette: charcoal + teal (avoid purple-AI / cream-serif clichés)
INK = RGBColor(0x14, 0x1C, 0x24)
INK_MUTED = RGBColor(0x4A, 0x57, 0x66)
SURFACE = RGBColor(0xF7, 0xF8, 0xF9)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0xD8, 0xDE, 0xE5)
TEAL = RGBColor(0x0B, 0x6E, 0x6A)
TEAL_DEEP = RGBColor(0x08, 0x4C, 0x49)
ACCENT_WARM = RGBColor(0xC4, 0x5C, 0x26)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
MARGIN_X = Inches(0.7)
MARGIN_Y = Inches(0.55)


def _set_run(run, text: str, *, size: int, bold: bool = False, color=INK, font: str = "Calibri"):
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    # Force East Asian / latin font hint for consistent rendering
    rPr = run._r.get_or_add_rPr()
    for tag in ("latin", "ea", "cs"):
        el = rPr.find(qn(f"a:{tag}"))
        if el is None:
            el = rPr.makeelement(qn(f"a:{tag}"), {})
            rPr.append(el)
        el.set("typeface", font)


def _fill(shape, color: RGBColor) -> None:
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def _add_rect(slide, left, top, width, height, color: RGBColor):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    _fill(shape, color)
    return shape


def _textbox(slide, left, top, width, height):
    return slide.shapes.add_textbox(left, top, width, height)


def _write_lines(tf, lines: list[tuple[str, dict]], *, align=PP_ALIGN.LEFT):
    tf.clear()
    tf.word_wrap = True
    for i, (text, style) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = style.get("align", align)
        p.space_after = Pt(style.get("space_after", 6))
        p.space_before = Pt(style.get("space_before", 0))
        run = p.add_run()
        _set_run(
            run,
            text,
            size=style.get("size", 18),
            bold=style.get("bold", False),
            color=style.get("color", INK),
            font=style.get("font", "Calibri"),
        )


def blank_slide(prs: Presentation):
    # Layout 6 is blank on the default template
    return prs.slides.add_slide(prs.slide_layouts[6])


def paint_surface(slide) -> None:
    _add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, SURFACE)
    _add_rect(slide, 0, 0, Inches(0.12), SLIDE_H, TEAL)


def footer(slide, page: str) -> None:
    box = _textbox(slide, MARGIN_X, Inches(7.05), Inches(10), Inches(0.3))
    _write_lines(
        box.text_frame,
        [
            (
                f"TokenForge  ·  AI Coding FinOps  ·  Confidential board brief  ·  {page}",
                {"size": 11, "color": INK_MUTED, "space_after": 0},
            )
        ],
    )


def section_label(slide, text: str, top=MARGIN_Y) -> None:
    box = _textbox(slide, MARGIN_X, top, Inches(12), Inches(0.35))
    _write_lines(
        box.text_frame,
        [(text.upper(), {"size": 12, "bold": True, "color": TEAL, "space_after": 0})],
    )


def headline(slide, text: str, top=Inches(0.9), size: int = 36) -> None:
    box = _textbox(slide, MARGIN_X, top, Inches(12), Inches(0.7))
    _write_lines(
        box.text_frame,
        [(text, {"size": size, "bold": True, "color": INK, "space_after": 0})],
    )


def add_card(slide, left, top, width, height, title: str, body: str, *, accent=TEAL):
    _add_rect(slide, left, top, width, height, CARD)
    _add_rect(slide, left, top, Inches(0.08), height, accent)
    # thin border via overlapping stroke simulation
    border = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    border.fill.background()
    border.line.color.rgb = LINE
    border.line.width = Pt(1)

    t = _textbox(slide, left + Inches(0.28), top + Inches(0.22), width - Inches(0.4), Inches(0.4))
    _write_lines(t.text_frame, [(title, {"size": 16, "bold": True, "color": INK, "space_after": 0})])
    b = _textbox(
        slide,
        left + Inches(0.28),
        top + Inches(0.65),
        width - Inches(0.4),
        height - Inches(0.85),
    )
    _write_lines(b.text_frame, [(body, {"size": 14, "color": INK_MUTED, "space_after": 0})])


def title_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    _add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, INK)
    _add_rect(slide, 0, 0, Inches(0.18), SLIDE_H, TEAL)
    _add_rect(slide, Inches(0.18), Inches(5.9), SLIDE_W - Inches(0.18), Inches(1.6), TEAL_DEEP)

    label = _textbox(slide, MARGIN_X, Inches(1.6), Inches(11), Inches(0.4))
    _write_lines(
        label.text_frame,
        [("BOARD BRIEF", {"size": 14, "bold": True, "color": TEAL, "space_after": 0})],
    )
    title = _textbox(slide, MARGIN_X, Inches(2.1), Inches(11.5), Inches(1.1))
    _write_lines(
        title.text_frame,
        [("TokenForge", {"size": 60, "bold": True, "color": WHITE, "space_after": 0})],
    )
    sub = _textbox(slide, MARGIN_X, Inches(3.3), Inches(11), Inches(1.2))
    _write_lines(
        sub.text_frame,
        [
            ("AI Coding FinOps", {"size": 28, "bold": True, "color": WHITE, "space_after": 8}),
            (
                "Detect high-cost context  →  Fix with provider policy packs  →  Prove $ saved",
                {"size": 18, "color": RGBColor(0xC5, 0xD0, 0xD8), "space_after": 0},
            ),
        ],
    )
    foot = _textbox(slide, MARGIN_X, Inches(6.25), Inches(12), Inches(0.8))
    _write_lines(
        foot.text_frame,
        [
            (
                "For CEO · CTO · Presidents · Global Directors",
                {"size": 16, "bold": True, "color": WHITE, "space_after": 4},
            ),
            (
                "Category ownership: stop bleeding tokens on metered coding agents",
                {"size": 14, "color": RGBColor(0xB7, 0xE0, 0xDC), "space_after": 0},
            ),
        ],
    )


def problem_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "01  ·  The problem")
    headline(slide, "Enterprises buy AI coding credits — then burn them on waste.")
    lead = _textbox(slide, MARGIN_X, Inches(1.7), Inches(12), Inches(0.6))
    _write_lines(
        lead.text_frame,
        [
            (
                "Low-value context inflates Chat/Agent workflows. Managers lack a loop to see → fix → prove savings.",
                {"size": 18, "color": INK_MUTED, "space_after": 0},
            )
        ],
    )
    cards = [
        ("Inactive giant tabs", "Open lockfiles, bundles, and stale editors ride into every Agent turn."),
        ("Fat always-on instructions", "Bloated AGENTS / rules files tax every session."),
        ("Missing exclusions", "No governed pack to keep generated junk out of context."),
        ("No buyer proof", "Spend shows up on invoices — waste does not show up as a finding."),
    ]
    w, h, gap = Inches(2.85), Inches(2.6), Inches(0.22)
    for i, (t, b) in enumerate(cards):
        add_card(slide, MARGIN_X + i * (w + gap), Inches(2.55), w, h, t, b)
    footer(slide, "2 / 10")


def landscape_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "02  ·  Competition analysis")
    headline(slide, "The market has pieces of the answer — not the control loop.")

    rows = [
        ("Agent memory", "Continuity for one agent", "Does not cut billable waste or prove $"),
        ("Cloud FinOps", "Infra / SaaS cloud spend", "Blind to IDE & repo AI-context waste"),
        ("LLM observability", "API traces & prompt $", "Not coding-agent tab + exclusion hygiene"),
        ("Vendor dashboards", "Show Copilot / Cursor spend", "Report spend — do not Detect → Fix"),
    ]
    # header
    y0 = Inches(1.85)
    headers = ("Category", "Optimises", "Gap vs TokenForge")
    widths = (Inches(2.8), Inches(4.2), Inches(4.8))
    x = MARGIN_X
    table_w = widths[0] + widths[1] + widths[2]
    _add_rect(slide, MARGIN_X, y0, table_w, Inches(0.48), TEAL_DEEP)
    for h, w in zip(headers, widths):
        box = _textbox(slide, x + Inches(0.15), y0 + Inches(0.08), w - Inches(0.2), Inches(0.35))
        _write_lines(box.text_frame, [(h, {"size": 14, "bold": True, "color": WHITE, "space_after": 0})])
        x += w

    for i, (a, b, c) in enumerate(rows):
        y = y0 + Inches(0.48) + i * Inches(0.85)
        bg = CARD if i % 2 == 0 else RGBColor(0xEE, 0xF2, 0xF5)
        _add_rect(slide, MARGIN_X, y, table_w, Inches(0.85), bg)
        vals = (a, b, c)
        x = MARGIN_X
        for j, (val, w) in enumerate(zip(vals, widths)):
            box = _textbox(slide, x + Inches(0.15), y + Inches(0.22), w - Inches(0.25), Inches(0.5))
            _write_lines(
                box.text_frame,
                [
                    (
                        val,
                        {
                            "size": 15,
                            "bold": j == 0,
                            "color": INK if j == 0 else INK_MUTED,
                            "space_after": 0,
                        },
                    )
                ],
            )
            x += w
    footer(slide, "3 / 10")


def differentiation_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "03  ·  Competitive differentiation")
    headline(slide, "Memory helps the agent. We stop the organisation bleeding tokens.")

    # two columns
    _add_rect(slide, MARGIN_X, Inches(1.85), Inches(5.7), Inches(3.6), CARD)
    _add_rect(slide, MARGIN_X, Inches(1.85), Inches(5.7), Inches(0.55), RGBColor(0x5B, 0x67, 0x75))
    left_h = _textbox(slide, MARGIN_X + Inches(0.3), Inches(1.95), Inches(5.1), Inches(0.4))
    _write_lines(left_h.text_frame, [("Auto Memory / continuity", {"size": 18, "bold": True, "color": WHITE, "space_after": 0})])
    left_b = _textbox(slide, MARGIN_X + Inches(0.3), Inches(2.6), Inches(5.1), Inches(2.6))
    _write_lines(
        left_b.text_frame,
        [
            ("Remembers useful project knowledge", {"size": 16, "color": INK_MUTED, "space_after": 10}),
            ("Enriches one agent’s continuity", {"size": 16, "color": INK_MUTED, "space_after": 10}),
            ("Metric: memory quality", {"size": 16, "color": INK_MUTED, "space_after": 0}),
        ],
    )

    _add_rect(slide, Inches(6.9), Inches(1.85), Inches(5.7), Inches(3.6), CARD)
    _add_rect(slide, Inches(6.9), Inches(1.85), Inches(5.7), Inches(0.55), TEAL)
    right_h = _textbox(slide, Inches(7.2), Inches(1.95), Inches(5.1), Inches(0.4))
    _write_lines(right_h.text_frame, [("TokenForge", {"size": 18, "bold": True, "color": WHITE, "space_after": 0})])
    right_b = _textbox(slide, Inches(7.2), Inches(2.6), Inches(5.1), Inches(2.6))
    _write_lines(
        right_b.text_frame,
        [
            ("Stops paying for useless context", {"size": 16, "color": INK, "bold": True, "space_after": 10}),
            ("Cuts billable waste for the enterprise", {"size": 16, "color": INK, "bold": True, "space_after": 10}),
            ("Metric: tokens / credits / $ avoided", {"size": 16, "color": INK, "bold": True, "space_after": 0}),
        ],
    )

    bite = _textbox(slide, MARGIN_X, Inches(5.7), Inches(12), Inches(0.7))
    _write_lines(
        bite.text_frame,
        [
            (
                "Unique wedge: Token Risk → provider policy pack → global + per-team $ proof across architectures.",
                {"size": 16, "color": TEAL_DEEP, "bold": True, "space_after": 0},
            )
        ],
    )
    footer(slide, "4 / 10")


def buyers_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "04  ·  Who it’s for")
    headline(slide, "One product. Three relationships.")
    roles = [
        ("Buyer", "Eng Manager / FinOps", "ROI, team waste, projected $, BU roll-up"),
        ("User", "Developer", "IDE risk signal + Keep / Filter + one-click repo fix"),
        ("Rollout", "Platform / DevEx", "CLI adapters + org-pack at estate scale"),
    ]
    w = Inches(3.85)
    for i, (tag, title, body) in enumerate(roles):
        left = MARGIN_X + i * (w + Inches(0.25))
        add_card(slide, left, Inches(1.9), w, Inches(3.4), f"{tag}  ·  {title}", body)
    footer(slide, "5 / 10")


def loop_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "05  ·  Product")
    headline(slide, "Detect → Fix → Prove")
    steps = [
        ("01", "Detect", "Score risky tabs & paths.\nProvider-agnostic.\nHybrid LLM optional."),
        ("02", "Fix", "Lean instructions +\nexclusions via adapters.\nOrg-pack for multi-repo."),
        ("03", "Prove", "Global BU dashboard +\nper-team / per-repo views.\nArchitecture-aware."),
    ]
    w = Inches(3.85)
    for i, (num, title, body) in enumerate(steps):
        left = MARGIN_X + i * (w + Inches(0.25))
        _add_rect(slide, left, Inches(1.9), w, Inches(3.5), CARD)
        _add_rect(slide, left, Inches(1.9), w, Inches(0.9), TEAL if i < 2 else TEAL_DEEP)
        n = _textbox(slide, left + Inches(0.3), Inches(2.05), Inches(3.2), Inches(0.6))
        _write_lines(
            n.text_frame,
            [
                (num, {"size": 14, "bold": True, "color": RGBColor(0xB7, 0xE0, 0xDC), "space_after": 0}),
                (title, {"size": 24, "bold": True, "color": WHITE, "space_after": 0}),
            ],
        )
        b = _textbox(slide, left + Inches(0.3), Inches(3.05), Inches(3.2), Inches(2.1))
        lines = [(line, {"size": 16, "color": INK_MUTED, "space_after": 6}) for line in body.split("\n")]
        _write_lines(b.text_frame, lines)
        if i < 2:
            arrow = _textbox(slide, left + w - Inches(0.05), Inches(3.4), Inches(0.35), Inches(0.4))
            _write_lines(arrow.text_frame, [("→", {"size": 22, "bold": True, "color": TEAL, "space_after": 0})])
    footer(slide, "6 / 10")


def demo_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "06  ·  Live proof")
    headline(slide, "Five minutes. Three surfaces. One loop.")
    beats = [
        ("Detect", "Context Guard on noisy tabs\nFilter lockfile → risk drops"),
        ("Fix", "CLI scan → apply policy pack\n(or org-pack for the estate)"),
        ("Prove", "Global Overview → team drill-down\nArchitecture mix + usage import"),
        ("Close", "Assumptions → ~30% scenario\nMemory ≠ FinOps sound bite"),
    ]
    w = Inches(2.85)
    for i, (t, b) in enumerate(beats):
        add_card(
            slide,
            MARGIN_X + i * (w + Inches(0.22)),
            Inches(1.9),
            w,
            Inches(3.5),
            f"{i + 1}.  {t}",
            b,
            accent=ACCENT_WARM if i == 3 else TEAL,
        )
    footer(slide, "7 / 10")


def honesty_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "07  ·  Trust")
    headline(slide, "What we claim — and what we refuse to claim.")
    claims = [
        ("We do", "Advise, filter recommended context, write exclusion / instruction packs, prove with transparent assumptions."),
        ("We don’t", "Intercept any vendor’s private Chat/Agent pipeline."),
        ("Default scan", "Heuristic only — no AI. Hybrid enrich is explicit and bounded."),
        ("~30%", "Scenario math on demo seed (exclusion × waste applicability) — not a universal SLA."),
        ("Usage import", "Demo / file metrics today. Live vendor billing sync is next — not this demo."),
        ("Metering", "Chat / Agent / AI credits. Not unlimited inline completions."),
    ]
    for i, (t, b) in enumerate(claims):
        col = i % 2
        row = i // 2
        left = MARGIN_X + col * Inches(6.05)
        top = Inches(1.75) + row * Inches(1.45)
        add_card(slide, left, top, Inches(5.85), Inches(1.3), t, b)
    footer(slide, "8 / 10")


def roadmap_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "08  ·  Roadmap")
    headline(slide, "Demo-complete today. Org-scale next.")
    add_card(
        slide,
        MARGIN_X,
        Inches(1.85),
        Inches(5.85),
        Inches(3.8),
        "Shipped for board demo",
        "Per-team + global Prove · architecture tags · usage import · org-pack · Cursor/Claude adapters · advisory levers (do not lead).",
        accent=TEAL,
    )
    add_card(
        slide,
        Inches(6.9),
        Inches(1.85),
        Inches(5.85),
        Inches(3.8),
        "Next proof for a BU pilot",
        "Live billing sync per provider · remote org exclusion apply APIs · keep Detect → Fix → Prove as the spine.",
        accent=ACCENT_WARM,
    )
    footer(slide, "9 / 10")


def ask_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    _add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, INK)
    _add_rect(slide, 0, 0, Inches(0.18), SLIDE_H, TEAL)
    label = _textbox(slide, MARGIN_X, Inches(1.5), Inches(11), Inches(0.4))
    _write_lines(label.text_frame, [("THE ASK", {"size": 14, "bold": True, "color": TEAL, "space_after": 0})])
    title = _textbox(slide, MARGIN_X, Inches(2.0), Inches(12), Inches(1.2))
    _write_lines(
        title.text_frame,
        [
            (
                "Own the category: AI Coding FinOps.",
                {"size": 36, "bold": True, "color": WHITE, "space_after": 12},
            ),
            (
                "Next proof: pilot on one business unit.",
                {"size": 22, "color": RGBColor(0xC5, 0xD0, 0xD8), "space_after": 0},
            ),
        ],
    )
    bite = _textbox(slide, MARGIN_X, Inches(4.4), Inches(12), Inches(1.4))
    _write_lines(
        bite.text_frame,
        [
            (
                "They help the agent remember.",
                {"size": 26, "color": RGBColor(0xB7, 0xE0, 0xDC), "space_after": 8},
            ),
            (
                "We help the organisation stop bleeding tokens.",
                {"size": 26, "bold": True, "color": WHITE, "space_after": 0},
            ),
        ],
    )
    foot = _textbox(slide, MARGIN_X, Inches(6.6), Inches(12), Inches(0.4))
    _write_lines(
        foot.text_frame,
        [("TokenForge  ·  Detect → Fix → Prove", {"size": 14, "color": TEAL, "space_after": 0})],
    )


def main() -> None:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    title_slide(prs)
    problem_slide(prs)
    landscape_slide(prs)
    differentiation_slide(prs)
    buyers_slide(prs)
    loop_slide(prs)
    demo_slide(prs)
    honesty_slide(prs)
    roadmap_slide(prs)
    ask_slide(prs)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
