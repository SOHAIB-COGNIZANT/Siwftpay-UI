// Node.js script: converts DOCUMENTATION.md → DOCUMENTATION.html
// Run: node make-doc-pdf.js
// Then open DOCUMENTATION.html in Chrome/Edge and Ctrl+P → Save as PDF

const fs = require('fs')
const path = require('path')

const mdPath  = path.join(__dirname, 'DOCUMENTATION.md')
const outPath = path.join(__dirname, 'DOCUMENTATION.html')

let md = fs.readFileSync(mdPath, 'utf8')

// ── Markdown → HTML converter ──────────────────────────────────────────────

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function convertMd(text) {
  const lines = text.split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim()
      const langClass = lang ? ` class="language-${escHtml(lang)}"` : ''
      const codeLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(escHtml(lines[i]))
        i++
      }
      out.push(`<pre><code${langClass}>${codeLines.join('\n')}</code></pre>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push('<hr>')
      i++
      continue
    }

    // Headings
    const hm = line.match(/^(#{1,6})\s+(.*)$/)
    if (hm) {
      const level = hm[1].length
      const content = inlineConvert(hm[2])
      const id = hm[2].toLowerCase()
        .replace(/[^a-z0-9\s-]/g,'')
        .replace(/\s+/g,'-')
        .replace(/-+/g,'-')
        .replace(/^-|-$/g,'')
      out.push(`<h${level} id="${id}">${content}</h${level}>`)
      i++
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const bqLines = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${inlineConvert(bqLines.join(' '))}</blockquote>`)
      continue
    }

    // Table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[-| :]+\|/.test(lines[i+1])) {
      const headerCells = line.split('|').filter((_,idx,arr)=> idx>0 && idx<arr.length-1).map(c=>c.trim())
      i += 2 // skip header and separator
      const rows = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i].split('|').filter((_,idx,arr)=> idx>0 && idx<arr.length-1).map(c=>c.trim())
        rows.push(cells)
        i++
      }
      let tbl = '<table><thead><tr>'
      headerCells.forEach(c => { tbl += `<th>${inlineConvert(c)}</th>` })
      tbl += '</tr></thead><tbody>'
      rows.forEach(r => {
        tbl += '<tr>'
        r.forEach(c => { tbl += `<td>${inlineConvert(c)}</td>` })
        tbl += '</tr>'
      })
      tbl += '</tbody></table>'
      out.push(tbl)
      continue
    }

    // Unordered list
    if (/^(\s*)[-*+]\s/.test(line)) {
      const indent0 = line.match(/^(\s*)/)[1].length
      const listLines = []
      while (i < lines.length && (/^(\s*)[-*+]\s/.test(lines[i]) || /^(\s{2,})/.test(lines[i]))) {
        listLines.push(lines[i])
        i++
      }
      out.push(buildList(listLines))
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listLines = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listLines.push(lines[i])
        i++
      }
      let ol = '<ol>'
      listLines.forEach(l => {
        ol += `<li>${inlineConvert(l.replace(/^\d+\.\s/, ''))}</li>`
      })
      ol += '</ol>'
      out.push(ol)
      continue
    }

    // Blank line → paragraph break
    if (line.trim() === '') {
      out.push('')
      i++
      continue
    }

    // Regular paragraph
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' && !/^[#>|`-]/.test(lines[i]) && !/^\d+\./.test(lines[i]) && !/^[-*+]\s/.test(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length) {
      out.push(`<p>${inlineConvert(paraLines.join(' '))}</p>`)
    } else {
      i++
    }
  }

  return out.join('\n')
}

function buildList(lines) {
  let html = '<ul>'
  for (let j = 0; j < lines.length; j++) {
    const m = lines[j].match(/^(\s*)[-*+]\s(.*)$/)
    if (m) {
      const content = inlineConvert(m[2])
      // Check for sub-list
      const subLines = []
      while (j+1 < lines.length && /^\s{2,}[-*+]\s/.test(lines[j+1])) {
        j++
        subLines.push(lines[j].replace(/^\s{2}/, ''))
      }
      if (subLines.length) {
        html += `<li>${content}${buildList(subLines)}</li>`
      } else {
        html += `<li>${content}</li>`
      }
    }
  }
  html += '</ul>'
  return html
}

function inlineConvert(s) {
  // Bold + italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${escHtml(code)}</code>`)
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  // Line break
  s = s.replace(/  $/gm, '<br>')
  return s
}

const bodyHtml = convertMd(md)

