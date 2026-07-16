# SAR Formatting & PDF Export Guide

## Overview

The current SAR displays as **plain Markdown text**. We've created an **improved HTML template** with professional formatting, color-coding, and **direct PDF export capability**.

---

## What's Changed

### Before (Current)
```
# SUSPICIOUS ACTIVITY REPORT (SAR) - INTEL REPORT
**CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE...**
## 1. Executive Summary
* **Target Company**: Acme Corp
* **Jurisdiction**: USA
[... 2000+ characters of unformatted text ...]
```

### After (Proposed)
✅ Professional header with gradient + classification  
✅ Risk score displayed with color-coding (RED for HIGH, ORANGE for MEDIUM, GREEN for LOW)  
✅ Organized meta grid (company info at a glance)  
✅ Numbered sections with visual hierarchy  
✅ Timeline with visual indicators  
✅ Alert boxes for key findings  
✅ Tables for sanctions/contamination findings  
✅ One-click PDF download  
✅ Print-friendly styling  

---

## Files Created

### 1. **Backend Template**
`backend/app/templates/sar_template_html.html`
- Professional HTML template
- CSS styling (self-contained, no external dependencies)
- Responsive layout
- Print-optimized

### 2. **Preview Artifact**
Live preview showing formatted SAR: https://claude.ai/code/artifact/85c62200-2537-49bd-9e34-322139adc351

---

## Implementation (4 Steps)

### Step 1: Update Backend to Generate HTML

Currently, the system renders Markdown → PDF. We need to:
1. Generate formatted HTML instead
2. Keep Markdown for database storage (backward compatible)
3. Render HTML when displaying in UI
4. Keep PDF export using xhtml2pdf

**File to modify:** `backend/app/services/sar_pdf_service.py`

**Current approach:**
```python
def build_sar_pdf(sar: SARReport, company_name: str) -> bytes:
    narrative_md = sar.narrative  # Stored as Markdown
    narrative_html = markdown.markdown(narrative_md)  # Convert to basic HTML
    # Render to PDF
```

**New approach:**
```python
def build_sar_pdf(sar: SARReport, company: Company, audit_result: AuditResult) -> bytes:
    """Render SAR as professional HTML PDF with color-coded risk, timeline, evidence."""
    
    # Parse narrative Markdown (still stored as MD in DB)
    narrative_md = sar.narrative or ""
    
    # Build structured HTML from audit data + narrative
    html = render_sar_html(
        company=company,
        narrative=narrative_md,
        audit_result=audit_result,
        sar=sar
    )
    
    # Render to PDF
    return pisa.CreatePDF(html, ...)
```

### Step 2: Create HTML Rendering Service

**New file:** `backend/app/services/sar_html_builder.py`

