import { getCollection, type CollectionEntry } from 'astro:content'

// 文章按时间排序
export function postsSort(posts: CollectionEntry<'posts'>[]) {
  return posts.slice().sort((a, b) => {
    const dateA = a.data.updatedDate ?? a.data.pubDate
    const dateB = b.data.updatedDate ?? b.data.pubDate
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })
}

// 获取所有非草稿文章，按时间排序
export async function getAllPosts(): Promise<CollectionEntry<'posts'>[]> {
  const allPosts = await getCollection('posts')
  return postsSort(allPosts.filter((post) => !post.data.draft))
}

// 获取所有置顶文章（排除草稿，与 getAllPosts / getNumPosts 保持一致）
export async function getPinnedPosts(): Promise<CollectionEntry<'posts'>[]> {
  const allPosts = await getCollection('posts')
  const pinnedPosts = allPosts.filter((post) => post.data.pinned && !post.data.draft)
  return postsSort(pinnedPosts)
}

// 获取最新的固定数量的文章
export async function getNumPosts(size: number): Promise<CollectionEntry<'posts'>[]> {
  const allPosts = await getCollection('posts')
  return postsSort(allPosts.filter((post) => !post.data.draft)).slice(0, size)
}

// 获取标签
export async function getAllTags(): Promise<Record<string, number>> {
  const allPosts = await getAllPosts()
  const tags = allPosts.flatMap((post) => post.data.tags || [])
  return tags.reduce(
    (acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}

// 获取 project：先过滤草稿，再按 frontmatter 的 `order` 升序排序（未声明时排在最后）。
export async function getAllProjects(): Promise<CollectionEntry<'projects'>[]> {
  const allProjects = await getCollection('projects')
  return allProjects
    .filter((project) => !project.data.draft)
    .sort((a, b) => (a.data.order ?? Number.POSITIVE_INFINITY) - (b.data.order ?? Number.POSITIVE_INFINITY))
}
