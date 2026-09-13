import { expect, test, type Page } from '@playwright/test'

const state = (page: Page, label: string) => page.getByTestId(`claim-item-${label}`).getAttribute('data-state')

async function selectSourceText(page: Page, needle: string) {
  // Programmatic selection inside the source text container (a user would drag-select).
  await page.evaluate((needle) => {
    const el = document.querySelector('[data-testid="source-text"]') as HTMLElement
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let offset = 0
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
      offset += node.data.length
    }
    throw new Error('needle not found: ' + needle)
  }, needle)
}

test.describe('demo 1: correction impact', () => {
  test('applying the suggested correction flags C1 directly and C4 indirectly, others stay current', async ({ page }) => {
    // Every request, including those made while the page loads, must go to the app's own origin.
    const requested: string[] = []
    page.on('request', (r) => requested.push(r.url()))
    await page.goto('')
    const ownOrigin = new URL(page.url()).origin
    const external = () => requested.filter((u) => new URL(u).origin !== ownOrigin)
    await page.getByTestId('try-demo-hero').click()
    await expect(page.getByTestId('synthetic-badge')).toBeVisible()
    for (const l of ['C1', 'C2', 'C3', 'C4', 'C5']) expect(await state(page, l)).toBe('current')

    await page.getByTestId('source-select').selectOption({ label: 'Synthetic cohort report A' })
    await page.getByTestId('revise-source').click()
    await page.getByTestId('load-suggested-correction').click()
    await page.getByTestId('save-revision').click()

    const banner = page.getByTestId('impact-banner')
    await expect(banner).toBeVisible()
    await expect(page.getByTestId('impact-direct')).toContainText('C1')
    await expect(page.getByTestId('impact-indirect')).toContainText('C4')
    await expect(page.getByTestId('impact-indirect')).toContainText('C1 → C4')
    await expect(page.getByTestId('impact-unaffected')).toContainText('C2')
    await expect(page.getByTestId('impact-unaffected')).toContainText('C3')
    await expect(page.getByTestId('impact-unaffected')).toContainText('C5')

    expect(await state(page, 'C1')).toBe('needs-re-review')
    expect(await state(page, 'C4')).toBe('needs-re-review')
    expect(await state(page, 'C2')).toBe('current')
    expect(await state(page, 'C3')).toBe('current')
    expect(await state(page, 'C5')).toBe('current')

    // Reason and path are shown for C4
    await page.getByTestId('claim-item-C4').click()
    await expect(page.getByTestId('review-reasons')).toContainText('C1 → C4')

    // Re-bind C1 to the new version using the suggestion, then re-review; history keeps the old review.
    await page.getByTestId('claim-item-C1').click()
    await page.getByTestId('review-label-not-supported').check()
    await page.getByTestId('review-rationale').fill('The corrected version withdraws the difference.')
    await page.getByTestId('review-submit').click()
    // Still stale: the binding is on v1; the UI must not let a review pretend to cover v2.
    expect(await state(page, 'C1')).toBe('needs-re-review')
    await page.getByTestId('rebind-find').first().click()
    await expect(page.getByTestId('rebind-not-found').first()).toBeVisible()
    // Bind a passage from v2 manually
    await selectSourceText(page, 'median hospital stay was 5 days in both groups')
    await page.getByTestId('bind-selection').click()
    await page.getByTestId('review-label-not-supported').check()
    await page.getByTestId('review-rationale').fill('v2: difference withdrawn; the claim no longer holds.')
    await page.getByTestId('review-submit').click()
    expect(await state(page, 'C1')).toBe('current')
    await expect(page.getByTestId('review-history')).toContainText('Supported within stated scope')
    await expect(page.getByTestId('review-history')).toContainText('Not supported')
    // C4 remains flagged because its upstream verdict changed
    expect(await state(page, 'C4')).toBe('needs-re-review')

    expect(requested.length).toBeGreaterThan(0)
    expect(external()).toEqual([])
  })
})

