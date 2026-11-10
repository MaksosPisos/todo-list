import { expect, test } from '@playwright/test'

for (const source of ['saved', 'new']) {
  test(`switching from a ${source} note guards unsaved task changes`, async ({ page }) => {
    for (const name of ['Первый список', 'Второй список']) {
      await page.goto('/notes/new')
      await page.getByLabel('Название', { exact: true }).fill(name)
      await page.getByRole('button', { name: 'Добавить задачу' }).click()
      await page.getByLabel('Текст задачи 1', { exact: true }).fill('Сохранённая задача')
      await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
      await expect(page).toHaveURL('/')
    }

    const lists = page.getByRole('navigation', { name: 'Мои списки', exact: true })
    const first = lists.getByRole('link', { name: 'Открыть список «Первый список»' })
    const second = lists.getByRole('link', { name: 'Открыть список «Второй список»' })
    await second.click()
    await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Второй список')
    await first.click()
    await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Первый список')
    await expect(page.getByRole('dialog')).not.toBeVisible()

    if (source === 'new') {
      await page.getByRole('link', { name: 'Новая заметка', exact: true }).click()
      await expect(page).toHaveURL('/notes/new')
      await page.getByRole('button', { name: 'Добавить задачу' }).click()
    }

    const originalUrl = page.url()
    const task = page.getByLabel('Текст задачи 1', { exact: true })
    await task.fill('Несохранённая задача')
    await second.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Уйти без сохранения?' })).toBeVisible()
    await expect(page).toHaveURL(originalUrl)
    await dialog.getByRole('button', { name: 'Остаться', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(originalUrl)
    await expect(task).toHaveValue('Несохранённая задача')
    await expect(
      page.getByRole('button', { name: 'Отменить изменение', exact: true }),
    ).toBeEnabled()

    await second.click()
    await dialog.getByRole('button', { name: 'Уйти без сохранения', exact: true }).click()
    await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Второй список')
    await expect(task).toHaveValue('Сохранённая задача')
    await expect(dialog).not.toBeVisible()

    if (source === 'new') {
      await page.getByRole('link', { name: 'Новая заметка', exact: true }).click()
      await expect(page.getByLabel('Название', { exact: true })).toHaveValue('')
      await expect(task).toHaveCount(0)
    } else {
      await first.click()
      await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Первый список')
      await expect(task).toHaveValue('Сохранённая задача')
    }
    await expect(dialog).not.toBeVisible()
  })
}

test('sidebar and toolbar share filters without clearing search or bypassing unsaved changes', async ({
  page,
}) => {
  await page.goto('/notes/new')
  await page.getByLabel('Название', { exact: true }).fill('Планы на выходные')
  await page.getByRole('button', { name: 'Добавить задачу' }).click()
  await page.getByLabel('Текст задачи 1', { exact: true }).fill('Выбрать маршрут')
  await page.getByRole('button', { name: 'Сохранить заметку', exact: true }).click()
  await page.getByRole('searchbox').fill('выходные')
  const navigation = page.getByRole('navigation', { name: 'Навигация по заметкам' })
  await navigation.getByRole('link', { name: 'Завершённые' }).click()
  await expect(page.getByRole('searchbox')).toHaveValue('выходные')
  await expect(page.getByRole('button', { name: 'Завершённые', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Здесь пока ничего не нашлось')).toBeVisible()
  await page.getByRole('button', { name: 'В процессе', exact: true }).click()
  await expect(navigation.getByRole('link', { name: 'В процессе' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('link', { name: 'Открыть список «Планы на выходные»' }).click()
  await page.getByLabel('Название', { exact: true }).fill('Несохранённые планы')
  await navigation.getByRole('link', { name: 'Открыть все заметки' }).click()
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Уйти без сохранения?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Остаться', exact: true }).click()
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('Несохранённые планы')
})
