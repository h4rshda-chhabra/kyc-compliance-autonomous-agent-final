"""Render a SAR report as a formatted PDF document.

SAR narratives are stored as Markdown (see orchestrator._build_sar_narrative),
so the download path converts Markdown -> HTML -> PDF. xhtml2pdf only supports
a CSS subset; the stylesheet below sticks to properties it renders reliably.
"""

import html
from datetime import UTC, datetime
from io import BytesIO

import markdown
from xhtml2pdf import pisa

from app.models import SARReport

_STYLES = """
@page {
    size: a4 portrait;
    margin: 2cm 2cm 2.4cm 2cm;
    @frame footer_frame {
        -pdf-frame-content: footer_content;
        left: 56pt;
        width: 483pt;
        top: 800pt;
        height: 26pt;
    }
}
body { font-family: Helvetica; font-size: 10.5pt; color: #171d1a; }
#header_band { background-color: #121413; padding: 16pt; }
#header_band .brand { color: #4edea3; font-size: 16pt; font-weight: bold; }
#header_band .subtitle { color: #e2e3e0; font-size: 11pt; }
#footer_content { color: #86948a; font-size: 8pt; }
table.meta { margin-top: 14pt; }
table.meta td { border: 0; padding: 3pt 12pt 3pt 0; }
table.meta td.label { color: #586259; font-size: 8.5pt; font-weight: bold; }
h1 { font-size: 15pt; margin: 16pt 0 6pt 0; }
h2 { font-size: 12.5pt; margin: 14pt 0 5pt 0; border-bottom: 0.6pt solid #3c4a42; padding-bottom: 3pt; }
h3 { font-size: 11pt; margin: 10pt 0 4pt 0; }
p { margin: 5pt 0; line-height: 1.45; }
li { margin: 2pt 0; }
hr { color: #3c4a42; }
table { border-collapse: collapse; margin: 6pt 0; }
th, td { border: 0.6pt solid #9aa79e; padding: 4pt 6pt; font-size: 9.5pt; }
th { background-color: #eef2ef; font-weight: bold; }
"""


def _meta_row(label: str, value: str) -> str:
    return f'<tr><td class="label">{html.escape(label.upper())}</td>' f"<td>{html.escape(value)}</td></tr>"


def build_sar_pdf(sar: SARReport, company_name: str) -> bytes:
    """Render one SAR row (plus its company's legal name) to PDF bytes."""
    narrative_md = (sar.narrative or "").strip()
    if narrative_md:
        narrative_html = markdown.markdown(narrative_md, extensions=["tables", "sane_lists", "fenced_code"])
    else:
        narrative_html = "<p>No narrative has been drafted for this report.</p>"

    meta_rows = [
        _meta_row("Report ID", str(sar.id)),
        _meta_row("Legal company name", company_name),
        _meta_row("Report status", sar.status.replace("_", " ")),
        _meta_row("Created", sar.created_at.strftime("%d %B %Y, %H:%M UTC")),
    ]
    if sar.filed_at:
        meta_rows.append(_meta_row("Filed", sar.filed_at.strftime("%d %B %Y, %H:%M UTC")))

    generated_on = datetime.now(UTC).strftime("%d %B %Y")
    document = f"""
<html>
<head><style>{_STYLES}</style></head>
<body>
    <div id="header_band">
        <div class="brand">KYC AUDITOR</div>
        <div class="subtitle">Suspicious Activity Report &mdash; Confidential</div>
    </div>
    <table class="meta">{"".join(meta_rows)}</table>
    <hr/>
    {narrative_html}
    <div id="footer_content">
        Continuous KYC Autonomous Auditor &mdash; generated {generated_on} &mdash;
        page <pdf:pagenumber/> of <pdf:pagecount/>
    </div>
</body>
</html>
"""

    buffer = BytesIO()
    result = pisa.CreatePDF(src=document, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"SAR PDF rendering failed for report {sar.id}")
    return buffer.getvalue()