```python
"""Render SAR as professional HTML for display and PDF export."""

from typing import Optional
from app.models import Company, SARReport
from app.orchestrator.audit_result import AuditResult
import html

def render_sar_html(
    company: Company,
    narrative: str,
    audit_result: AuditResult,
    sar: SARReport
) -> str:
    """Build complete HTML SAR document."""
    
    # Color-code risk level
    risk_class = _risk_to_class(audit_result.risk_level)
    
    # Format timeline with timestamps
    timeline_html = _build_timeline_html(audit_result)
    
    # Format evidence tables
    sanctions_html = _build_sanctions_table(audit_result.sanctions_alerts)
    contamination_html = _build_contamination_table(audit_result.contamination_alerts)
    
    # Format directors list
    directors_html = _build_directors_html(audit_result.directors)
    
    # Fill template
    template = load_sar_template()
    
    html_output = template.format(
        company_name=html.escape(company.legal_name),
        jurisdiction=html.escape(company.jurisdiction or "Unknown"),
        registration_number=html.escape(company.registration_number or "N/A"),
        industry=html.escape(company.industry or "N/A"),
        risk_level=audit_result.risk_level.upper(),
        risk_level_class=risk_class,
        risk_score=audit_result.risk_score,
        trigger_reason=html.escape(audit_result.trigger_type),
        analyst_recommendation=_get_recommendation(audit_result),
        filing_date=audit_result.created_at.strftime("%Y-%m-%d"),
        subject_directors_list=directors_html,
        timeline_events_html=timeline_html,
        sanctions_findings_details=sanctions_html,
        contamination_findings_details=contamination_html,
        risk_rationale=html.escape(audit_result.rationale_summary or ""),
        analyst_rationale="Automatically generated based on pre-processed watchlist matching and risk assessment.",
        confidence_score=audit_result.entity_confidence,
        narrative_summary_text=html.escape(narrative[:500]),
        generated_date=datetime.now().strftime("%B %d, %Y")
    )
    
    return html_output


def _build_timeline_html(audit_result: AuditResult) -> str:
    """Convert timeline events to HTML with timestamps and visual indicators."""
    items = []
    for event in audit_result.timeline_events_data:
        date = event.get("occurred_at", "Unknown")
        desc = html.escape(event.get("description", ""))
        items.append(f"""
            <div class="timeline-item">
                <div class="timeline-date">{date}</div>
                <div class="timeline-content">{desc}</div>
            </div>
        """)
    return "\n".join(items) or "<p>No events recorded.</p>"


def _build_sanctions_table(sanctions: list) -> str:
    """Render sanctions matches as professional table."""
    if not sanctions:
        return "<p><strong>Status:</strong> No sanctions matches found.</p>"
    
    rows = []
    for s in sanctions:
        rows.append(f"""
            <tr>
                <td>{html.escape(s['name'])}</td>
                <td>{html.escape(s['source'])}</td>
                <td>{int(s['resolution_score'])}%</td>
            </tr>
        """)
    
    return f"""
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Source List</th>
                    <th>Confidence</th>
                </tr>
            </thead>
            <tbody>
                {"".join(rows)}
            </tbody>
        </table>
    """


def _build_contamination_table(contamination: list) -> str:
    """Render cross-company director links as table."""
    if not contamination:
        return "<p><strong>Status:</strong> No cross-company director contamination detected.</p>"
    
    rows = []
    for c in contamination:
        rows.append(f"""
            <tr>
                <td><strong>{html.escape(c['director_name'])}</strong></td>
                <td>{html.escape(c['linked_company_name'])}</td>
                <td>{html.escape(c['linked_company_jurisdiction'])}</td>
                <td style="color: {'#e74c3c' if c['linked_company_risk'] == 'high' else '#f39c12'}; font-weight: 600;">
                    {c['linked_company_risk'].upper()}
                </td>
            </tr>
        """)
    
    return f"""
        <table>
            <thead>
                <tr>
                    <th>Director Name</th>
                    <th>Also Listed At</th>
                    <th>Jurisdiction</th>
                    <th>Risk Level</th>
                </tr>
            </thead>
            <tbody>
                {"".join(rows)}
            </tbody>
        </table>
    """


def _build_directors_html(directors: list) -> str:
    """Format directors list."""
    if not directors:
        return "<p>No directors listed.</p>"
    
    items = []
    for d in directors:
        items.append(f"<li><strong>Name:</strong> {html.escape(d.full_name)} | <strong>Nationality:</strong> {html.escape(d.nationality or 'Unknown')}</li>")
    
    return f"<ul>{''.join(items)}</ul>"


def _risk_to_class(risk_level: str) -> str:
    """Map risk level to CSS class."""
    return {
        "high": "alert",
        "medium": "warning",
        "low": "safe",
    }.get(risk_level.lower(), "info")


def _get_recommendation(audit_result: AuditResult) -> str:
    """Determine analyst recommendation."""
    if audit_result.risk_level == "high":
        return "Reject Onboarding"
    elif audit_result.risk_level == "medium":
        return "Escalate to Manual Review"
    else:
        return "Approve Onboarding"


def load_sar_template() -> str:
    """Load HTML template from file."""
    with open("app/templates/sar_template_html.html", "r") as f:
        return f.read()
```

