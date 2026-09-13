import { expect, test } from '@playwright/test'

// Regressions found by the pre-launch review (2026-09-13).
test.describe('launch fixes', () => {
  test('landing media keep their aspect ratio and never cause horizontal scroll', async ({ page }) => {
    await page.goto('')
    const img = page.locator('img.shot').first()
    await expect(img).toBeVisible()
    await page.waitForFunction(() => {
      const i = document.querySelector('img.shot') as HTMLImageElement
      return i && i.complete && i.naturalWidth > 0
    })
    const ratio = await img.evaluate((el: HTMLImageElement) => ({ box: el.getBoundingClientRect().width / el.getBoundingClientRect().height, nat: el.naturalWidth / el.naturalHeight }))
    expect(Math.abs(ratio.box - ratio.nat)).toBeLessThan(0.02)
    await page.locator('details summary').first().click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow).toBe(false)
    const vw = await page.locator('video.shot').evaluate((el) => el.getBoundingClientRect().width)
    expect(vw).toBeLessThanOrEqual(1280 - 2 * 20)
  })

  test('"Review your text" from the landing restores the unsaved own workspace', async ({ page }) => {
    await page.goto('')
    await page.getByTestId('review-own-text').click()
    await page.getByTestId('add-claims-text').fill('My only sentence.')
    await page.getByTestId('add-claim-single').click()
    await expect(page.getByTestId('claim-item-1')).toBeVisible()
    await page.getByRole('link', { name: 'Evidence OS Inspector' }).click()
    await expect(page.getByTestId('review-own-text')).toBeVisible()
    await page.getByTestId('review-own-text').click()
    await expect(page.getByTestId('claim-item-1')).toContainText('My only sentence.')
    // a demo visit must not overwrite it
    await page.goto('#demo/scope-check')
    await expect(page.getByTestId('synthetic-badge')).toBeVisible()
    await page.goto('#workspace')
    await expect(page.getByTestId('claim-item-1')).toContainText('My only sentence.')
    await expect(page.getByTestId('synthetic-badge')).toHaveCount(0)
  })

  test('report export can include full source text when asked', async ({ page }) => {
    await page.goto('#demo/scope-check')
    await page.getByTestId('include-source-text').check()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-report').click()])
    const html = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString('utf8'))
    expect(html).toContain('Synthetic registry analysis D (fictional). Data: a made-up national joint registry')
    await page.getByTestId('include-source-text').uncheck()
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-report').click()])
    const html2 = await (await dl2.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString('utf8'))
    expect(html2).not.toContain('made-up national joint registry')
  })

  test('every text field has an accessible name', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await page.getByTestId('claim-item-C1').click()
    await page.getByTestId('new-source-toggle').click()
    await page.getByTestId('revise-source').click()
    const unnamed = await page.evaluate(() => {
      const out: string[] = []
      document.querySelectorAll('input[type="text"], textarea, select').forEach((el) => {
        const e = el as HTMLElement
        const id = e.id
        const hasLabel = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (id && document.querySelector(`label[for="${id}"]`)) || e.closest('label')
        if (!hasLabel) out.push(e.getAttribute('data-testid') || e.tagName)
      })
      return out
    })
    expect(unnamed).toEqual([])
  })
})
