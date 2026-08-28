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
SLIDE_COUNT = 11


def _speaker_notes(slide, text: str) -> None:
    notes = slide.notes_slide.notes_text_frame
    notes.text = text


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
                "Managers see the invoice — not the waste loop. Low-value context inflates every Agent turn.",
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
    footer(slide, f"2 / {SLIDE_COUNT}")


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

    bridge = _textbox(slide, MARGIN_X, Inches(5.35), Inches(12), Inches(0.75))
    _write_lines(
        bridge.text_frame,
        [
            (
                "TokenForge is the only loop that Detects IDE/repo context waste, "
                "Fixes via provider policy packs, and Proves $ to FinOps — provider-agnostic.",
                {"size": 14, "bold": True, "color": TEAL_DEEP, "space_after": 0},
            )
        ],
    )
    footer(slide, f"3 / {SLIDE_COUNT}")


def differentiation_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "03  ·  Differentiation & uniqueness")
    headline(
        slide,
        "Memory helps the agent. We stop the organisation bleeding tokens.",
        size=26,
        height=Inches(0.65),
    )

    sub = _textbox(slide, MARGIN_X, Inches(1.55), Inches(12), Inches(0.35))
    _write_lines(
        sub.text_frame,
        [
            (
                "Slide 3 categories optimise spend or recall — none remove billable context waste and prove $.",
                {"size": 14, "color": INK_MUTED, "space_after": 0},
            )
        ],
    )

    col_w = Inches(5.7)
    col_h = Inches(2.05)
    left = MARGIN_X
    right = Inches(6.9)
    top = Inches(2.0)
    header_h = Inches(0.48)

    _add_rect(slide, left, top, col_w, col_h, CARD)
    _add_rect(slide, left, top, col_w, header_h, RGBColor(0x5B, 0x67, 0x75))
    left_h = _textbox(slide, left + Inches(0.28), top + Inches(0.1), col_w - Inches(0.5), Inches(0.32))
    _write_lines(
        left_h.text_frame,
        [("Auto Memory / continuity", {"size": 15, "bold": True, "color": WHITE, "space_after": 0})],
    )
    left_b = _textbox(slide, left + Inches(0.28), top + header_h + Inches(0.15), col_w - Inches(0.5), Inches(1.35))
    _write_lines(
        left_b.text_frame,
        [
            ("Remembers useful project knowledge", {"size": 13, "color": INK_MUTED, "space_after": 8}),
            ("Metric: memory quality", {"size": 13, "color": INK_MUTED, "space_after": 0}),
        ],
    )

    _add_rect(slide, right, top, col_w, col_h, CARD)
    _add_rect(slide, right, top, col_w, header_h, TEAL)
    right_h = _textbox(slide, right + Inches(0.28), top + Inches(0.1), col_w - Inches(0.5), Inches(0.32))
    _write_lines(
        right_h.text_frame,
        [("TokenForge", {"size": 15, "bold": True, "color": WHITE, "space_after": 0})],
    )
    right_b = _textbox(slide, right + Inches(0.28), top + header_h + Inches(0.15), col_w - Inches(0.5), Inches(1.35))
    _write_lines(
        right_b.text_frame,
        [
            ("Stops paying for useless context", {"size": 13, "bold": True, "color": INK, "space_after": 8}),
            ("Metric: tokens / credits / $ avoided", {"size": 13, "bold": True, "color": INK, "space_after": 0}),
        ],
    )

    uniq_top = Inches(4.25)
    uniq_h = Inches(2.05)
    _add_rect(slide, MARGIN_X, uniq_top, Inches(12), uniq_h, TEAL_DEEP)
    uniq_title = _textbox(slide, MARGIN_X + Inches(0.25), uniq_top + Inches(0.12), Inches(11.5), Inches(0.35))
    _write_lines(
        uniq_title.text_frame,
        [("What makes us unique", {"size": 16, "bold": True, "color": WHITE, "space_after": 0})],
    )
    uniq_body = _textbox(slide, MARGIN_X + Inches(0.25), uniq_top + Inches(0.5), Inches(11.5), Inches(1.45))
    _write_lines(
        uniq_body.text_frame,
        [
            (
                "• Detect → Fix → Prove closed loop on billable context waste",
                {"size": 13, "color": MINT, "space_after": 6},
            ),
            (
                "• Provider-agnostic kernel + pluggable Fix / LLM enricher adapters",
                {"size": 13, "color": MINT, "space_after": 6},
            ),
            (
                "• Estimate vs imported bill reconciliation — not scan totals alone",
                {"size": 13, "color": MINT, "space_after": 6},
            ),
            (
                "• Hybrid AI opt-in (cursor-cli:composer-2.5) on bounded candidates",
                {"size": 13, "color": MINT, "space_after": 0},
            ),
        ],
    )
    footer(slide, f"4 / {SLIDE_COUNT}")


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
    footer(slide, f"5 / {SLIDE_COUNT}")


