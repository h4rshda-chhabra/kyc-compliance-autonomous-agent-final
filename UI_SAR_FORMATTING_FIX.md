# UI SAR Narrative Formatting Fix

## Problem

SAR narrative is stored as **Markdown** but displays as **plain text** in the UI:

```
# SUSPICIOUS ACTIVITY REPORT (SAR)...
**CONFIDENTIAL**...
## 1. Executive Summary
* **Target Company**: Vostok Shipping Agency
...
```

Shows up as:
```
# SUSPICIOUS ACTIVITY REPORT (SAR)...
**CONFIDENTIAL**...
## 1. Executive Summary
* **Target Company**: Vostok Shipping Agency
```

❌ No formatting, no hierarchy, hard to read

---

## Solution

Add **Markdown rendering** to the frontend so it displays as:

```
SUSPICIOUS ACTIVITY REPORT (SAR)
CONFIDENTIAL

1. Executive Summary
   • Target Company: Vostok Shipping Agency
   • Risk Score / Level: 100.0 / HIGH
   ...
```

✅ Proper headings, bold, lists, hierarchy

---

## Implementation (2 Options)

### Option 1: React Markdown (Recommended)

**Install:**
```bash
npm install react-markdown
```

**Use in SAR review component:**

```tsx
// frontend/src/pages/SarReviewPage.tsx (or SarDetailPage.tsx)

import ReactMarkdown from 'react-markdown';
import styles from './SarReviewPage.module.css';

export function SarReviewPage() {
  const [sar, setSar] = useState<SARReport | null>(null);

  useEffect(() => {
    // Fetch SAR
    fetchSAR(sarId).then(setSar);
  }, [sarId]);

  if (!sar) return <div>Loading...</div>;

  return (
    <div className={styles.sarContainer}>
      <div className={styles.header}>
        <h1>SAR {sar.id.substring(0, 8)}</h1>
        <span className={styles.badge}>{sar.status}</span>
      </div>

      {/* Narrative with Markdown rendering */}
      <div className={styles.narrative}>
        <ReactMarkdown 
          components={{
            h1: ({node, ...props}) => <h1 className={styles.h1} {...props} />,
            h2: ({node, ...props}) => <h2 className={styles.h2} {...props} />,
            h3: ({node, ...props}) => <h3 className={styles.h3} {...props} />,
            p: ({node, ...props}) => <p className={styles.paragraph} {...props} />,
            ul: ({node, ...props}) => <ul className={styles.list} {...props} />,
            ol: ({node, ...props}) => <ol className={styles.orderedList} {...props} />,
            li: ({node, ...props}) => <li className={styles.listItem} {...props} />,
            strong: ({node, ...props}) => <strong className={styles.bold} {...props} />,
            em: ({node, ...props}) => <em className={styles.italic} {...props} />,
            table: ({node, ...props}) => <table className={styles.table} {...props} />,
            th: ({node, ...props}) => <th className={styles.th} {...props} />,
            td: ({node, ...props}) => <td className={styles.td} {...props} />,
          }}
        >
          {sar.narrative}
        </ReactMarkdown>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button onClick={() => downloadPDF(sar.id)}>
          📥 Download as PDF
        </button>
        <button onClick={() => handleRecommendDeactivation(sar.id)}>
          🚫 Recommend Deactivation
        </button>
        <button onClick={() => handleReject(sar.id)}>
          ❌ Reject
        </button>
      </div>
    </div>
  );
}
```

**CSS Styling:**

```css
/* frontend/src/pages/SarReviewPage.module.css */

.sarContainer {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.narrative {
  background: white;
  padding: 32px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  line-height: 1.8;
}

/* Headings */
.h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 24px 0 16px 0;
  color: #0f3460;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
}

.h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 20px 0 12px 0;
  color: #1a5f7a;
  border-left: 4px solid #3498db;
  padding-left: 12px;
}

.h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: #34495e;
}

/* Paragraphs */
.paragraph {
  margin: 12px 0;
  color: #2c3e50;
  line-height: 1.6;
}

/* Lists */
.list, .orderedList {
  margin: 12px 0 12px 20px;
  color: #2c3e50;
}

.listItem {
  margin: 6px 0;
  line-height: 1.5;
}

/* Emphasis */
.bold {
  font-weight: 700;
  color: #0f3460;
}

.italic {
  font-style: italic;
  color: #555;
}

/* Tables */
.table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}

.th {
  background-color: #ecf0f1;
  padding: 10px 12px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #bdc3c7;
  color: #34495e;
}

.td {
  padding: 10px 12px;
  border-bottom: 1px solid #ecf0f1;
  color: #2c3e50;
}

.table tr:hover {
  background-color: #f9f9f9;
}

/* Status badge */
.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: #fef5e7;
  color: #d68910;
}

.badge.high {
  background-color: #fadbd8;
  color: #c0392b;
}

.badge.medium {
  background-color: #fef5e7;
  color: #d68910;
}

.badge.low {
  background-color: #d5f4e6;
  color: #0e6251;
}
```

