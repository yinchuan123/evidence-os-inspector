import { expect, test, type Page } from '@playwright/test'

async function own(page: Page, text: string) {
  await page.goto('')
  await page.getByTestId('review-own-text').click()
  await page.getByTestId('add-claims-text').fill(text)
  await page.getByTestId('add-claim-single').click()
  await expect(page.getByTestId('claim-item-1')).toContainText(text)
}

async function download(page: Page, testId: string) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId(testId).click()])
  return Buffer.concat((await (await dl.createReadStream()).toArray()) as Buffer[]).toString('utf8')
}

// Found by the final review of the live alpha.3 (2026-09-14).
test.describe('alpha.4: data safety', () => {
  test('when the browser refuses to save, a visible warning appears and no older copy comes back on reload', async ({ page }) => {
    await own(page, 'Saved before the quota problem.')
    await page.evaluate(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException('quota', 'QuotaExceededError')
      }
    })
    await page.getByTestId('add-claims-text').fill('Added while storage is full.')
    await page.getByTestId('add-claim-single').click()
    await expect(page.getByTestId('persist-warning')).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('eosi.workspace'))).toBeNull()
  })

  test('an unreadable saved workspace is kept aside and reported, not silently overwritten', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('eosi.test.seeded')) {
        sessionStorage.setItem('eosi.workspace', '{"format":"eosi-workspace","formatVersion":"0.1", broken')
        sessionStorage.setItem('eosi.test.seeded', '1')
      }
    })
    await page.goto('')
    await page.getByTestId('review-own-text').click()
    await expect(page.getByTestId('restore-warning')).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('eosi.workspace.unreadable'))).toContain('broken')
  })

  test('importing asks before replacing your own workspace, and Cancel keeps it', async ({ page }) => {
    await page.goto('#demo/scope-check')
    const json = await download(page, 'export-json')
    await own(page, 'My own work.')
    const messages: string[] = []
    page.once('dialog', async (d) => {
      messages.push(d.message())
      await d.dismiss()
    })
    await page.getByTestId('import-json-input').setInputFiles({ name: 'demo.json', mimeType: 'application/json', buffer: Buffer.from(json) })
    await expect.poll(() => messages.length).toBe(1)
    expect(messages[0]).toMatch(/1 claim/)
    await expect(page.getByTestId('claim-item-1')).toContainText('My own work.')
  })

  test('a workspace export larger than 5 MB can be imported again', async ({ page }) => {
    await own(page, 'Big one.')
    const json = await download(page, 'export-json')
    const obj = JSON.parse(json)
    obj.meta.description = 'x'.repeat(6 * 1024 * 1024)
    page.on('dialog', (d) => d.accept())
    await page.getByTestId('import-json-input').setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj)) })
    await expect(page.getByTestId('import-error')).toHaveCount(0)
    await expect(page.getByTestId('claim-item-1')).toContainText('Big one.')
  })
})

test.describe('alpha.4: interface', () => {
  test('header never pushes controls off-screen between 901 and 1280px', async ({ page }) => {
    for (const width of [901, 1024, 1100, 1280]) {
      for (const locale of ['en', 'zh-CN']) {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript((l) => localStorage.setItem('eosi.locale', l), locale)
        await page.goto('#demo/correction-impact')
        await expect(page.getByTestId('synthetic-badge')).toBeVisible()
        const m = await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="locale-toggle"]') as HTMLElement
          return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, right: btn.getBoundingClientRect().right, vw: window.innerWidth }
        })
        expect(m.overflow, `${width} ${locale}`).toBe(false)
        expect(m.right, `${width} ${locale}`).toBeLessThanOrEqual(m.vw)
      }
    }
  })

  test('a half-written review survives switching to another claim and back', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await page.getByTestId('claim-item-C1').click()
    await page.getByTestId('review-label-not-supported').check()
    await page.getByTestId('review-rationale').fill('Draft in progress.')
    await page.getByTestId('claim-item-C2').click()
    await expect(page.getByTestId('review-rationale')).toHaveValue('')
    await page.getByTestId('claim-item-C1').click()
    await expect(page.getByTestId('review-rationale')).toHaveValue('Draft in progress.')
    await expect(page.getByTestId('review-label-not-supported')).toBeChecked()
  })

  test('"Split into sentences" selects the first new claim', async ({ page }) => {
    await page.goto('')
    await page.getByTestId('review-own-text').click()
    await page.getByTestId('add-claims-text').fill('First sentence. Second sentence. Third sentence.')
    await page.getByTestId('add-claims-split').click()
    await expect(page.getByTestId('claim-item-1')).toHaveAttribute('aria-pressed', 'true')
  })

  test('recording a review confirms it, and the heading names the claim version', async ({ page }) => {
    await page.goto('#demo/scope-check')
    await page.getByTestId('claim-item-S1').click()
    await expect(page.getByRole('heading', { name: /claim v1/i })).toBeVisible()
    await page.getByTestId('review-label-partially-supported').check()
    await page.getByTestId('review-rationale').fill('Checked.')
    await page.getByTestId('review-submit').click()
    await expect(page.getByTestId('review-recorded')).toBeVisible()
  })

  test('the impact banner says it describes the revision, not the current state', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await page.getByTestId('revise-source').click()
    await page.getByTestId('load-suggested-correction').click()
    await page.getByTestId('save-revision').click()
    await expect(page.getByTestId('impact-note')).toContainText('current state')
  })

  test('binding counter distinguishes the current source version from older ones, and the not-found hint is not clipped', async ({ page }) => {
    await page.goto('#demo/correction-impact')
    await page.getByTestId('claim-item-C1').click()
    await page.getByTestId('revise-source').click()
    await page.getByTestId('load-suggested-correction').click()
    await page.getByTestId('save-revision').click()
    await expect(page.getByTestId('binding-counts')).toContainText('current version: 0')
    await expect(page.getByTestId('binding-counts')).toContainText('older versions: 1')
    await page.getByTestId('rebind-find').first().click()
    const hint = page.getByTestId('rebind-not-found').first()
    await expect(hint).toBeVisible()
    const clipped = await hint.evaluate((el) => {
      const pane = el.closest('section.pane') as HTMLElement
      return el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > pane.getBoundingClientRect().right + 1
    })
    expect(clipped).toBe(false)
  })

  test.describe('time zone label', () => {
    test.use({ timezoneId: 'Asia/Kolkata' })
    test('local times carry their UTC offset', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-09-13T19:30:00Z'))
      await page.goto('#demo/scope-check')
      await page.getByTestId('claim-item-S1').click()
      await page.getByTestId('review-label-partially-supported').check()
      await page.getByTestId('review-rationale').fill('Checked.')
      await page.getByTestId('review-submit').click()
      await expect(page.getByTestId('review-history')).toContainText('2026-09-14 01:00:00 UTC+05:30')
    })
  })

  test('language chosen before opening your workspace names the new workspace in that language', async ({ page }) => {
    await page.goto('')
    await page.getByTestId('locale-toggle').click()
    await page.evaluate(() => {
      window.location.hash = 'workspace'
    })
    await expect(page.getByTestId('ws-title')).toHaveText('我的审阅')
  })
})
