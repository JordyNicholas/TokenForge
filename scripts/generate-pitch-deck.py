#!/usr/bin/env python3
"""Generate the TokenForge hackathon pitch deck (docs/pitch/TokenForge-Pitch.pptx)."""

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

INK = RGBColor(0x14, 0x1C, 0x24)
INK_MUTED = RGBColor(0x4A, 0x57, 0x66)
SURFACE = RGBColor(0xF7, 0xF8, 0xF9)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0xD8, 0xDE, 0xE5)
TEAL = RGBColor(0x0B, 0x6E, 0x6A)
TEAL_DEEP = RGBColor(0x08, 0x4C, 0x49)
ACCENT_WARM = RGBColor(0xC4, 0x5C, 0x26)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SOFT = RGBColor(0xC5, 0xD0, 0xD8)
MINT = RGBColor(0xB7, 0xE0, 0xDC)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
MARGIN_X = Inches(0.7)
MARGIN_Y = Inches(0.5)


def _set_run(
    run,
    text: str,
    *,
    size: int,
    bold: bool = False,
    color=INK,
    font: str = "Calibri",
) -> None:
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    r_pr = run._r.get_or_add_rPr()
    for tag in ("latin", "ea", "cs"):
        el = r_pr.find(qn(f"a:{tag}"))
        if el is None:
            el = r_pr.makeelement(qn(f"a:{tag}"), {})
            r_pr.append(el)
        el.set("typeface", font)


def _fill(shape, color: RGBColor) -> None:
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def _add_rect(slide, left, top, width, height, color: RGBColor):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    _fill(shape, color)
    return shape


def _add_card_chrome(slide, left, top, width, height, *, accent=TEAL) -> None:
    """Background + accent bar + border (drawn before text so text stays on top)."""
    _add_rect(slide, left, top, width, height, CARD)
    _add_rect(slide, left, top, Inches(0.08), height, accent)
    border = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    border.fill.background()
    border.line.color.rgb = LINE
    border.line.width = Pt(1)


def _textbox(slide, left, top, width, height):
    shape = slide.shapes.add_textbox(left, top, width, height)
    shape.text_frame.word_wrap = True
    return shape


def _write_lines(tf, lines: list[tuple[str, dict]], *, align=PP_ALIGN.LEFT) -> None:
    tf.clear()
    tf.word_wrap = True
    for i, (text, style) in enumerate(lines):
        paragraph = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        paragraph.alignment = style.get("align", align)
        paragraph.space_after = Pt(style.get("space_after", 4))
        paragraph.space_before = Pt(style.get("space_before", 0))
        run = paragraph.add_run()
        _set_run(
            run,
            text,
            size=style.get("size", 16),
            bold=style.get("bold", False),
            color=style.get("color", INK),
            font=style.get("font", "Calibri"),
        )


def blank_slide(prs: Presentation):
    return prs.slides.add_slide(prs.slide_layouts[6])


def paint_surface(slide) -> None:
    _add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, SURFACE)
    _add_rect(slide, 0, 0, Inches(0.12), SLIDE_H, TEAL)


def footer(slide, page: str) -> None:
    box = _textbox(slide, MARGIN_X, Inches(7.1), Inches(12), Inches(0.28))
    _write_lines(
        box.text_frame,
        [
            (
                f"TokenForge  ·  AI Coding FinOps  ·  Hackathon pitch  ·  {page}",
                {"size": 11, "color": INK_MUTED, "space_after": 0},
            )
        ],
    )


def section_label(slide, text: str, top=MARGIN_Y) -> None:
    box = _textbox(slide, MARGIN_X, top, Inches(12), Inches(0.3))
    _write_lines(
        box.text_frame,
        [(text.upper(), {"size": 12, "bold": True, "color": TEAL, "space_after": 0})],
    )


def headline(slide, text: str, *, top=Inches(0.85), height=Inches(0.7), size: int = 32) -> None:
    box = _textbox(slide, MARGIN_X, top, Inches(12), height)
    _write_lines(
        box.text_frame,
        [(text, {"size": size, "bold": True, "color": INK, "space_after": 0})],
    )


