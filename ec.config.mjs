import { defineEcConfig } from 'astro-expressive-code'
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'

export default defineEcConfig({
  defaultLocale: 'zh-CN',
  defaultProps: {
    wrap: false,
    collapseStyle: 'collapsible-auto',
    showLineNumbers: false,
    preserveIndent: true,
  },
  // WCAG AA 文本对比度下限 (4.5:1)；0 会关掉检查。Catppuccin 两套主题都能过 4.5，放宽到 0
  // 只有在调色板明显低对比时才必要。
  minSyntaxHighlightingColorContrast: 4.5,

  styleOverrides: {
    uiFontFamily: 'var(--font-sans)',
    uiFontSize: '1em',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.85rem',
    codeLineHeight: '1.4',
    borderRadius: '0',
    codePaddingBlock: '0.8571429em',
    codePaddingInline: '1.1428571em',
    borderColor: ({ theme }) => (theme.type === 'dark' ? '#24273a' : '#e6e9ef'),

    frames: {
      frameBoxShadowCssValue: false,
      inlineButtonBackgroundActiveOpacity: '0.2',
      inlineButtonBackgroundHoverOrFocusOpacity: '0.1',
    },
    textMarkers: {
      backgroundOpacity: '0.2',
      borderOpacity: '0.4',
    },
  },

  plugins: [
    pluginCollapsibleSections({
      defaultCollapsed: false,
    }),
    pluginLineNumbers(),
  ],

  themes: ['catppuccin-macchiato', 'catppuccin-latte'],
  themeCssSelector: (theme) => (theme.name === 'catppuccin-macchiato' ? '.dark' : ':root:not(.dark)'),
  useDarkModeMediaQuery: false,
  emitExternalStylesheet: false,
})