---

### Option 2: Marked.js (Lightweight Alternative)

**Install:**
```bash
npm install marked
```

**Use:**
```tsx
import { marked } from 'marked';

export function SarReviewPage() {
  const [sar, setSar] = useState<SARReport | null>(null);

  return (
    <div className={styles.narrative}>
      <div 
        dangerouslySetInnerHTML={{ 
          __html: marked(sar?.narrative || '') 
        }}
      />
    </div>
  );
}
```

⚠️ **Note:** `dangerouslySetInnerHTML` requires sanitization. Better to use React Markdown.

---

## File Structure

```
frontend/src/
├── pages/
│   ├── SarReviewPage.tsx          (← Update with markdown rendering)
│   └── SarReviewPage.module.css   (← Update with styles)
├── components/
│   ├── SarNarrative.tsx           (← New: reusable component)
│   └── SarNarrative.module.css    (← Styles)
```

---

## New Component (Optional but Recommended)

**Create:** `frontend/src/components/SarNarrative.tsx`

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './SarNarrative.module.css';

interface SarNarrativeProps {
  content: string;
}

export function SarNarrative({ content }: SarNarrativeProps) {
  return (
    <div className={styles.narrative}>
      <ReactMarkdown 
        components={{
          h1: ({node, ...props}) => <h1 className={styles.h1} {...props} />,
          h2: ({node, ...props}) => <h2 className={styles.h2} {...props} />,
          h3: ({node, ...props}) => <h3 className={styles.h3} {...props} />,
          p: ({node, ...props}) => <p className={styles.paragraph} {...props} />,
          ul: ({node, ...props}) => <ul className={styles.list} {...props} />,
          ol: ({node, ...props}) => <ol className={styles.orderedList} {...props} />,
          strong: ({node, ...props}) => <strong className={styles.bold} {...props} />,
          table: ({node, ...props}) => <table className={styles.table} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**Use in SAR page:**
```tsx
import { SarNarrative } from '@/components/SarNarrative';

export function SarReviewPage() {
  return (
    <div>
      <h1>SAR Review</h1>
      <SarNarrative content={sar.narrative} />
    </div>
  );
}
```

---

## Before & After

### Before
```
# SUSPICIOUS ACTIVITY REPORT...
**CONFIDENTIAL // LAW ENFORCEMENT...**
## 1. Executive Summary
* **Target Company**: Vostok Shipping Agency
* **Jurisdiction**: Russia
...
```

### After
```
SUSPICIOUS ACTIVITY REPORT

CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE

1. Executive Summary
   • Target Company: Vostok Shipping Agency
   • Jurisdiction: Russia
   • Risk Score / Level: 100.0 / HIGH
   ...
```

---

## Package.json Update

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-markdown": "^8.0.7"
  }
}
```

**Install:**
```bash
npm install react-markdown
```

---

## Testing

Test with different SAR narratives:

1. **With headings**: Verify h1, h2, h3 display correctly
2. **With lists**: Bullet points and numbered lists format properly
3. **With tables**: Sanctions/contamination tables render with borders
4. **With emphasis**: Bold and italic text show correct styling
5. **With links**: If narrative has links, they remain clickable
6. **Mobile**: Layout remains readable on small screens

---

## Quick Fix (5 Minutes)

If you want to implement this **right now**:

1. **Install:** `npm install react-markdown`
2. **Copy** the CSS above into your SAR page component
3. **Wrap** the narrative with `<ReactMarkdown>` component
4. **Test** by opening a SAR in the UI

---

## Long-term Improvements

1. **Add custom plugins**: footnotes, strikethrough, syntax highlighting
2. **Sanitize HTML**: Prevent XSS if narratives can include HTML
3. **Theme support**: Dark mode styling for markdown
4. **Export markdown**: Let officers export SAR as .md file
5. **Edit markdown**: Allow officers to edit narrative with live preview

---

## Files to Update

| File | Change | Priority |
|------|--------|----------|
| `SarReviewPage.tsx` | Add markdown rendering | ✅ High |
| `SarReviewPage.module.css` | Add styling for headings, lists, etc. | ✅ High |
| `package.json` | Add `react-markdown` | ✅ High |
| `SarNarrative.tsx` (new) | Reusable component | ⚠️ Medium |
| Dark mode CSS | Theme-aware styling | ⚠️ Medium |

---

## Implementation Checklist

- [ ] Install `react-markdown`: `npm install react-markdown`
- [ ] Add CSS styling to SAR page
- [ ] Wrap narrative with `<ReactMarkdown>` component
- [ ] Test with existing SARs
- [ ] Verify headings, lists, bold/italic render correctly
- [ ] Test on mobile
- [ ] Add to CI/CD (no breaking changes)

That's it! Your SARs will look professional and readable. 📋✨