test.describe('dependencies and claim edits', () => {
  test('cycle is rejected with a message; editing claim text invalidates its review', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await expect(page.getByTestId('synthetic-badge')).toBeVisible()
    // C1 -> (depends on) C4 would close the cycle C4 -> C1
    await page.getByTestId('claim-item-C1').click()
    await page.getByTestId('dep-target-select').selectOption({ label: 'C4' })
    await page.getByTestId('dep-add').click()
    await expect(page.getByTestId('dep-error')).toContainText(/cycle/i)

    await page.getByTestId('claim-item-C2').click()
    await page.getByTestId('claim-edit-text').fill('Every physiotherapist everywhere finds early walking feasible.')
    await page.getByTestId('claim-edit-save').click()
    expect(await state(page, 'C2')).toBe('needs-re-review')
    await expect(page.getByTestId('review-reasons')).toContainText(/claim text changed/i)
  })
})

test.describe('own text, export, import, safety', () => {
  test('full flow with new input, JSON round trip, and hostile content rendered inert', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', async (d) => {
      dialogs++
      await d.dismiss()
    })
    await page.goto('')
    await page.getByTestId('review-own-text').click()
    await page.getByTestId('add-claims-text').fill('Walking early shortened stay. <img src=x onerror="alert(1)">. Costs fell too.')
    await page.getByTestId('add-claims-split').click()
    await expect(page.getByTestId('claim-item-1')).toBeVisible()
    await expect(page.getByTestId('claim-item-3')).toBeVisible()
    await expect(page.getByTestId('claim-item-2')).toContainText('<img src=x onerror="alert(1)">')

    await page.getByTestId('new-source-toggle').click()
    await page.getByTestId('new-source-title').fill('My note <b>x</b>')
    await page.getByTestId('new-source-url').fill('javascript:alert(2)')
    await page.getByTestId('new-source-text').fill('Observed: patients who walked on day 1 left one day earlier on average. No cost data.')
    await page.getByTestId('new-source-save').click()

    await page.getByTestId('claim-item-1').click()
    await selectSourceText(page, 'left one day earlier on average')
    await page.getByTestId('bind-selection').click()
    await page.getByTestId('review-label-supported-in-scope').check()
    await page.getByTestId('review-rationale').fill('Matches the note.')
    await page.getByTestId('review-submit').click()
    expect(await state(page, '1')).toBe('current')
    // unsafe URL is shown as text, never as a link
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)

    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()])
    const json = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString('utf8'))
    expect(JSON.parse(json).format).toBe('eosi-workspace')

    const [rep] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-report').click()])
    const html = await (await rep.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString('utf8'))
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')

    // Fresh page, import the JSON, state restored
    await page.goto('')
    await page.getByTestId('review-own-text').click()
    await page.getByTestId('import-json-input').setInputFiles({ name: 'ws.json', mimeType: 'application/json', buffer: Buffer.from(json) })
    await expect(page.getByTestId('claim-item-1')).toBeVisible()
    expect(await state(page, '1')).toBe('current')
    expect(await state(page, '2')).toBe('unreviewed')

    // Garbage import is refused with a message
    await page.getByTestId('import-json-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"x"}') })
    await expect(page.getByTestId('import-error')).toBeVisible()
    expect(await state(page, '1')).toBe('current')

    expect(dialogs).toBe(0)
  })

  test('deep link with sub-path survives refresh and switches language', async ({ page }) => {
    await page.goto('#demo/scope-check')
    await expect(page.getByTestId('ws-title')).toContainText('scope check')
    await page.reload()
    await expect(page.getByTestId('ws-title')).toContainText('scope check')
    await page.getByTestId('locale-toggle').click()
    await expect(page.getByTestId('synthetic-badge')).toContainText('合成演示')
    await page.getByTestId('claim-item-S2').click()
    await expect(page.getByTestId('review-state')).toContainText('不支持')
  })
})
