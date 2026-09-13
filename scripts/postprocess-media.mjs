/**
 * Post-process media-raw/demo-raw.webm produced by capture-media.mjs:
 *  - demo.mp4            plain H.264
 *  - demo-en.mp4         English captions burned in
 *  - demo-zh.mp4         Chinese captions burned in
 *  - demo-loop.gif       short loop of the revision -> impact segment
 *
 * Captions are rendered by the browser to transparent PNGs and composited
 * with ffmpeg's overlay filter, so no libass/fontconfig is required.
 */
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'

const out = process.argv[2] ?? 'media-raw'
const raw = `${out}/demo-raw.webm`
if (!existsSync(raw)) throw new Error(`missing ${raw}`)
mkdirSync(`${out}/cues`, { recursive: true })

function parseSrt(text) {
  const blocks = text.trim().split(/\n\s*\n/)
  return blocks.map((b) => {
    const lines = b.split('\n')
    const [a, c] = lines[1].split(' --> ')
    const toSec = (t) => {
      const [hms, ms] = t.split(',')
      const [h, m, s] = hms.split(':').map(Number)
      return h * 3600 + m * 60 + s + Number(ms) / 1000
    }
    return { start: toSec(a), end: toSec(c), text: lines.slice(2).join('\n') }
  })
}

const W = 1280
const H = 800
const CUE_H = 120

async function renderCues(lang, cues) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: CUE_H }, deviceScaleFactor: 1 })
  const files = []
  for (let i = 0; i < cues.length; i++) {
    const esc = cues[i].text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;background:transparent;width:${W}px;height:${CUE_H}px;overflow:hidden}
      .wrap{position:absolute;left:0;right:0;bottom:14px;display:flex;justify-content:center}
      .cue{max-width:1040px;background:rgba(0,0,0,.72);color:#fff;font:600 24px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;padding:10px 18px;border-radius:8px;text-align:center}
    </style></head><body><div class="wrap"><div class="cue">${esc}</div></div></body></html>`)
    const f = `${out}/cues/${lang}-${i}.png`
    await page.screenshot({ path: f, omitBackground: true })
    files.push(f)
  }
  await browser.close()
  return files
}

function ff(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
}

function burn(lang, cues, files, output) {
  const inputs = ['-i', raw]
  for (const f of files) inputs.push('-i', f)
  let chain = ''
  let prev = '[0:v]'
  cues.forEach((c, i) => {
    const label = i === cues.length - 1 ? '[v]' : `[v${i}]`
    chain += `${prev}[${i + 1}:v]overlay=0:${H - CUE_H}:enable='between(t,${c.start},${c.end})'${label};`
    prev = label
  })
  chain = chain.replace(/;$/, '')
  ff([...inputs, '-filter_complex', chain, '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', output])
}

const en = parseSrt(readFileSync(`${out}/demo-en.srt`, 'utf8'))
const zh = parseSrt(readFileSync(`${out}/demo-zh.srt`, 'utf8'))

ff(['-i', raw, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', `${out}/demo.mp4`])
burn('en', en, await renderCues('en', en), `${out}/demo-en.mp4`)
burn('zh', zh, await renderCues('zh', zh), `${out}/demo-zh.mp4`)

// GIF loop from the captioned English video: revision -> impact -> reasons.
ff([
  '-ss', '11', '-t', '17', '-i', `${out}/demo-en.mp4`,
  '-vf', 'fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
  '-loop', '0', `${out}/demo-loop.gif`,
])

for (const f of ['demo.mp4', 'demo-en.mp4', 'demo-zh.mp4', 'demo-loop.gif']) {
  const p = `${out}/${f}`
  console.log(`${f}\t${existsSync(p) ? (statSync(p).size / 1024).toFixed(0) + ' KB' : 'MISSING'}`)
}
