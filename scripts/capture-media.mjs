/**
 * Capture real screenshots, a storyboarded screen recording, a GIF loop and a
 * social card from the production build served at
 * http://localhost:4173/evidence-os-inspector/ (npm run build:pages && npm run preview:pages).
 *
 * Output: media-raw/ (gitignored). Copy the reviewed files to docs/media and public/media.
 * Requires ffmpeg on PATH for mp4/gif conversion.
 */
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const base = process.env.EOSI_BASE ?? 'http://localhost:4173/evidence-os-inspector/'
const out = process.argv[2] ?? 'media-raw'
mkdirSync(out, { recursive: true })
mkdirSync(path.join(out, 'video'), { recursive: true })

const browser = await chromium.launch()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function installCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__cursor')) return
    const c = document.createElement('div')
    c.id = '__cursor'
    Object.assign(c.style, {
      position: 'fixed', left: '40px', top: '40px', width: '18px', height: '18px', borderRadius: '50%',
      background: 'rgba(31,95,139,0.85)', border: '2px solid #fff', boxShadow: '0 0 0 3px rgba(31,95,139,0.25)',
      zIndex: '99999', pointerEvents: 'none', transition: 'left 420ms ease, top 420ms ease, transform 120ms ease',
      transform: 'translate(-50%,-50%)',
    })
    document.body.appendChild(c)
  })
}

async function moveTo(page, locator) {
  const box = await locator.boundingBox()
  if (!box) return
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.evaluate(([x, y]) => {
    const c = document.getElementById('__cursor')
    if (c) {
      c.style.left = `${x}px`
      c.style.top = `${y}px`
    }
  }, [x, y])
  await sleep(480)
}

async function click(page, locator) {
  await moveTo(page, locator)
  await page.evaluate(() => {
    const c = document.getElementById('__cursor')
    if (c) c.style.transform = 'translate(-50%,-50%) scale(0.7)'
  })
  await locator.click()
  await sleep(140)
  await page.evaluate(() => {
    const c = document.getElementById('__cursor')
    if (c) c.style.transform = 'translate(-50%,-50%) scale(1)'
  })
}

// ---------------------------------------------------------------------------
// 1. Screenshots at 2x
// ---------------------------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(base)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/shot-landing.png` })

  await page.goto(base + '#demo/correction-impact')
  await page.getByTestId('claim-item-C1').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/shot-source-comparison.png` })

  await page.getByTestId('revise-source').click()
  await page.getByTestId('load-suggested-correction').click()
  await page.getByTestId('save-revision').click()
  await page.getByTestId('claim-item-C4').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/shot-change-impact.png` })

  // Report: capture the download, render it in a fresh page.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-report').click()])
  const reportPath = `${out}/demo-report.html`
  await dl.saveAs(reportPath)
  const rp = await ctx.newPage()
  await rp.goto('file://' + path.resolve(reportPath))
  await rp.waitForTimeout(300)
  await rp.screenshot({ path: `${out}/shot-report.png` })
  await ctx.close()
}

// ---------------------------------------------------------------------------
// 2. Storyboarded recording (timings drive the subtitle files)
// ---------------------------------------------------------------------------
const cues = [
  [0.0, 5.0, 'You wrote five sentences from three sources. Then source A publishes a correction.', '你根据三篇来源写了五句话。后来，来源 A 发布了更正。'],
  [5.0, 12.0, 'Each claim is bound to a passage in a specific source version, with a recorded review.', '每条主张都绑定到某个来源版本的具体片段，并带有记录在案的审阅。'],
  [12.0, 23.0, 'Revise source A. Inspector lists what is affected: C1 directly, C4 through a confirmed dependency. C2, C3, C5 are untouched.', '修订来源 A。Inspector 列出受影响的主张：C1 直接受影响，C4 经已确认的依赖受影响；C2、C3、C5 不受影响。'],
  [23.0, 28.5, 'C4 shows why: the claim it depends on, C1, needs re-review. Path C1 → C4.', 'C4 显示原因：它依赖的 C1 需复核。路径 C1 → C4。'],
  [28.5, 33.5, 'The earlier review stays in history. Nothing is flipped automatically.', '之前的审阅保留在历史中。没有任何结论被自动反转。'],
  [33.5, 40.0, 'Export a standalone report, or review your own text. Runs in the browser. No upload.', '导出独立报告，或审阅你自己的文字。在浏览器内运行，不上传。'],
]
function srt(lang) {
  const ts = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s - Math.floor(s)) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }
  return cues.map((c, i) => `${i + 1}\n${ts(c[0])} --> ${ts(c[1])}\n${lang === 'en' ? c[2] : c[3]}\n`).join('\n') + '\n'
}
writeFileSync(`${out}/demo-en.srt`, srt('en'))
writeFileSync(`${out}/demo-zh.srt`, srt('zh'))

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: `${out}/video`, size: { width: 1280, height: 800 } } })
  const page = await ctx.newPage()
  await page.goto(base)
  await installCursor(page)
  const t0 = Date.now()
  const until = async (sec) => {
    const wait = t0 + sec * 1000 - Date.now()
    if (wait > 0) await sleep(wait)
  }

  // 0-5: landing
  await until(1.0)
  await moveTo(page, page.getByTestId('try-demo-hero'))
  await until(4.2)
  await click(page, page.getByTestId('try-demo-hero'))
  await installCursor(page)
  // 5-12: claim + passage
  await until(5.5)
  await click(page, page.getByTestId('claim-item-C1'))
  await until(8.0)
  await moveTo(page, page.locator('[data-testid="source-text"] mark.own').first())
  // 12-23: revise
  await until(12.0)
  await click(page, page.getByTestId('revise-source'))
  await until(13.5)
  await click(page, page.getByTestId('load-suggested-correction'))
  await until(16.0)
  await click(page, page.getByTestId('save-revision'))
  await until(18.0)
  await moveTo(page, page.getByTestId('impact-indirect'))
  // 23-28.5: C4 reasons
  await until(23.0)
  await click(page, page.getByTestId('claim-item-C4'))
  await until(25.0)
  await moveTo(page, page.getByTestId('review-reasons'))
  // 28.5-33.5: C1 history
  await until(28.5)
  await click(page, page.getByTestId('claim-item-C1'))
  await until(30.0)
  await page.getByTestId('review-history').scrollIntoViewIfNeeded()
  await moveTo(page, page.getByTestId('review-history'))
  // 33.5-40: export + own text
  await until(33.5)
  await moveTo(page, page.getByTestId('export-report'))
  await until(35.0)
  await Promise.all([page.waitForEvent('download'), click(page, page.getByTestId('export-report'))])
  await until(37.0)
  await page.evaluate(() => { window.location.hash = '' })
  await page.waitForTimeout(200)
  await installCursor(page)
  await moveTo(page, page.getByTestId('review-own-text'))
  await until(40.5)
  const video = page.video()
  await ctx.close()
  const p = await video.path()
  renameSync(p, `${out}/demo-raw.webm`)
}