def add_card(
    slide,
    left,
    top,
    width,
    height,
    title: str,
    body: str,
    *,
    accent=TEAL,
    title_size: int = 15,
    body_size: int = 13,
) -> None:
    """Card with reserved title band so title never overlaps body."""
    _add_card_chrome(slide, left, top, width, height, accent=accent)

    pad_x = Inches(0.22)
    pad_top = Inches(0.18)
    # Two-line title band; body starts below it
    title_h = Inches(0.55)
    gap = Inches(0.08)

    title_box = _textbox(slide, left + pad_x, top + pad_top, width - pad_x * 2, title_h)
    title_box.text_frame.auto_size = None
    _write_lines(
        title_box.text_frame,
        [(title, {"size": title_size, "bold": True, "color": INK, "space_after": 0})],
    )

    body_top = top + pad_top + title_h + gap
    body_h = height - (pad_top + title_h + gap + Inches(0.16))
    if body_h < Inches(0.4):
        body_h = Inches(0.4)

    body_box = _textbox(slide, left + pad_x, body_top, width - pad_x * 2, body_h)
    body_lines = [
        (line, {"size": body_size, "color": INK_MUTED, "space_after": 4})
        for line in body.split("\n")
        if line.strip()
    ]
    if not body_lines:
        body_lines = [("", {"size": body_size, "color": INK_MUTED, "space_after": 0})]
    _write_lines(body_box.text_frame, body_lines)


def title_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    _add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, INK)
    _add_rect(slide, 0, 0, Inches(0.18), SLIDE_H, TEAL)
    _add_rect(slide, Inches(0.18), Inches(5.95), SLIDE_W - Inches(0.18), Inches(1.55), TEAL_DEEP)

    label = _textbox(slide, MARGIN_X, Inches(1.7), Inches(11), Inches(0.35))
    _write_lines(
        label.text_frame,
        [("HACKATHON PITCH", {"size": 14, "bold": True, "color": TEAL, "space_after": 0})],
    )

    title = _textbox(slide, MARGIN_X, Inches(2.15), Inches(11.5), Inches(0.95))
    _write_lines(
        title.text_frame,
        [("TokenForge", {"size": 56, "bold": True, "color": WHITE, "space_after": 0})],
    )

    sub = _textbox(slide, MARGIN_X, Inches(3.25), Inches(11.5), Inches(1.3))
    _write_lines(
        sub.text_frame,
        [
            ("AI Coding FinOps", {"size": 26, "bold": True, "color": WHITE, "space_after": 10}),
            (
                "Detect high-cost context  →  Fix with provider policy packs  →  Prove $ saved",
                {"size": 17, "color": SOFT, "space_after": 0},
            ),
        ],
    )

    foot = _textbox(slide, MARGIN_X, Inches(6.25), Inches(12), Inches(0.85))
    _write_lines(
        foot.text_frame,
        [
            (
                "Detect → Fix → Prove for metered AI coding agents",
                {"size": 16, "bold": True, "color": WHITE, "space_after": 6},
            ),
            (
                "Stop bleeding tokens on low-value context",
                {"size": 14, "color": MINT, "space_after": 0},
            ),
        ],
    )


def problem_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "01  ·  The problem")
    headline(
        slide,
        "Teams buy AI coding credits — then burn them on waste.",
        size=30,
        height=Inches(0.65),
    )

    lead = _textbox(slide, MARGIN_X, Inches(1.6), Inches(12), Inches(0.5))
    _write_lines(
        lead.text_frame,
        [
            (
                "Low-value context inflates Chat/Agent workflows. There’s no clear loop to see → fix → prove savings.",
                {"size": 16, "color": INK_MUTED, "space_after": 0},
            )
        ],
    )

    cards = [
        ("Inactive giant tabs", "Lockfiles, bundles, and stale editors ride into every Agent turn."),
        ("Fat always-on instructions", "Bloated AGENTS / rules files tax every session."),
        ("Missing exclusions", "No governed pack to keep generated junk out of context."),
        ("No savings proof", "Spend shows on invoices — waste never shows as a finding."),
    ]
    w, h, gap = Inches(2.85), Inches(2.85), Inches(0.22)
    for i, (title, body) in enumerate(cards):
        add_card(slide, MARGIN_X + i * (w + gap), Inches(2.3), w, h, title, body)
    footer(slide, "2 / 10")


