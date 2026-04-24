import { visit } from 'unist-util-visit'
import path from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import sharp from 'sharp'
import type { Image, Root } from 'mdast'
import type { RemarkPlugin } from '@astrojs/markdown-remark'

interface RGB {
  r: number
  g: number
  b: number
}

interface LQIPResult {
  width: number | undefined
  height: number | undefined
  lqipHex: string
  colors: RGB[]
}

function packColor11bit(c: RGB): number {
  const r = Math.round((c.r / 0xff) * 0b1111)
  const g = Math.round((c.g / 0xff) * 0b1111)
  const b = Math.round((c.b / 0xff) * 0b111)
  return (r << 7) | (g << 3) | b
}

function packColor10bit(c: RGB): number {
  const r = Math.round((c.r / 0xff) * 0b111)
  const g = Math.round((c.g / 0xff) * 0b1111)
  const b = Math.round((c.b / 0xff) * 0b111)
  return (r << 7) | (g << 3) | b
}

/**
 * 基于纯 CSS 的 LQIP 实现
 * 参考: https://frzi.medium.com/lqip-css-73dc6dda2529
 * 将 3 个颜色打包到单个 RGBA hex 值中，在 CSS 中解包生成网格渐变。
 */

/**
 * 使用 Sharp 从图像中提取 3 个特定位置的颜色。
 */
async function extractColors(imagePath: string): Promise<RGB[] | null> {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(3, 3, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels: RGB[] = []
    for (let a = 0; a < data.length; a += info.channels) {
      pixels.push({
        r: data[a],
        g: data[a + 1],
        b: data[a + 2],
      })
    }

    // 3x3 网格索引：0 1 2 / 3 4 5 / 6 7 8
    // 选取左上、中心、右下 3 个点
    return [pixels[0], pixels[4], pixels[8]]
  } catch (error) {
    console.warn(`颜色提取失败: ${imagePath}`, (error as Error).message)
    return null
  }
}

/**
 * 将 3 个颜色打包到单个 32 位 RGBA hex 值中：
 * - 前两个颜色：11 位 (R:4, G:4, B:3)
 * - 第三个颜色：10 位 (R:3, G:4, B:3)
 * 合计 11 + 11 + 10 = 32 位
 */
function packColorsToHex(colors: RGB[]): string {
  const [c0, c1, c2] = colors
  const pc0 = packColor11bit(c0)
  const pc1 = packColor11bit(c1)
  const pc2 = packColor10bit(c2)
  const combined = (BigInt(pc0) << 21n) | (BigInt(pc1) << 10n) | BigInt(pc2)
  return '#' + combined.toString(16).padStart(8, '0')
}

async function analyzeImageForLQIP(imagePath: string): Promise<LQIPResult | null> {
  try {
    const metadata = await sharp(imagePath).metadata()
    const { width, height } = metadata

    const stats = await sharp(imagePath).stats()
    if (!stats.isOpaque) return null

    const colors = await extractColors(imagePath)
    if (!colors) return null

    return {
      width,
      height,
      lqipHex: packColorsToHex(colors),
      colors,
    }
  } catch (error) {
    console.warn(`LQIP 分析失败: ${imagePath}`, (error as Error).message)
    return null
  }
}

function resolveImagePath(imageUrl: string, filePath: string): string {
  if (path.isAbsolute(imageUrl)) return imageUrl

  // Astro `~` 路径别名
  if (imageUrl.startsWith('~/')) {
    const contentDir = path.dirname(filePath)
    const srcDir = path.dirname(path.dirname(contentDir))
    return path.resolve(srcDir, imageUrl.slice(2))
  }

  const fileDir = path.dirname(filePath || '')
  return path.resolve(fileDir, imageUrl)
}

