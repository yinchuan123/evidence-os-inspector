// Visual QA screenshots against the preview server (http://localhost:4173/evidence-os-inspector/).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? 'qa-shots'
mkdirSync(out, { recursive: true })
const base = 'http://localhost:4173/evidence-os-inspector/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(base)
await page.screenshot({ path: `${out}/01-landing.png`, fullPage: true })
await page.getByTestId('try-demo-hero').click()
await page.getByTestId('claim-item-C1').click()
await page.waitForTimeout(200)
await page.screenshot({ path: `${out}/02-demo1-c1.png` })
await page.getByTestId('revise-source').click()
await page.getByTestId('load-suggested-correction').click()
await page.screenshot({ path: `${out}/03-revise.png` })
await page.getByTestId('save-revision').click()
await page.getByTestId('claim-item-C4').click()
await page.waitForTimeout(200)
await page.screenshot({ path: `${out}/04-impact.png` })
const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } })
await narrow.goto(base + '#demo/correction-impact')
await narrow.waitForTimeout(300)
await narrow.screenshot({ path: `${out}/05-narrow.png` })
await narrow.getByTestId('tab-review').click()
await narrow.screenshot({ path: `${out}/06-narrow-review.png` })
await browser.close()
console.log('done')
