import readingTime from 'reading-time'
import { toString } from 'mdast-util-to-string'
import type { Root } from 'mdast'
import type { RemarkPlugin } from '@astrojs/markdown-remark'

interface AstroFrontmatterData {
  astro: {
    frontmatter: {
      minutesRead?: number
      wordCount?: number
    }
  }
}

const remarkReadingTime: RemarkPlugin<[]> = () => (tree, file) => {
  const { frontmatter } = (file.data as AstroFrontmatterData).astro
  if (frontmatter.minutesRead || frontmatter.minutesRead === 0) return

  const textOnPage = toString(tree as Root)
  const stats = readingTime(textOnPage)

  frontmatter.minutesRead = Math.max(1, Math.round(stats.minutes))
  frontmatter.wordCount = stats.words
}

export default remarkReadingTime