// ── HTML template ──────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SwiftPay Frontend — Complete Documentation</title>
<style>
  /* Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --primary: #1d4ed8;
    --primary-light: #dbeafe;
    --primary-dark: #1e3a5f;
    --accent: #ea580c;
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-500: #6b7280;
    --gray-700: #374151;
    --gray-900: #111827;
    --green: #16a34a;
    --red: #dc2626;
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --mono: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { font-size: 13.5px; }

  body {
    font-family: var(--font);
    color: var(--gray-900);
    background: #fff;
    line-height: 1.7;
    padding: 0;
  }

  /* Cover page */
  .cover {
    background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #3b82f6 100%);
    color: white;
    padding: 80px 60px;
    page-break-after: always;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 32px;
  }
  .cover h1 {
    font-size: 42px;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 16px;
    border: none;
    padding: 0;
  }
  .cover-subtitle {
    font-size: 18px;
    opacity: 0.8;
    font-weight: 300;
    margin-bottom: 48px;
  }
  .cover-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 48px;
  }
  .cover-meta-item {
    background: rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 16px 20px;
  }
  .cover-meta-item .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.6;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .cover-meta-item .value {
    font-size: 14px;
    font-weight: 600;
  }
  .cover-footer {
    margin-top: 80px;
    opacity: 0.5;
    font-size: 11px;
    border-top: 1px solid rgba(255,255,255,0.2);
    padding-top: 20px;
  }

  /* Main content */
  .content {
    max-width: 900px;
    margin: 0 auto;
    padding: 60px 60px 80px;
  }

  /* Headings */
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--primary-dark);
    margin: 48px 0 16px;
    padding-bottom: 10px;
    border-bottom: 3px solid var(--primary-light);
    page-break-after: avoid;
  }
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--primary);
    margin: 36px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--gray-200);
    page-break-after: avoid;
  }
  h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--gray-900);
    margin: 24px 0 8px;
    page-break-after: avoid;
  }
  h4 { font-size: 13.5px; font-weight: 600; color: var(--gray-700); margin: 16px 0 6px; }
  h5, h6 { font-size: 13px; font-weight: 600; margin: 12px 0 4px; }

  /* Paragraph */
  p { margin: 8px 0 12px; }

  /* Code inline */
  code {
    font-family: var(--mono);
    font-size: 11.5px;
    background: var(--gray-100);
    color: #c7254e;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid var(--gray-200);
    white-space: nowrap;
  }

  /* Code block */
  pre {
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 10px;
    padding: 20px 24px;
    margin: 14px 0 18px;
    overflow-x: auto;
    font-size: 11.5px;
    line-height: 1.6;
    border: 1px solid #334155;
    page-break-inside: avoid;
  }
  pre code {
    font-family: var(--mono);
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font-size: inherit;
    white-space: pre;
  }

  /* Table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px;
    font-size: 12.5px;
    page-break-inside: avoid;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--gray-200);
  }
  thead tr { background: var(--primary); color: white; }
  thead th {
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  tbody tr:nth-child(even) { background: var(--gray-50); }
  tbody tr:hover { background: var(--primary-light); }
  td {
    padding: 9px 14px;
    border-bottom: 1px solid var(--gray-100);
    vertical-align: top;
    line-height: 1.5;
  }
  td code { font-size: 11px; }

  /* Lists */
  ul, ol {
    margin: 8px 0 12px 24px;
    padding: 0;
  }
  li { margin: 4px 0; line-height: 1.6; }
  li ul, li ol { margin: 4px 0 4px 20px; }

  /* Blockquote */
  blockquote {
    border-left: 4px solid var(--primary);
    background: var(--primary-light);
    margin: 14px 0;
    padding: 14px 20px;
    border-radius: 0 8px 8px 0;
    font-size: 13px;
    color: var(--primary-dark);
  }
  blockquote strong { color: var(--primary-dark); }

  /* HR */
  hr {
    border: none;
    border-top: 2px solid var(--gray-100);
    margin: 36px 0;
  }

  /* Links */
  a { color: var(--primary); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Strong / em */
  strong { font-weight: 600; color: var(--gray-900); }

  /* Module section title strip */
  h1[id^="module"] {
    background: linear-gradient(90deg, var(--primary-light) 0%, transparent 100%);
    padding: 12px 16px;
    border-radius: 8px;
    border: none;
    border-left: 4px solid var(--primary);
  }

  /* Toc styling */
  #table-of-contents + ol,
  #table-of-contents + ul {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 10px;
    padding: 20px 20px 20px 40px;
    font-size: 13px;
  }

  /* Print styles */
  @media print {
    html { font-size: 11px; }
    .cover { page-break-after: always; }
    .content { padding: 20px 30px; }
    h1 { page-break-before: always; margin-top: 0; }
    h1:first-of-type { page-break-before: avoid; }
    pre, table, blockquote { page-break-inside: avoid; }
    @page {
      margin: 15mm 15mm 18mm;
      size: A4;
    }
    @page :first { margin: 0; }
  }

  /* Page number footer via CSS (Chrome supports) */
  @page { @bottom-right { content: counter(page); font-family: var(--font); font-size: 10px; color: #9ca3af; } }
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover">
  <div class="cover-badge">Technical Documentation</div>
  <h1>SwiftPay Frontend<br>Developer Guide</h1>
  <div class="cover-subtitle">Complete module-by-module reference for the SwiftPay<br>international remittance platform frontend</div>
  <div class="cover-meta">
    <div class="cover-meta-item">
      <div class="label">Project</div>
      <div class="value">swiftpay-frontend v1.0.0</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Build Tool</div>
      <div class="value">Vite 5 + React 18</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Author</div>
      <div class="value">Ansh Shukla — Cognizant</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Backend Target</div>
      <div class="value">ASP.NET Core Web API</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Generated</div>
      <div class="value">${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Modules Covered</div>
      <div class="value">2.1 – 2.10 (All)</div>
    </div>
  </div>
  <div class="cover-footer">SwiftPay International Remittance Platform · Confidential</div>
</div>

<!-- Documentation Content -->
<div class="content">
${bodyHtml}
</div>

</body>
</html>`

fs.writeFileSync(outPath, html, 'utf8')
console.log('✅  Generated: DOCUMENTATION.html')
console.log('    Open in Chrome/Edge → Ctrl+P → Save as PDF')
console.log('    Print settings: A4, Margins: Default, ✅ Background graphics')
