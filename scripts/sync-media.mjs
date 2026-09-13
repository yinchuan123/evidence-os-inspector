/**
 * Copy reviewed media from docs/media (tracked in git) into public/media
 * (gitignored) so the built site serves the same files the README shows.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

const src = 'docs/media'
const dst = 'public/media'
mkdirSync(dst, { recursive: true })
let n = 0
for (const f of readdirSync(src)) {
  if (f.startsWith('.')) continue
  copyFileSync(path.join(src, f), path.join(dst, f))
  n++
}
console.log(`synced ${n} media files to ${dst}`)