### Step 3: Update PDF Generation Service

**File:** `backend/app/services/sar_pdf_service.py`

Replace the simple Markdown rendering with HTML:

```python
def build_sar_pdf(sar: SARReport, company: Company, audit_result: Optional[AuditResult] = None) -> bytes:
    """Build professional PDF from SAR report."""
    from app.services.sar_html_builder import render_sar_html
    
    # If audit_result provided, use structured HTML builder
    if audit_result:
        html_content = render_sar_html(
            company=company,
            narrative=sar.narrative or "",
            audit_result=audit_result,
            sar=sar
        )
    else:
        # Fallback: render stored narrative as Markdown
        narrative_md = sar.narrative or ""
        narrative_html = markdown.markdown(narrative_md)
        html_content = f"""
            <html><head><style>{_STYLES}</style></head>
            <body>
                <div id="header_band">
                    <div class="brand">KYC AUDITOR</div>
                    <div class="subtitle">Suspicious Activity Report</div>
                </div>
                {narrative_html}
            </body>
            </html>
        """
    
    buffer = BytesIO()
    result = pisa.CreatePDF(src=html_content, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"PDF rendering failed for SAR {sar.id}")
    
    return buffer.getvalue()
```

### Step 4: Update Frontend to Display HTML Preview

**File:** `frontend/src/pages/SarReviewPage.tsx` (or similar)

```tsx
// Show formatted SAR preview + download button
<div className="sar-container">
    {/* HTML Preview */}
    <div className="sar-preview">
        <iframe
            srcDoc={sarHtmlPreview}
            style={{ width: "100%", height: "600px", border: "1px solid #ccc" }}
        />
    </div>

    {/* Download Button */}
    <button onClick={() => downloadPdfSAR(sar.id)}>
        📥 Download as PDF
    </button>
</div>

// Download handler
const downloadPdfSAR = async (sarId: string) => {
    const response = await fetch(`/reports/sar/${sarId}/pdf`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAR-${sarId.substring(0, 8)}.pdf`;
    a.click();
};
```

---

## Display Options

### Option 1: Browser Print-to-PDF (Current + Simple)
- No backend changes needed
- Works today
- Users click "Print" button → "Save as PDF"
- Limited formatting control

### Option 2: Server-Side PDF Generation (Recommended)
- Uses xhtml2pdf (already installed)
- Professional formatting
- Watermarks, headers, footers
- One-click download
- Works offline

### Option 3: Client-Side PDF Generation
- Library: `jsPDF` or `html2pdf.js`
- Runs in browser
- No server load
- May have formatting differences

**Recommendation:** Use Option 2 (server-side) for consistency and compliance

---

## API Changes

### Current
```bash
GET /reports/sar/{sar_id}/pdf
# Returns: PDF bytes
```

### Updated
```bash
GET /reports/sar/{sar_id}/pdf?format=pdf
# Returns: PDF bytes (formatted HTML)