def landscape_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "02  ·  Competition analysis")
    headline(
        slide,
        "The market has pieces of the answer — not the control loop.",
        size=28,
        height=Inches(0.7),
    )

    rows = [
        ("Agent memory", "Continuity for one agent", "Does not cut billable waste or prove $"),
        ("Cloud FinOps", "Infra / SaaS cloud spend", "Blind to IDE & repo AI-context waste"),
        ("LLM observability", "API traces & prompt $", "Not coding-agent tab + exclusion hygiene"),
        ("Vendor dashboards", "Show Copilot / Cursor spend", "Report spend — do not Detect → Fix"),
    ]
    y0 = Inches(1.8)
    headers = ("Category", "Optimises", "Gap vs TokenForge")
    widths = (Inches(2.8), Inches(4.2), Inches(4.8))
    table_w = widths[0] + widths[1] + widths[2]
    row_h = Inches(0.78)

    _add_rect(slide, MARGIN_X, y0, table_w, Inches(0.45), TEAL_DEEP)
    x = MARGIN_X
    for header, width in zip(headers, widths):
        box = _textbox(slide, x + Inches(0.15), y0 + Inches(0.08), width - Inches(0.25), Inches(0.32))
        _write_lines(
            box.text_frame,
            [(header, {"size": 13, "bold": True, "color": WHITE, "space_after": 0})],
        )
        x += width

    for i, (a, b, c) in enumerate(rows):
        y = y0 + Inches(0.45) + i * row_h
        bg = CARD if i % 2 == 0 else RGBColor(0xEE, 0xF2, 0xF5)
        _add_rect(slide, MARGIN_X, y, table_w, row_h, bg)
        x = MARGIN_X
        for j, (val, width) in enumerate(zip((a, b, c), widths)):
            box = _textbox(
                slide,
                x + Inches(0.15),
                y + Inches(0.22),
                width - Inches(0.25),
                Inches(0.4),
            )
            _write_lines(
                box.text_frame,
                [
                    (
                        val,
                        {
                            "size": 14,
                            "bold": j == 0,
                            "color": INK if j == 0 else INK_MUTED,
                            "space_after": 0,
                        },
                    )
                ],
            )
            x += width

    footer(slide, "3 / 10")


def differentiation_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "03  ·  Competitive differentiation")
    headline(
        slide,
        "Memory helps the agent. We stop the organisation bleeding tokens.",
        size=26,
        height=Inches(0.75),
    )

    col_w = Inches(5.7)
    col_h = Inches(3.35)
    left = MARGIN_X
    right = Inches(6.9)
    top = Inches(1.8)
    header_h = Inches(0.55)

    # Left column
    _add_rect(slide, left, top, col_w, col_h, CARD)
    _add_rect(slide, left, top, col_w, header_h, RGBColor(0x5B, 0x67, 0x75))
    left_h = _textbox(slide, left + Inches(0.28), top + Inches(0.12), col_w - Inches(0.5), Inches(0.35))
    _write_lines(
        left_h.text_frame,
        [("Auto Memory / continuity", {"size": 16, "bold": True, "color": WHITE, "space_after": 0})],
    )
    left_b = _textbox(slide, left + Inches(0.28), top + header_h + Inches(0.25), col_w - Inches(0.5), Inches(2.4))
    _write_lines(
        left_b.text_frame,
        [
            ("Remembers useful project knowledge", {"size": 15, "color": INK_MUTED, "space_after": 12}),
            ("Enriches one agent’s continuity", {"size": 15, "color": INK_MUTED, "space_after": 12}),
            ("Metric: memory quality", {"size": 15, "color": INK_MUTED, "space_after": 0}),
        ],
    )

    # Right column
    _add_rect(slide, right, top, col_w, col_h, CARD)
    _add_rect(slide, right, top, col_w, header_h, TEAL)
    right_h = _textbox(slide, right + Inches(0.28), top + Inches(0.12), col_w - Inches(0.5), Inches(0.35))
    _write_lines(
        right_h.text_frame,
        [("TokenForge", {"size": 16, "bold": True, "color": WHITE, "space_after": 0})],
    )
    right_b = _textbox(slide, right + Inches(0.28), top + header_h + Inches(0.25), col_w - Inches(0.5), Inches(2.4))
    _write_lines(
        right_b.text_frame,
        [
            ("Stops paying for useless context", {"size": 15, "bold": True, "color": INK, "space_after": 12}),
            ("Cuts billable waste for the team", {"size": 15, "bold": True, "color": INK, "space_after": 12}),
            ("Metric: tokens / credits / $ avoided", {"size": 15, "bold": True, "color": INK, "space_after": 0}),
        ],
    )

    bite = _textbox(slide, MARGIN_X, Inches(5.45), Inches(12), Inches(0.9))
    _write_lines(
        bite.text_frame,
        [
            (
                "Unique wedge: Token Risk → provider policy pack → global + per-team $ proof.",
                {"size": 15, "bold": True, "color": TEAL_DEEP, "space_after": 0},
            )
        ],
    )
    footer(slide, "4 / 10")


