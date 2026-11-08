<script setup lang="ts">
import { useNotesStore } from './stores/notes'
const store = useNotesStore()
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main">Перейти к содержимому</a>
    <header class="site-header">
      <NuxtLink to="/" class="brand" aria-label="Тихо — все заметки">
        <span class="brand__mark"><AppIcon name="check" :size="23" /></span>
        <span>
          тихо
          <span class="brand__dot">.</span>
        </span>
      </NuxtLink>
      <span class="site-header__tagline">Мысли по местам.</span>
      <div class="site-header__privacy">
        <AppIcon name="shield" :size="17" />
        <span>Только в вашем браузере</span>
      </div>
    </header>
    <div v-if="store.warning" class="storage-warning" role="status">
      <AppIcon name="warning" />
      {{ store.warning }}
    </div>
    <NuxtPage :page-key="(route) => route.fullPath" />
    <footer class="site-footer">
      <span>Меньше шума. Больше ясности.</span>
      <span>
        Сделано для ваших мыслей
        <AppIcon name="leaf" :size="15" />
      </span>
    </footer>
  </div>
</template>
