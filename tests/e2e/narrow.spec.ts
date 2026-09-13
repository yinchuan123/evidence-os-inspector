import { expect, test } from '@playwright/test'

test('narrow screen: tabs expose claims, source, review; a review can be recorded', async ({ page }) => {
  await page.goto('#demo/missing-then-supplemented')
  await expect(page.getByTestId('tab-claims')).toBeVisible()
  await expect(page.getByTestId('claim-item-M2')).toBeVisible()
  await page.getByTestId('claim-item-M1').click()
  await page.getByTestId('tab-review').click()
  await expect(page.getByTestId('review-state')).toBeVisible()
  await page.getByTestId('review-label-partially-supported').check()
  await page.getByTestId('review-rationale').fill('Re-checked on a phone.')
  await page.getByTestId('review-submit').click()
  await page.getByTestId('tab-claims').click()
  expect(await page.getByTestId('claim-item-M1').getAttribute('data-state')).toBe('current')
  await page.getByTestId('tab-source').click()
  await expect(page.getByTestId('source-text')).toBeVisible()
  await page.getByTestId('tab-history').click()
  await expect(page.getByTestId('history-list')).toContainText(/Review recorded/i)
  // no horizontal overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})
