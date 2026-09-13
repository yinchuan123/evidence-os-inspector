import { expect, test, type Page } from '@playwright/test'

async function selectSourceText(page: Page, needle: string) {
  await page.evaluate((needle) => {
    const el = document.querySelector('[data-testid="source-text"]') as HTMLElement
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      const idx = node.data.indexOf(needle)
      if (idx >= 0) {
        const range = document.createRange()
        range.setStart(node, idx)
        range.setEnd(node, idx + needle.length)
        const sel = window.getSelection()!
        sel.removeAllRanges()
        sel.addRange(range)
        document.dispatchEvent(new Event('selectionchange'))
        return
      }
    }
    throw new Error('needle not found: ' + needle)
  }, needle)
}

// Found by the regression sweep on the live alpha.2 (2026-09-14).
test.describe('sweep fixes', () => {
  test('claims without labels are named by position in the impact banner, history and report', async ({ page }) => {
    await page.goto('')
    await page.getByTestId('review-own-text').click()
    await page.getByTestId('add-claims-text').fill('Walking helps. Costs fell.')
    await page.getByTestId('add-claims-split').click()
    await page.getByTestId('new-source-toggle').click()
    await page.getByTestId('new-source-title').fill('Note')
    await page.getByTestId('new-source-text').fill('Walking early helped patients leave sooner.')
    await page.getByTestId('new-source-save').click()
    await page.getByTestId('claim-item-1').click()
    await selectSourceText(page, 'Walking early helped')
    await page.getByTestId('bind-selection').click()
    await page.getByTestId('revise-source').click()
    await page.getByTestId('revise-text').fill('Walking early did not change length of stay.')
    await page.getByTestId('save-revision').click()
    await expect(page.getByTestId('impact-direct')).toHaveText('1')
    await expect(page.getByTestId('impact-unaffected')).toHaveText('2')
    await expect(page.locator('body')).not.toContainText(/clm_\d+/)
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-report').click()])
    const html = Buffer.concat((await (await dl.createReadStream()).toArray()) as Buffer[]).toString('utf8')
    expect(html).not.toMatch(/clm_\d+/)
  })

  test('the desktop workspace fits the window: the page itself does not scroll', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await expect(page.getByTestId('claim-item-C1')).toBeVisible()
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: window.innerHeight }))
    expect(m.h).toBeLessThanOrEqual(m.vh + 1)
  })

  test.describe('local time', () => {
    test.use({ timezoneId: 'Asia/Shanghai' })
    test('review and history times are shown in the viewer’s local time', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-09-13T19:30:00Z'))
      await page.goto('#demo/scope-check')
      await page.getByTestId('claim-item-S1').click()
      await page.getByTestId('review-label-partially-supported').check()
      await page.getByTestId('review-rationale').fill('Checked again.')
      await page.getByTestId('review-submit').click()
      await expect(page.getByTestId('review-history')).toContainText('2026-09-14 03:30')
      await expect(page.getByTestId('review-history')).not.toContainText('2026-09-13 19:30')
      await page.locator('details.desktop-history summary').click()
      await expect(page.getByTestId('history-list')).toContainText('2026-09-14 03:30')
      await expect(page.getByTestId('history-list')).not.toContainText('2026-09-13 19:30')
    })
  })

  test('pressing Space on a claim card selects it without scrolling the list', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    const pane = page.locator('section.pane').first()
    await page.getByTestId('claim-item-C2').focus()
    const before = await pane.evaluate((el) => el.scrollTop)
    await page.keyboard.press('Space')
    await expect(page.getByTestId('claim-item-C2')).toHaveAttribute('aria-pressed', 'true')
    // Keyboard scrolling is animated; give it time to move before measuring.
    await page.waitForTimeout(500)
    expect(await pane.evaluate((el) => el.scrollTop)).toBe(before)
  })

  test('a review needs an explicit label: nothing is pre-selected', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await page.getByTestId('claim-item-C1').click()
    await expect(page.locator('input[name="review-label"]:checked')).toHaveCount(0)
    await page.getByTestId('review-rationale').fill('No label chosen.')
    await page.getByTestId('review-submit').click()
    await expect(page.getByTestId('review-error')).toBeVisible()
    await expect(page.getByTestId('review-history').locator('li')).toHaveCount(1)
    await expect(page.getByTestId('review-last-verdict')).toContainText('Supported within stated scope')
  })

  test('Chinese mode: no English accessibility text, own text not tagged as English, FAQ opens the Chinese section', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eosi.locale', 'zh-CN'))
    await page.goto('')
    await expect(page.locator('img.shot')).toHaveAttribute('alt', /来源 A/)
    await expect(page.getByRole('link', { name: '常见问题' }).first()).toHaveAttribute('href', /FAQ\.html#zh$/)
    await page.getByTestId('review-own-text').click()
    await page.getByTestId('new-source-toggle').click()
    await page.getByTestId('new-source-title').fill('笔记')
    await page.getByTestId('new-source-text').fill('早期下地组中位住院 4 天。')
    await page.getByTestId('new-source-save').click()
    expect(await page.getByTestId('source-text').getAttribute('lang')).not.toBe('en')
    const english = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')!).filter((l) => /^[A-Za-z ]+$/.test(l)),
    )
    expect(english).toEqual([])
  })

  test('the report downloaded with full source text has a distinct file name', async ({ page }) => {
    await page.goto('#demo/scope-check')
    await page.getByTestId('include-source-text').check()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-report').click()])
    expect(dl.suggestedFilename()).toMatch(/with-source-text\.html$/)
  })
})

test('desktop workspace header stays on one row at 1280px in English and Chinese', async ({ page }) => {
  for (const locale of ['en', 'zh-CN']) {
    await page.addInitScript((l) => localStorage.setItem('eosi.locale', l), locale)
    await page.goto('#demo/correction-impact')
    await expect(page.getByTestId('synthetic-badge')).toBeVisible()
    // One row: every visible control starts above the bottom edge of the highest one.
    const wrapped = await page.evaluate(() => {
      const bar = document.querySelector('.workspace .topbar') as HTMLElement
      const boxes = [...bar.children]
        .filter((c) => !c.classList.contains('sr-only') && !c.classList.contains('spacer') && (c as HTMLElement).offsetParent !== null)
        .map((c) => c.getBoundingClientRect())
      const firstBottom = Math.min(...boxes.map((b) => b.bottom))
      return boxes.filter((b) => b.top >= firstBottom).length
    })
    expect(wrapped, locale).toBe(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow, locale).toBe(false)
  }
})