def buyers_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "04  ·  Who it’s for")
    headline(slide, "One product. Three relationships.", size=30)

    roles = [
        ("Buyer", "Eng Manager / FinOps", "ROI, team waste, projected $, BU roll-up"),
        ("User", "Developer", "IDE risk signal + Keep / Filter + one-click repo fix"),
        ("Rollout", "Platform / DevEx", "CLI adapters + org-pack at estate scale"),
    ]
    w = Inches(3.85)
    gap = Inches(0.25)
    for i, (tag, role, body) in enumerate(roles):
        left = MARGIN_X + i * (w + gap)
        # Separate title lines to avoid cramped "Buyer · Role" overlap
        add_card(
            slide,
            left,
            Inches(1.85),
            w,
            Inches(3.6),
            f"{tag}: {role}",
            body,
            title_size=14,
            body_size=14,
        )
    footer(slide, "5 / 10")


def loop_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "05  ·  Product")
    headline(slide, "Detect → Fix → Prove", size=32)

    steps = [
        ("01", "Detect", "Score risky tabs & paths.\nProvider-agnostic.\nHybrid LLM optional."),
        ("02", "Fix", "Lean instructions +\nexclusions via adapters.\nOrg-pack for multi-repo."),
        ("03", "Prove", "Global BU dashboard +\nper-team / per-repo views.\nArchitecture-aware."),
    ]
    w = Inches(3.85)
    gap = Inches(0.25)
    card_top = Inches(1.85)
    card_h = Inches(3.7)
    header_h = Inches(1.05)

    for i, (num, title, body) in enumerate(steps):
        left = MARGIN_X + i * (w + gap)
        _add_rect(slide, left, card_top, w, card_h, CARD)
        _add_rect(slide, left, card_top, w, header_h, TEAL if i < 2 else TEAL_DEEP)

        # Number and title as separate stacked lines in the header
        num_box = _textbox(slide, left + Inches(0.28), card_top + Inches(0.14), w - Inches(0.5), Inches(0.3))
        _write_lines(
            num_box.text_frame,
            [(num, {"size": 13, "bold": True, "color": MINT, "space_after": 0})],
        )
        title_box = _textbox(slide, left + Inches(0.28), card_top + Inches(0.42), w - Inches(0.5), Inches(0.45))
        _write_lines(
            title_box.text_frame,
            [(title, {"size": 22, "bold": True, "color": WHITE, "space_after": 0})],
        )

        body_box = _textbox(
            slide,
            left + Inches(0.28),
            card_top + header_h + Inches(0.25),
            w - Inches(0.5),
            card_h - header_h - Inches(0.4),
        )
        _write_lines(
            body_box.text_frame,
            [
                (line, {"size": 15, "color": INK_MUTED, "space_after": 8})
                for line in body.split("\n")
            ],
        )

    footer(slide, "6 / 10")


