"""Generate the CycleStay practical-flow summary as a polished PDF."""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem,
    PageBreak, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT

CARDINAL = HexColor("#8C1515")
CARDINAL_DARK = HexColor("#5C0000")
COOL_GREY = HexColor("#53565A")
INK = HexColor("#1A1A18")
INK_MID = HexColor("#444441")
INK_MUTED = HexColor("#888780")

OUT = r"C:\Users\varun\Downloads\CycleStay-How-It-Works.pdf"

doc = SimpleDocTemplate(
    OUT, pagesize=LETTER,
    leftMargin=0.85 * inch, rightMargin=0.85 * inch,
    topMargin=0.7 * inch, bottomMargin=0.7 * inch,
    title="CycleStay — How the Platform Would Actually Work",
    author="CycleStay Team",
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=24, textColor=CARDINAL,
    leading=28, spaceAfter=4, alignment=TA_LEFT,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica-Oblique", fontSize=12, textColor=COOL_GREY,
    leading=16, spaceAfter=18,
)
kicker_style = ParagraphStyle(
    "Kicker", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=9, textColor=CARDINAL,
    spaceAfter=4, leading=12,
)
section_style = ParagraphStyle(
    "Section", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=14, textColor=INK,
    spaceBefore=14, spaceAfter=8, leading=18,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10.5, textColor=INK_MID,
    leading=15, spaceAfter=6, alignment=TA_LEFT,
)
step_num_style = ParagraphStyle(
    "StepNum", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=10.5, textColor=CARDINAL,
    leading=15, spaceAfter=6,
)
emphasis_style = ParagraphStyle(
    "Emphasis", parent=body_style,
    fontName="Helvetica-Oblique", textColor=CARDINAL_DARK, fontSize=11,
    leading=16, spaceBefore=6, spaceAfter=6,
)


def step(n, text):
    """Numbered step with bold leader."""
    return Paragraph(
        f'<font color="#8C1515"><b>{n}.</b></font> &nbsp;{text}',
        body_style,
    )


story = []

# Header
story.append(Paragraph("HOW THE PLATFORM WOULD WORK", kicker_style))
story.append(Paragraph("CycleStay in practice", title_style))
story.append(Paragraph(
    "The end-to-end operational flow if the matching engine, "
    "trust layer, and logistics were live.",
    subtitle_style,
))

# End-to-end flow
story.append(Paragraph("End-to-end flow if this were live", section_style))

flow = [
    "<b>March – April:</b> Students at partner MBA programs hit "
    "<b>cyclestay.app</b>, submit a listing in 2 minutes "
    "(origin city + apartment, destination city, dates, unit type). "
    "<b>.edu</b> confirmation email validates them; the listing enters "
    "the pool with status <b>submitted</b>.",

    "<b>Submission window closes</b> (early May). For ~6 weeks, listings "
    "just accumulate — no matches yet. This builds the cohort density "
    "that cycle-finding needs.",

    "<b>Match day:</b> the engine runs over the full pool — builds the "
    "compatibility graph, enumerates 2-, 3-, and 4-way cycles, picks "
    "the highest-scoring non-overlapping set. Output: a list of "
    "proposed cycles, each tagging 2–4 students.",

    "<b>Each matched student receives an email</b> with their proposed "
    "cycle: who's in it, what they're getting, what they're giving up, "
    "and a 48-hour window to accept or reject. They can click into a "
    "profile of each counterparty (verified .edu, prior CycleStay "
    "history if any, optional LinkedIn).",

    "<b>All-accept → cycle locks.</b> Each student wires a refundable "
    "deposit into escrow (~$500). Platform fee comes off the top "
    "(~$150/person). Keys, contact info, and move-in instructions are "
    "exchanged inside the platform. Lease-compliance: each student is "
    "required to upload landlord written consent before keys are released "
    "— this is the friction layer.",

    "<b>Any-reject → cycle dissolves</b>, and those students re-enter "
    "the pool. Match engine reruns nightly until everyone's placed or "
    "the window closes.",

    "<b>Move-in window (early June):</b> keys swap, deposits stay in "
    "escrow. Each student does a quick check-in survey (place matches "
    "listing? any issues?). Disputes flagged here trigger admin review.",

    "<b>Mid-summer dropout protection:</b> if someone bails, the "
    "platform re-runs the matcher to find a single-node substitute "
    "from a standby pool. If no substitute, the cycle &ldquo;unwinds&rdquo; "
    "— escrowed deposits cover the displaced parties' Airbnb fallback.",

    "<b>Move-out (mid-August):</b> confirm checkout, deposits released, "
    "both parties leave a one-line review that builds the portable "
    "reputation score.",

    "<b>Post-summer:</b> matched students keep their reputation, "
    "become eligible for the next cycle (winter sublets, study-abroad, "
    "new internships). Network compounds.",
]

for i, item in enumerate(flow, start=1):
    story.append(step(i, item))

# Money
story.append(Paragraph("Where money sits", section_style))
story.append(Paragraph(
    "<b>Coordination fee:</b> $150/student × matched users (revenue).",
    body_style,
))
story.append(Paragraph(
    "<b>Escrow deposit:</b> $500/student, held until move-out, refunded "
    "if no disputes (liability, not revenue).",
    body_style,
))

# People & infra
story.append(Paragraph("Where people sit", section_style))
story.append(Paragraph(
    "<b>Frontend:</b> the website you've seen.",
    body_style,
))
story.append(Paragraph(
    "<b>Backend (today):</b> Airtable + Vercel functions. "
    "<b>Production:</b> Postgres, Stripe Connect for escrow, Resend or "
    "SendGrid for email, an admin dashboard for the manual review queue.",
    body_style,
))
story.append(Paragraph(
    "<b>Operations team:</b> 1 part-time admin to handle disputes and "
    "lease-consent uploads. Scales sublinearly with users.",
    body_style,
))

# Closing line
story.append(Spacer(1, 8))
story.append(Paragraph(
    "<b>The product thesis in one line:</b> we&rsquo;re not a listings "
    "site &mdash; we&rsquo;re a coordination layer that runs once a "
    "year and moves a thousand students at the same time.",
    emphasis_style,
))

doc.build(story)
print("Wrote:", OUT)
