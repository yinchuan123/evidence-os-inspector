/**
 * Render the 1280x640 social card from the real change-impact screenshot.
 * Usage: node scripts/social-card.mjs media-raw
 * Output must stay under 1 MB (GitHub social preview limit).
 */
import { chromium } from '@playwright/test'
import { readFileSync, statSync } from 'node:fs'

const out = process.argv[2] ?? 'media-raw'
const shot = readFileSync(`${out}/shot-change-impact.png`).toString('base64')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1280px;height:640px;overflow:hidden;background:#fafaf8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1b1b1b;position:relative}
.left{position:absolute;left:64px;top:56px;width:520px}
.brand{font-size:22px;font-weight:700;color:#1f5f8b}
h1{font-size:44px;line-height:1.1;margin:16px 0 16px;letter-spacing:-.01em}
p{font-size:20px;line-height:1.4;margin:0 0 14px;color:#333}
ul{margin:0 0 14px;padding-left:22px;font-size:17px;line-height:1.5;color:#333}
.tags{font-size:16px;color:#5c5c5c}
.badge{display:inline-block;border:1px solid #c99400;background:#fff4d6;color:#5a4300;border-radius:10px;padding:2px 10px;font-size:14px;font-weight:600;margin-top:14px}
.shot{position:absolute;left:624px;top:56px;width:600px;height:528px;border:1px solid #dcdcd6;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.12);overflow:hidden;background:#fff}
.shot img{width:2560px;display:block;transform:scale(.46);transform-origin:top left;margin-left:-12px}
.url{position:absolute;left:64px;bottom:44px;font-size:18px;color:#1f5f8b}
</style></head><body>
<div class="left"><div class="brand">Evidence OS Inspector</div>
<h1>See what changes when your evidence changes.</h1>
<p>Trace claims to source passages, record reviews, and see which claims need another look when a source changes.</p>
<ul><li>Source A is corrected: C1 and C4 need re-review, C2, C3, C5 do not</li><li>Passage, review and history kept together</li><li>Runs in your browser. No account, no upload.</li></ul>
<div class="tags">MIT license · v0.1 alpha · English / 中文</div>
<div class="badge">Synthetic demo shown</div></div>
<div class="shot"><img src="data:image/png;base64,${shot}" alt=""></div>
<div class="url">yinchuan123.github.io/evidence-os-inspector</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 })
await page.setContent(html)
await page.waitForTimeout(200)
await page.screenshot({ path: `${out}/social-card.png` })
await browser.close()
const kb = statSync(`${out}/social-card.png`).size / 1024
console.log(`social-card.png\t${kb.toFixed(0)} KB${kb > 1000 ? '  (OVER 1 MB LIMIT)' : ''}`)
