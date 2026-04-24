import { atom } from 'nanostores'

export type Theme = 'light' | 'dark' | 'system'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const storedTheme = window.localStorage.getItem('theme')
    return storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system'
  } catch {
    // Safari 私密模式 / 禁用第三方 Cookie 下 localStorage 会抛。回落到系统偏好。
    return 'system'
  }
}

export const themeStore = atom<Theme>(getInitialTheme())