def demo_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "06  ·  Live demo")
    headline(slide, "Five minutes. Three surfaces. One loop.", size=30)

    beats = [
        ("1. Detect", "Context Guard on noisy tabs.\nFilter lockfile → risk drops."),
        ("2. Fix", "CLI scan → apply policy pack\n(or org-pack for the estate)."),
        ("3. Prove", "Global Overview → team drill-down.\nArchitecture mix + usage import."),
        ("4. Close", "Assumptions → ~30% scenario.\nMemory ≠ FinOps sound bite."),
    ]
    w = Inches(2.85)
    gap = Inches(0.22)
    for i, (title, body) in enumerate(beats):
        add_card(
            slide,
            MARGIN_X + i * (w + gap),
            Inches(1.85),
            w,
            Inches(3.7),
            title,
            body,
            accent=ACCENT_WARM if i == 3 else TEAL,
            title_size=15,
            body_size=13,
        )
    footer(slide, "7 / 10")


def honesty_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "07  ·  Honesty")
    headline(slide, "What we claim — and what we refuse to claim.", size=28)

    claims = [
        (
            "We do",
            "Advise, filter recommended context, write exclusion / instruction packs, prove with transparent assumptions.",
        ),
        ("We don’t", "Intercept any vendor’s private Chat/Agent pipeline."),
        ("Default scan", "Heuristic only — no AI. Hybrid enrich is explicit and bounded."),
        ("~30%", "Scenario math on the demo seed — not a universal SLA."),
        ("Usage import", "Demo / file metrics today. Live billing sync is next."),
        ("Metering", "Chat / Agent / AI credits — not unlimited completions."),
    ]
    card_w = Inches(5.85)
    card_h = Inches(1.4)
    for i, (title, body) in enumerate(claims):
        col = i % 2
        row = i // 2
        left = MARGIN_X + col * (card_w + Inches(0.2))
        top = Inches(1.7) + row * (card_h + Inches(0.15))
        add_card(slide, left, top, card_w, card_h, title, body, title_size=14, body_size=12)
    footer(slide, "8 / 10")


def roadmap_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "08  ·  Roadmap")
    headline(slide, "Demo-complete today. Org-scale next.", size=30)

    add_card(
        slide,
        MARGIN_X,
        Inches(1.85),
        Inches(5.85),
        Inches(3.8),
        "Shipped for the hackathon demo",
        "Per-team + global Prove\nArchitecture tags + usage import\nOrg-pack + Cursor/Claude adapters\nAdvisory levers (do not lead the pitch)",
        accent=TEAL,
        title_size=16,
        body_size=15,
    )
    add_card(
        slide,
        Inches(6.9),
        Inches(1.85),
        Inches(5.85),
        Inches(3.8),
        "Next if we keep building",
        "Live billing sync per provider\nRemote org exclusion apply APIs\nKeep Detect → Fix → Prove as the spine",
        accent=ACCENT_WARM,
        title_size=16,
        body_size=15,
    )
    footer(slide, "9 / 10")


def ask_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    _add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, INK)
    _add_rect(slide, 0, 0, Inches(0.18), SLIDE_H, TEAL)

    label = _textbox(slide, MARGIN_X, Inches(1.7), Inches(11), Inches(0.35))
    _write_lines(
        label.text_frame,
        [("TAKEAWAY", {"size": 14, "bold": True, "color": TEAL, "space_after": 0})],
    )

    title = _textbox(slide, MARGIN_X, Inches(2.2), Inches(12), Inches(1.5))
    _write_lines(
        title.text_frame,
        [
            (
                "AI Coding FinOps — Detect → Fix → Prove.",
                {"size": 32, "bold": True, "color": WHITE, "space_after": 14},
            ),
            (
                "FinOps for AI coding context waste — works across agents, not one brand.",
                {"size": 18, "color": SOFT, "space_after": 0},
            ),
        ],
    )

    bite = _textbox(slide, MARGIN_X, Inches(4.3), Inches(12), Inches(1.5))
    _write_lines(
        bite.text_frame,
        [
            ("They help the agent remember.", {"size": 24, "color": MINT, "space_after": 10}),
            (
                "We help the organisation stop bleeding tokens.",
                {"size": 24, "bold": True, "color": WHITE, "space_after": 0},
            ),
        ],
    )

    foot = _textbox(slide, MARGIN_X, Inches(6.5), Inches(12), Inches(0.35))
    _write_lines(
        foot.text_frame,
        [("TokenForge  ·  Hackathon pitch", {"size": 14, "color": TEAL, "space_after": 0})],
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