def loop_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "05  ·  Product")
    headline(slide, "Detect → Fix → Prove", size=32)

    steps = [
        ("01", "Detect", "Heuristic default +\nopt-in hybrid\n(cursor-cli:composer-2.5)."),
        ("02", "Fix", "Lean instructions +\nexclusions via adapters.\nOrg-pack for multi-repo."),
        ("03", "Prove", "Variance board +\nAssumptions + imported bill.\nArchitecture-aware."),
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

    footer(slide, f"6 / {SLIDE_COUNT}")


def presenter_runof_show_slide(prs: Presentation) -> None:
    """Slide 7 — presenter crib sheet. DO NOT show to judges during live demo."""
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "Presenter run-of-show  ·  do not show live")
    headline(slide, "Ten minutes. Four live beats.", size=28, height=Inches(0.6))

    beats = [
        ("Open 0:00–2:15", "A", "Slides 1–6\nCompetition + uniqueness"),
        ("Detect+Fix 2:15–4:45", "B", "Extension → scan → apply --dry-run"),
        ("Prove 4:45–7:00", "C", "Assumptions ~30%\nVariance 3 KPIs"),
        ("Hybrid 7:00–8:30", "D/B", "cursor-cli:composer-2.5\ninstructions-app"),
        ("Close 8:30–10:00", "A", "Honesty → Architecture → Takeaway"),
    ]
    w = Inches(2.35)
    gap = Inches(0.18)
    for i, (title, owner, body) in enumerate(beats):
        add_card(
            slide,
            MARGIN_X + i * (w + gap),
            Inches(1.75),
            w,
            Inches(3.85),
            f"{title}  [{owner}]",
            body,
            accent=ACCENT_WARM if i == 4 else TEAL,
            title_size=12,
            body_size=12,
        )
    footer(slide, f"7 / {SLIDE_COUNT}")
    _speaker_notes(
        slide,
        "HIDDEN during demo. Full script: .presentation/hackathon-2026-09/PRESENTER_RUNBOOK.md\n"
        "Hybrid: npm run tokenforge -- scan fixtures/instructions-app "
        "--mode hybrid --llm cursor-cli:composer-2.5 --allow-external\n"
        "Fallback: dashboard/public/demo-hybrid-cursor-report.json\n"
        "Cut order: team scope → live hybrid → architecture slide",
    )


def honesty_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "08  ·  Honesty")
    headline(slide, "What we claim — and what we refuse to claim.", size=28)

    claims = [
        (
            "We do",
            "Advise, filter context, write policy packs, prove with transparent assumptions + imported bills.",
        ),
        ("We don’t", "Intercept any vendor’s private Chat/Agent pipeline."),
        (
            "Hybrid scan",
            "Default: heuristic. Opt-in: cursor-cli:composer-2.5 on bounded candidates; --allow-external.",
        ),
        ("Uniqueness claims", "Prove $ via assumptions + bill import — not vendor pipeline metering."),
        ("~30%", "Scenario math on Assumptions — not a universal SLA."),
        ("Usage", "Import or sync UsageMetrics. Estimate vs bill + variance board."),
    ]
    card_w = Inches(5.85)
    card_h = Inches(1.35)
    for i, (title, body) in enumerate(claims):
        col = i % 2
        row = i // 2
        left = MARGIN_X + col * (card_w + Inches(0.2))
        top = Inches(1.7) + row * (card_h + Inches(0.15))
        add_card(slide, left, top, card_w, card_h, title, body, title_size=14, body_size=12)
    footer(slide, f"8 / {SLIDE_COUNT}")


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
        "Hybrid enrichers (Cursor CLI, Ollama, …)\nVariance board + honest savings tiers\nPer-team + global Prove + usage import\nOrg-pack + Cursor/Claude adapters\nAdvisory levers (do not lead the pitch)",
        accent=TEAL,
        title_size=16,
        body_size=14,
    )
    add_card(
        slide,
        Inches(6.9),
        Inches(1.85),
        Inches(5.85),
        Inches(3.8),
        "Next if we keep building",
        "Remote org exclusion apply APIs\nOrg pilot pack (scan → apply → prove)\nKeep Detect → Fix → Prove as the spine",
        accent=ACCENT_WARM,
        title_size=16,
        body_size=15,
    )
    footer(slide, f"9 / {SLIDE_COUNT}")


def architecture_slide(prs: Presentation) -> None:
    slide = blank_slide(prs)
    paint_surface(slide)
    section_label(slide, "09  ·  Architecture")
    headline(slide, "Ports & adapters — shared JSON contract.", size=28, height=Inches(0.65))

    add_card(
        slide,
        MARGIN_X,
        Inches(1.75),
        Inches(3.7),
        Inches(3.9),
        "risk-core (kernel)",
        "Classify, score, protect,\npolicy synthesis, usage math.\nNo VS Code / React / CLI frameworks.",
        accent=TEAL_DEEP,
        title_size=15,
        body_size=13,
    )
    add_card(
        slide,
        Inches(4.8),
        Inches(1.75),
        Inches(3.7),
        Inches(3.9),
        ".tokenforge/*.json",
        "scan-report.json\nlast-scan.json\nUsageMetrics import\nFile contract between surfaces.",
        accent=TEAL,
        title_size=15,
        body_size=13,
    )
    add_card(
        slide,
        Inches(8.9),
        Inches(1.75),
        Inches(3.7),
        Inches(3.9),
        "Adapters",
        "Extension — Detect (tabs)\nCLI — Fix + hybrid enrichers\nDashboard — Prove / variance",
        accent=TEAL,
        title_size=15,
        body_size=13,
    )
    foot = _textbox(slide, MARGIN_X, Inches(5.85), Inches(12), Inches(0.55))
    _write_lines(
        foot.text_frame,
        [
            (
                "Provider adapters write Copilot / Cursor / Claude policy packs from the same findings.",
                {"size": 14, "bold": True, "color": TEAL_DEEP, "space_after": 0},
            )
        ],
    )
    footer(slide, f"10 / {SLIDE_COUNT}")


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
    # Slide 11 — no footer bar on dark takeaway slide


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
    presenter_runof_show_slide(prs)
    honesty_slide(prs)
    roadmap_slide(prs)
    architecture_slide(prs)
    ask_slide(prs)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
