import { expect, test } from '@playwright/test'

test('narrow: a way back to the landing page is visible', async ({ page }) => {
  await page.goto('#demo/correction-impact')
  await expect(page.getByTestId('home-link')).toBeVisible()
  await page.getByTestId('home-link').click()
  await expect(page.getByTestId('review-own-text')).toBeVisible()
})
