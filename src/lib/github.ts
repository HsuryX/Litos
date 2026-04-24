const CACHE_DURATION = 3600 * 1000 // 1 hour
const FETCH_TIMEOUT_MS = 6000

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// 私密浏览、quota 超限等场景下 localStorage 会抛；所有访问都用 try/catch 兜底。
function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, entry: CacheEntry<T>) {
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    /* quota / private mode — 忽略，下次仍会走 fetch */
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>, fallbackValue?: T): Promise<T | undefined> {
  const cacheKey = `github_stats_${key}`

  const cached = readCache<T>(cacheKey)
  if (cached) {
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    if (fallbackValue === undefined) fallbackValue = cached.data
  }

  try {
    const data = await fetcher()
    writeCache(cacheKey, { data, timestamp: Date.now() })
    return data
  } catch (error) {
    console.warn(`Failed to fetch GitHub data for ${key}:`, error)
    return fallbackValue
  }
}

export async function getGithubFollowers(username: string): Promise<number | undefined> {
  return fetchWithCache(`followers_${username}`, async () => {
    const data = (await fetchJson(`https://api.github.com/users/${username}`)) as { followers: number }
    return data.followers
  })
}

export async function getGithubRepoStats(owner: string, repo: string): Promise<{ stars: number; forks: number } | undefined> {
  return fetchWithCache(`repo_${owner}_${repo}`, async () => {
    const data = (await fetchJson(`https://api.github.com/repos/${owner}/${repo}`)) as {
      stargazers_count: number
      forks_count: number
    }
    return { stars: data.stargazers_count, forks: data.forks_count }
  })
}