GET /reports/sar/{sar_id}/html
# Returns: HTML for preview in browser
```

---

## Database Schema (No Changes)

The `SARReport.narrative` field remains **Markdown** for storage. We convert it to HTML at display time:

```sql
-- No schema changes needed
-- narrative TEXT field stores Markdown
-- HTML rendering happens at display time (read-only transformation)
```

---

## Visual Improvements Summary

| Element | Before | After |
|---------|--------|-------|
| **Header** | Plain text | Gradient background, classification badge |
| **Meta Info** | Bullet list | Color-coded grid layout |
| **Risk Score** | Text | Color-coded badge (RED/ORANGE/GREEN) |
| **Sections** | Numbered but plain | Numbered circles, color borders |
| **Timeline** | Text list | Visual timeline with dots |
| **Tables** | None | Professional tables for sanctions/contamination |
| **Evidence** | Inline text | Structured sections with alerts |
| **PDF Export** | Manual print dialog | One-click download button |
| **Print Layout** | Basic | Optimized for A4 pages |

---

## Rollout Plan

### Week 1: Backend
- [ ] Create `sar_html_builder.py`
- [ ] Update `sar_pdf_service.py`
- [ ] Deploy (non-breaking — PDF just looks better)
- [ ] Test PDF download from existing SARs

### Week 2: Frontend
- [ ] Add HTML preview iframe
- [ ] Add "Download PDF" button
- [ ] Style preview container
- [ ] Test on existing SARs

### Week 3: Polish
- [ ] Fine-tune colors, fonts, spacing
- [ ] Add print styles test
- [ ] Compliance review (ensure classification marks are prominent)
- [ ] Performance test (PDF generation time)

---

## FAQ

**Q: Will this break existing SARs stored in the database?**  
A: No. Markdown narratives remain unchanged. HTML rendering happens at display time.

**Q: Do we need to regenerate all SARs?**  
A: No. Existing Markdown SARs will render with basic HTML styling. Only new SARs get the full formatting.

**Q: Can officers still print SARs?**  
A: Yes. The PDF is optimized for printing (no backgrounds in print mode, page breaks handled).

**Q: What if xhtml2pdf fails?**  
A: Fallback to simple Markdown rendering. Users get text, not formatted PDF, but nothing breaks.

**Q: Can we customize colors per jurisdiction or compliance rules?**  
A: Yes. The template uses CSS variables (can be updated in `_STYLES`). Add a config endpoint to customize.

---

## Testing Checklist

- [ ] PDF generates without errors
- [ ] All sections populate correctly (timeline, evidence, contamination, etc.)
- [ ] Risk score color matches risk level
- [ ] Timestamps format correctly
- [ ] Special characters (é, ñ, ü, etc.) render correctly
- [ ] PDF file size is reasonable (<5 MB)
- [ ] Print preview shows no double formatting
- [ ] Page breaks occur at logical points (no mid-section breaks)
- [ ] Links in PDF are clickable (if included)
- [ ] Watermark "DRAFT" visible on draft SARs

---

## Code Examples

### Generate Formatted PDF Directly

```python
from app.services.sar_html_builder import render_sar_html
from app.services.sar_pdf_service import build_sar_pdf

# Get data
sar = db.get(SARReport, sar_id)
company = db.get(Company, sar.company_id)
audit_result = load_audit_result_from_sar(sar)  # Reconstruct from stored data

# Generate PDF
pdf_bytes = build_sar_pdf(sar, company, audit_result)

# Return as download
return Response(
    content=pdf_bytes,
    media_type="application/pdf",
    headers={"Content-Disposition": f'attachment; filename="SAR-{sar.id[:8]}.pdf"'}
)
```

### Display Preview in Browser

```python
@router.get("/sar/{sar_id}/preview")
def preview_sar(sar_id: uuid.UUID, db: Session = Depends(get_db)):
    """Return HTML preview of SAR for browser display."""
    sar = db.get(SARReport, sar_id)
    company = db.get(Company, sar.company_id)
    audit_result = load_audit_result_from_sar(sar)
    
    html = render_sar_html(
        company=company,
        narrative=sar.narrative or "",
        audit_result=audit_result,
        sar=sar
    )
    
    return HTMLResponse(content=html)
```

---

## Live Preview

See the formatted SAR in action: https://claude.ai/code/artifact/85c62200-2537-49bd-9e34-322139adc351

(Click "Download as PDF" or use browser print-to-PDF to save)

---

## Next Steps

1. **Review** the preview artifact above
2. **Decide** which implementation option (server-side recommended)
3. **Assign** Week 1–3 tasks
4. **Deploy** progressively (backend → frontend → polish)

Questions? See the code examples above or refer to the preview artifact.
