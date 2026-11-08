export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/styles/main.scss'],
  typescript: {
    strict: true,
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } },
  },
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Тихо — заметки и списки',
      htmlAttrs: { lang: 'ru' },
      meta: [
        {
          name: 'description',
          content: 'Пространство для мыслей, планов и небольших шагов. Личные заметки с задачами.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
