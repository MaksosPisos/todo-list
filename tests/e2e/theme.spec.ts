import { expect, test } from '@playwright/test'

test('follows system theme until a manual choice is made', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Тёмная тема' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 38, 45)')
  await page.screenshot({ path: 'test-results/theme-dark-desktop.png', fullPage: true })
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('quiet-notes:theme'))).toBeNull()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.screenshot({ path: 'test-results/theme-light-desktop.png', fullPage: true })
})

test('keyboard switch persists across reload, navigation and system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Тёмная тема' })
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(toggle).toHaveAttribute('title', 'Включить светлую тему')
  expect(await page.evaluate(() => localStorage.getItem('quiet-notes:theme'))).toBe('dark')
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: 'Создать первую заметку' }).click()
  await expect(page.locator('.editor-paper')).toHaveCSS('background-color', 'rgb(36, 38, 45)')
  await page.getByLabel('Название', { exact: true }).fill('Ночная заметка')
  await page.getByRole('button', { name: 'Добавить задачу' }).click()
  await page.getByLabel('Текст задачи 1', { exact: true }).fill('Проверить тёмную тему')
  await page.screenshot({ path: 'test-results/theme-dark-editor.png', fullPage: true })
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await expect(page.locator('.note-card')).toBeVisible()
  await page.getByRole('button', { name: 'Удалить заметку «Ночная заметка»' }).click()
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(36, 38, 45)')
  await page.screenshot({ path: 'test-results/theme-dark-dialog.png', fullPage: true })
  await page.keyboard.press('Escape')
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 812 })
    await expect(toggle).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: 'test-results/theme-dark-mobile.png', fullPage: true })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(toggle).toHaveAttribute('title', 'Включить тёмную тему')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

test('syncs manual choice between tabs and returns to system when storage is cleared', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => localStorage.setItem('quiet-notes:theme', 'invalid'))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const second = await context.newPage()
  await second.emulateMedia({ colorScheme: 'dark' })
  await second.goto('/')
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Тёмная тема' }).click()
  await expect(second.getByRole('button', { name: 'Тёмная тема' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Тёмная тема' }).click()
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.evaluate(() => localStorage.removeItem('quiet-notes:theme'))
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('switch works when theme storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem
    const setItem = Storage.prototype.setItem
    Storage.prototype.getItem = function (key) {
      if (key === 'quiet-notes:theme') throw new Error('Storage is unavailable')
      return getItem.call(this, key)
    }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'quiet-notes:theme') throw new Error('Storage is unavailable')
      setItem.call(this, key, value)
    }
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Тёмная тема' })
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
