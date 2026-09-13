import { expect, test, type Page } from '@playwright/test'

async function readDownload(page: Page, testId: string): Promise<string> {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId(testId).click()])
  const chunks = (await (await dl.createReadStream()).toArray()) as Buffer[]
  return Buffer.concat(chunks).toString('utf8')
}

async function ownWorkspaceWithClaim(page: Page, text: string) {
  await page.goto('')
  await page.getByTestId('review-own-text').click()
  await page.getByTestId('add-claims-text').fill(text)
  await page.getByTestId('add-claim-single').click()
  await expect(page.getByTestId('claim-item-1')).toContainText(text)
}

// Found on the live alpha.2 by the post-release verification run (2026-09-14).
test.describe('workspace safety', () => {
  test('from inside a demo, the workspace button opens your own workspace and never discards it', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', async (d) => {
      dialogs++
      await d.accept()
    })
    await ownWorkspaceWithClaim(page, 'Keep me safe.')
    await page.goto('#demo/scope-check')
    await expect(page.getByTestId('synthetic-badge')).toBeVisible()
    await page.getByTestId('workspace-button').click()
    await expect(page.getByTestId('claim-item-1')).toContainText('Keep me safe.')
    await expect(page.getByTestId('synthetic-badge')).toHaveCount(0)
    expect(dialogs).toBe(0)
  })

  test('"New workspace" in your own workspace asks first and names what will be discarded', async ({ page }) => {
    const messages: string[] = []
    page.on('dialog', async (d) => {
      messages.push(d.message())
      await d.dismiss()
    })
    await ownWorkspaceWithClaim(page, 'Do not lose this.')
    await page.getByTestId('workspace-button').click()
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/1 claim/)
    await expect(page.getByTestId('claim-item-1')).toContainText('Do not lose this.')
  })

  test('an imported file becomes your workspace and survives a reload, even if it came from a demo', async ({ page }) => {
    await page.goto('#demo/scope-check')
    await expect(page.getByTestId('synthetic-badge')).toBeVisible()
    const json = await readDownload(page, 'export-json')
    await ownWorkspaceWithClaim(page, 'Older own work.')
    page.on('dialog', (d) => d.accept())
    await page.getByTestId('import-json-input').setInputFiles({ name: 'demo.json', mimeType: 'application/json', buffer: Buffer.from(json) })
    await expect(page.getByTestId('ws-title')).toContainText('scope check')
    await page.reload()
    await expect(page.getByTestId('ws-title')).toContainText('scope check')
    await expect(page.getByTestId('claim-item-S2')).toBeVisible()
    // Edits made after the import are the user's work too and must survive a reload.
    await page.getByTestId('add-claims-text').fill('Added after import.')
    await page.getByTestId('add-claim-single').click()
    await expect(page.getByTestId('claim-item-4')).toContainText('Added after import.')
    await page.reload()
    await expect(page.getByTestId('claim-item-4')).toContainText('Added after import.')
  })

  test('importing while viewing a demo moves you to your own workspace view', async ({ page }) => {
    await page.goto('#demo/scope-check')
    const json = await readDownload(page, 'export-json')
    await page.goto('#demo/correction-impact')
    await expect(page.getByTestId('claim-item-C5')).toBeVisible()
    await page.getByTestId('import-json-input').setInputFiles({ name: 'demo.json', mimeType: 'application/json', buffer: Buffer.from(json) })
    await expect(page).toHaveURL(/#workspace$/)
    await expect(page.getByTestId('ws-title')).toContainText('scope check')
    await page.reload()
    await expect(page.getByTestId('ws-title')).toContainText('scope check')
  })
})
