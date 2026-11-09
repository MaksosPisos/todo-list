export type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme: readonly(theme), toggleTheme }
}
