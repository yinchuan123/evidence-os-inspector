/**
 * Generate public/docs/FAQ.html from docs/FAQ.md so the live FAQ can never drift
 * from the repository copy. Handles the small Markdown subset FAQ.md uses:
 * headings, **question** lines, paragraphs, ---, `code`, *emphasis*, [links](...).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const REPO = 'https://github.com/yinchuan123/evidence-os-inspector'
const md = readFileSync('docs/FAQ.md', 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text) {
  let out = ''
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g
  let last = 0
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('`')) out += `<code>${esc(t.slice(1, -1))}</code>`
    else if (t.startsWith('**')) out += `<strong>${esc(t.slice(2, -2))}</strong>`
    else if (t.startsWith('*')) out += `<em>${esc(t.slice(1, -1))}</em>`
    else {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      let url = href
      if (href === '#中文') url = '#zh'
      else if (href.startsWith('../')) url = `${REPO}/blob/main/${href.slice(3)}`
      if (!/^(https:\/\/|#)/.test(url)) throw new Error(`unsupported link in FAQ.md: ${href}`)
      const ext = url.startsWith('https://') ? ' rel="noopener noreferrer"' : ''
      out += `<a href="${esc(url)}"${ext}>${esc(label)}</a>`
    }
    last = m.index + t.length
  }
  return out + esc(text.slice(last))
}

const blocks = md.replace(/\r\n/g, '\n').split(/\n\s*\n/)
const body = []
for (const block of blocks) {
  const lines = block.split('\n')
  const first = lines[0].trim()
  if (first === '# FAQ' || /^\[中文\]\(#中文\)$/.test(first)) continue
  if (first === '---') continue
  if (first.startsWith('## ')) {
    const title = first.slice(3).trim()
    body.push(`<h2${title === '中文' ? ' id="zh"' : ''}>${inline(title)}</h2>`)
    continue
  }
  const q = first.match(/^\*\*(.+)\*\*$/)
  if (q) {
    body.push(`<h3>${inline(q[1])}</h3>`)
    const rest = lines.slice(1).join(' ').trim()
    if (rest) body.push(`<p>${inline(rest)}</p>`)
    continue
  }
  body.push(`<p>${inline(lines.join(' ').trim())}</p>`)
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self';">
<title>FAQ - Evidence OS Inspector</title>
<style>
:root{color-scheme:light}
body{margin:0 auto;max-width:820px;padding:24px 20px 60px;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;color:#1b1b1b;background:#fafaf8}
h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:36px 0 8px;border-bottom:1px solid #dcdcd6;padding-bottom:4px}
h3{font-size:16px;margin:20px 0 4px}p{margin:0 0 10px}a{color:#1f5f8b}code{font-family:ui-monospace,Menlo,monospace;font-size:13px}
.nav{font-size:14px;color:#5c5c5c;margin-bottom:20px}
</style>
</head>
<body>
<h1>FAQ</h1>
<div class="nav"><a href="../">Back to Evidence OS Inspector</a> · <a href="#zh">中文</a> · <a href="${REPO}" rel="noopener noreferrer">GitHub</a></div>
<!-- Generated from docs/FAQ.md by scripts/build-faq.mjs. Do not edit. -->
${body.join('\n')}
</body>
</html>
`
mkdirSync('public/docs', { recursive: true })
writeFileSync('public/docs/FAQ.html', html)
console.log(`FAQ.html generated (${body.filter((b) => b.startsWith('<h3')).length} questions)`)
