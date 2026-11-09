<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  inbox: 'M4 4h16l2 12v4H2v-4L4 4Zm-2 12h6l2 3h4l2-3h6',
  circle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2',
  'checked-box': 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8M9 10l4 4L22 4',
  sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  note: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h8m-8 4h8m-8 4h5',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  undo: 'M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12',
  redo: 'm15 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v.1',
  leaf: 'M20 4C7 2 2 8 5 15s17 4 15-11ZM5 20 16 9',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name] || paths.note" />
  </svg>
</template>
