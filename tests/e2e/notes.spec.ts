import { expect, test, type Page } from '@playwright/test'

async function createNote(page: Page, title = 'Планы на неделю', count = 1): Promise<void> {
  await page.goto('/notes/new')
  await page.getByLabel('Название', { exact: true }).fill(title)
  for (let i = 1; i <= count; i++) {
    await page.getByRole('button', { name: 'Добавить задачу' }).click()
    await page.getByLabel(`Текст задачи ${i}`, { exact: true }).fill(`Шаг ${i}`)
  }
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await expect(page).toHaveURL('/')
}
async function openNote(page: Page, title = 'Планы на неделю'): Promise<void> {
  await page.getByRole('link', { name: title, exact: true }).click()
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue(title)
}

test('empty state, responsive layout and unknown direct URL', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Создать первую заметку' })).toBeVisible()
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/mobile-empty.png', fullPage: true })
  await page.goto('/notes/not-found')
  await expect(page.getByRole('heading', { name: 'Эта заметка не нашлась' })).toBeVisible()
})

test('create, limited read-only preview, persist, search and edit', async ({ page }) => {
  await createNote(page, 'Планы на неделю', 4)
  await expect(page.getByText('Шаг 3', { exact: true })).toBeVisible()
  await expect(page.getByText('Шаг 4', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Ещё 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('link', { name: 'Планы на неделю', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/desktop-notes.png', fullPage: true })
  await page.getByRole('searchbox').fill('не существует')
  await expect(page.getByText('Здесь пока ничего не нашлось')).toBeVisible()
  await page.getByRole('button', { name: 'Сбросить поиск и фильтр' }).click()
  await openNote(page)
  await expect(page.getByLabel('Текст задачи 4', { exact: true })).toHaveValue('Шаг 4')
  await page.screenshot({ path: 'test-results/desktop-editor.png', fullPage: true })
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/mobile-editor.png', fullPage: true })
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Отменить изменение', exact: true }).click()
  await expect(page.getByRole('checkbox').first()).not.toBeChecked()
  await page.getByRole('button', { name: 'Повторить изменение', exact: true }).click()
  await expect(page.getByRole('checkbox').first()).toBeChecked()
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await expect(page.getByText('1 из 4 выполнено', { exact: true })).toBeVisible()
})

for (const width of [1440, 375]) {
  test(`the whole note card opens the editor at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await createNote(page)
    const card = page.getByRole('article')
    const link = card.getByRole('link', { name: 'Планы на неделю', exact: true })
    await expect(card.getByRole('link')).toHaveCount(1)
    await expect(card.getByRole('button')).toHaveCount(1)

    for (const target of [
      () => card.click({ position: { x: 8, y: 8 } }),
      () => card.getByText('Шаг 1', { exact: true }).click(),
      () => card.getByText('0 из 1 выполнено', { exact: true }).click(),
      () => card.getByText('Открыть', { exact: true }).click(),
    ]) {
      await target()
      await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Планы на неделю')
      await page.getByRole('link', { name: 'Все заметки', exact: true }).click()
      await expect(link).toBeVisible()
    }

    await link.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(link).toBeFocused()
    await expect(link).toHaveCSS('outline-style', 'solid')
    await page.keyboard.press('Tab')
    const remove = card.getByRole('button', { name: 'Удалить заметку «Планы на неделю»' })
    await expect(remove).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL('/')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Shift+Tab')
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Планы на неделю')
  })
}

test('card text can be selected and the card supports opening in a new tab', async ({
  page,
  context,
}) => {
  await createNote(page)
  const card = page.getByRole('article')
  const text = card.getByText('Шаг 1', { exact: true })
  const box = await text.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width + 2, box!.y + box!.height / 2, { steps: 10 })
  await page.mouse.up()
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain('Шаг 1')
  await expect(page).toHaveURL('/')

  const newTab = context.waitForEvent('page')
  await card.click({ position: { x: 8, y: 8 }, modifiers: ['ControlOrMeta'] })
  const opened = await newTab
  await expect(opened.getByLabel('Название', { exact: true })).toHaveValue('Планы на неделю')
  await expect(page).toHaveURL('/')
  await opened.close()
})

test('search waits for a typing pause and clears pending searches immediately', async ({
  page,
}) => {
  await createNote(page)
  await page.clock.install({ time: new Date('2026-11-10T09:00:00Z') })
  await page.clock.pauseAt(new Date('2026-11-10T09:00:01Z'))
  const search = page.getByRole('searchbox')
  const note = page.getByRole('link', { name: 'Планы на неделю', exact: true })
  const empty = page.getByText('Здесь пока ничего не нашлось')

  await search.fill('не')
  await page.clock.runFor(200)
  await search.fill('не существует')
  await page.clock.runFor(200)
  await expect(search).toHaveValue('не существует')
  await expect(note).toBeVisible()
  await page.clock.runFor(100)
  await expect(empty).toBeVisible()

  await search.fill('Ша')
  await page.clock.runFor(100)
  await search.fill('')
  await expect(note).toBeVisible()
  await page.clock.runFor(300)
  await expect(note).toBeVisible()

  await search.fill('не существует')
  await page.clock.runFor(300)
  await expect(empty).toBeVisible()
  await search.fill('другой запрос')
  await page.getByRole('button', { name: 'Сбросить поиск и фильтр' }).click()
  await expect(search).toHaveValue('')
  await expect(note).toBeVisible()
  await page.clock.runFor(300)
  await expect(note).toBeVisible()
})

test('Ctrl+Z owns input history, redo works and typing creates a new branch', async ({ page }) => {
  await page.goto('/notes/new')
  const title = page.getByLabel('Название', { exact: true })
  await title.fill('Весь ввод одним шагом')
  await title.press('Control+z')
  await expect(title).toHaveValue('')
  await title.press('Control+Shift+z')
  await expect(title).toHaveValue('Весь ввод одним шагом')
  await title.press('Control+z')
  await title.fill('Другая ветка')
  await title.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Повторить изменение', exact: true }),
  ).toBeDisabled()
  await title.press('Control+Shift+z')
  await expect(title).toHaveValue('Другая ветка')
})

test('confirmation focus trap, Escape, focus return and keyboard deletion', async ({ page }) => {
  await createNote(page)
  const remove = page.getByRole('button', { name: 'Удалить заметку «Планы на неделю»' })
  await remove.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Оставить', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Удалить', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Оставить', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(remove).toBeFocused()
  await remove.press('Enter')
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).press('Enter')
  await expect(page.getByRole('link', { name: 'Создать первую заметку' })).toBeVisible()
})

test('immediate reload preserves pending draft and offers restore', async ({ page }) => {
  await createNote(page)
  await openNote(page)
  await page.getByLabel('Название', { exact: true }).fill('Несохранённый черновик')
  await page.reload()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Вернуться к черновику?' })).toBeVisible()
  // Reloading again while the prompt is open must not erase the pending draft.
  await page.reload()
  await expect(dialog.getByRole('heading', { name: 'Вернуться к черновику?' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Восстановить', exact: true }).click()
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Несохранённый черновик')
  await expect(page.getByRole('button', { name: 'Отменить изменение', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Отменить редактирование', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отменить редактирование', exact: true })
    .click()
  await openNote(page)
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Планы на неделю')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('cross-tab deletion blocks stale save and reload handles missing note', async ({
  page,
  context,
}) => {
  await createNote(page)
  await openNote(page)
  const url = page.url()
  const second = await context.newPage()
  await second.goto(url)
  await second.getByLabel('Название', { exact: true }).fill('Работа во второй вкладке')
  await page.getByRole('button', { name: 'Удалить заметку', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(second.getByText('Заметка удалена в другой вкладке.', { exact: true })).toBeVisible()
  await expect(
    second.getByRole('button', { name: 'Сохранить заметку', exact: true }),
  ).toBeDisabled()
  await expect(second.getByLabel('Название', { exact: true })).toHaveValue(
    'Работа во второй вкладке',
  )
  await second.reload()
  await expect(second.getByRole('heading', { name: 'Эта заметка не нашлась' })).toBeVisible()
})

test('cross-tab save detects revision conflict', async ({ page, context }) => {
  await createNote(page)
  await openNote(page)
  const second = await context.newPage()
  await second.goto(page.url())
  await second.getByLabel('Название', { exact: true }).fill('Старая вкладка')
  await page.getByLabel('Название', { exact: true }).fill('Новая версия')
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await expect(
    second.getByText('В другой вкладке появилась новая версия.', { exact: true }),
  ).toBeVisible()
  await expect(
    second.getByRole('button', { name: 'Сохранить заметку', exact: true }),
  ).toBeDisabled()
})

test('empty task validation, untitled note and guarded navigation', async ({ page }) => {
  await page.goto('/notes/new')
  await page.getByRole('button', { name: 'Добавить задачу' }).click()
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('У задачи должен быть текст')
  await expect(page.getByLabel('Текст задачи 1', { exact: true })).toBeFocused()
  await page.getByRole('link', { name: 'Все заметки', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Уйти без сохранения?' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Остаться', exact: true }).click()
  await page.getByRole('button', { name: 'Удалить задачу 1', exact: true }).click()
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Без названия', exact: true })).toBeVisible()
})