async function processImageNode(node: Image, filePath: string): Promise<void> {
  const imagePath = resolveImagePath(node.url, filePath)
  if (!existsSync(imagePath)) return

  const lqipData = await analyzeImageForLQIP(imagePath)
  if (!lqipData) return

  const data = (node.data ??= {})
  const hProperties = ((data as { hProperties?: Record<string, unknown> }).hProperties ??= {})

  if (lqipData.width && lqipData.height) {
    hProperties.width = lqipData.width
    hProperties.height = lqipData.height
  }

  const existingStyle = typeof hProperties.style === 'string' ? hProperties.style : ''
  const lqipStyle = `--lqip:${lqipData.lqipHex}`
  hProperties.style = existingStyle ? `${existingStyle};${lqipStyle}` : lqipStyle
}

const remarkLQIP: RemarkPlugin = () => async (tree, file) => {
  const imagesToProcess: Image[] = []

  visit(tree as Root, 'image', (node) => {
    if (node.url && !node.url.match(/^([a-z]+:)?\/\//)) {
      imagesToProcess.push(node)
    }
  })

  await Promise.all(
    imagesToProcess.map(async (node) => {
      try {
        await processImageNode(node, file.path)
      } catch (error) {
        console.warn(`LQIP 处理失败: ${node.url}`, (error as Error).message)
      }
    })
  )
}

export default remarkLQIP

/**
 * 从调用方的堆栈里定位到 content/ 下的 .mdx 路径，供 generateLQIPFromPath 推断资源目录。
 */
function getCallerContext(): string | null {
  const stack = new Error().stack
  if (!stack) return null
  const contentMatch = stack.match(/([^:\s]+[\/\\]content[\/\\][^:\s)]+)/i)
  return contentMatch ? contentMatch[1].replace(/\\/g, '/') : null
}

interface ImageMetadataLike {
  src?: string
  fsPath?: string
  pathname?: string
}

export async function generateLQIPFromPath(src: unknown): Promise<string | null> {
  try {
    let imagePath: string | undefined

    if (typeof src === 'string') {
      imagePath = resolveImagePath(src, '')
    } else if (src && typeof src === 'object') {
      const meta = src as ImageMetadataLike

      if (meta.fsPath) {
        imagePath = meta.fsPath
      } else if (meta.pathname) {
        imagePath = meta.pathname
      } else if (meta.src) {
        let cleanSrc = meta.src

        if (cleanSrc.includes('/@fs/')) {
          const afterFs = cleanSrc.split('/@fs/')[1]
          if (afterFs) imagePath = afterFs.split('?')[0].replace(/\\/g, '/')
        } else if (cleanSrc.startsWith('/_astro/')) {
          // /_astro/* is Astro's optimized path; recover the source asset from the caller's folder.
          const callerContext = getCallerContext()
          if (callerContext) {
            const contextDir = path.dirname(callerContext)
            const assetsDir = path.join(contextDir, 'assets')
            const srcFileName = path.basename(cleanSrc)
            const fileExtension = path.extname(srcFileName)

            if (existsSync(assetsDir)) {
              const files = readdirSync(assetsDir)
              const matchingFile = files.find(
                (file) => path.extname(file) === fileExtension || file.includes(path.parse(srcFileName).name.split('.')[0])
              )
              if (matchingFile) imagePath = path.join(assetsDir, matchingFile)
            }
          }

          if (!imagePath) {
            console.log('无法推断原始路径，跳过 LQIP 生成:', cleanSrc)
            return null
          }
        } else {
          imagePath = resolveImagePath(cleanSrc.split('?')[0], '')
        }
      } else {
        console.warn('ImageMetadata 对象缺少可用路径属性:', Object.keys(meta))
        return null
      }
    } else {
      console.warn('无效的图像源:', src)
      return null
    }

    if (!imagePath) {
      console.warn('无法解析图像路径:', src)
      return null
    }

    if (!existsSync(imagePath)) {
      console.warn(`图像文件不存在: ${imagePath}`)
      return null
    }

    const result = await analyzeImageForLQIP(imagePath)
    return result ? result.lqipHex : null
  } catch (error) {
    console.warn('LQIP 生成失败:', (error as Error).message)
    return null
  }
}