// ---------------------------------------------------------------------------
// 3. Social card 1280x640 (real UI screenshot + typography)
// ---------------------------------------------------------------------------
{
  const shot = readFileSync(`${out}/shot-change-impact.png`).toString('base64')
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;width:1280px;height:640px;overflow:hidden;background:#fafaf8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1b1b1b;position:relative}
  .left{position:absolute;left:64px;top:64px;width:520px}
  .brand{font-size:22px;font-weight:700;color:#1f5f8b;letter-spacing:.01em}
  h1{font-size:44px;line-height:1.1;margin:18px 0 16px;letter-spacing:-.01em}
  p{font-size:20px;line-height:1.4;margin:0 0 14px;color:#333}
  .tags{font-size:16px;color:#5c5c5c}
  .badge{display:inline-block;border:1px solid #c99400;background:#fff4d6;color:#5a4300;border-radius:10px;padding:2px 10px;font-size:14px;font-weight:600;margin-top:16px}
  .shot{position:absolute;left:620px;top:60px;width:720px;border:1px solid #dcdcd6;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.12);overflow:hidden;background:#fff}
  .shot img{width:1280px;display:block;transform:scale(.5625);transform-origin:top left}
  .url{position:absolute;left:64px;bottom:48px;font-size:18px;color:#1f5f8b}
  </style></head><body>
  <div class="left"><div class="brand">Evidence OS Inspector</div>
  <h1>See what changes when your evidence changes.</h1>
  <p>Trace claims to source passages, record reviews, and see which claims need another look when a source changes.</p>
  <div class="tags">Runs in your browser · No account · No upload · MIT · v0.1 alpha</div>
  <div class="badge">Synthetic demo shown</div></div>
  <div class="shot"><img src="data:image/png;base64,${shot}" alt=""></div>
  <div class="url">yinchuan123.github.io/evidence-os-inspector</div>
  </body></html>`
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.setContent(html)
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${out}/social-card.png` })
  await ctx.close()
}

await browser.close()

// ---------------------------------------------------------------------------
// 4. ffmpeg: mp4 with burned-in subtitles (en, zh), plain mp4, gif loop
// ---------------------------------------------------------------------------
function ff(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
}
const raw = `${out}/demo-raw.webm`
if (existsSync(raw)) {
  ff(['-i', raw, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', `${out}/demo.mp4`])
  const sub = (srtFile, extra) => `subtitles=${srtFile}:force_style='FontSize=22,Outline=1,Shadow=0,MarginV=30,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=4${extra}'`
  ff(['-i', raw, '-vf', sub(`${out}/demo-en.srt`, ''), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', `${out}/demo-en.mp4`])
  ff(['-i', raw, '-vf', sub(`${out}/demo-zh.srt`, ',FontName=PingFang SC'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', `${out}/demo-zh.mp4`])
  // GIF loop: the revision-to-impact segment, 8 fps, 960px wide, reduced palette.
  ff(['-ss', '11', '-t', '17', '-i', raw, '-vf', 'fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', '-loop', '0', `${out}/demo-loop.gif`])
}

for (const f of ['shot-landing.png', 'shot-source-comparison.png', 'shot-change-impact.png', 'shot-report.png', 'social-card.png', 'demo-raw.webm', 'demo.mp4', 'demo-en.mp4', 'demo-zh.mp4', 'demo-loop.gif']) {
  const p = `${out}/${f}`
  if (existsSync(p)) console.log(`${f}\t${(statSync(p).size / 1024).toFixed(0)} KB`)
  else console.log(`${f}\tMISSING`)
}
