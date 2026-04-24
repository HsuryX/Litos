import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { POSTS_CONFIG } from '~/config'

// 与 src/types.ts 中的 PostType / CoverLayout 保持对齐；z.custom 不带 refine 是 no-op，
// 换成 z.enum 真正在构建期拒绝非法值（如拼错的布局 key）。
const POST_TYPES = ['metaOnly', 'coverSplit', 'coverTop'] as const
const COVER_LAYOUTS = ['left', 'right'] as const

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        tags: z.array(z.string()).optional(),
        updatedDate: z.date().optional(),
        author: z.string().min(1).default(POSTS_CONFIG.author),
        cover: image().optional(),
        ogImage: image().optional(),
        recommend: z.boolean().default(false),
        postType: z.enum(POST_TYPES).optional(),
        coverLayout: z.enum(COVER_LAYOUTS).optional(),
        pinned: z.boolean().default(false),
        draft: z.boolean().default(false),
        license: z.string().optional(),
      })
      .transform((data) => ({
        ...data,
        ogImage: POSTS_CONFIG.ogImageUseCover && data.cover ? data.cover : data.ogImage,
      })),
})

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/projects',
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      githubUrl: z.string(),
      website: z.string(),
      type: z.string(),
      icon: image().optional(),
      imageClass: z.string().optional(),
      star: z.number(),
      fork: z.number(),
      // `order` 用于固定手动排序，目前示例项目 PureRead 依赖它；加进 schema
      // 使其在运行时可见并阻止打错字。
      order: z.number().optional(),
      draft: z.boolean().default(false),
    }),
})

export const collections = { posts, projects }
