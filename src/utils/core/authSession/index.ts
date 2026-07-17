/** 登录、刷新和退出共用同一把 Web Lock，避免并发修改 Refresh Cookie。 */
const AUTH_MUTATION_LOCK_NAME = 'gg-store-auth-mutation'

/** 不支持 Web Locks 时使用的 localStorage 租约键。 */
const AUTH_MUTATION_LEASE_STORAGE_KEY = 'GG-STORE-AUTH-MUTATION-LEASE'

/** 租约 15 秒过期，并通过心跳延长，防止标签页崩溃后永久锁死。 */
const AUTH_MUTATION_LEASE_TTL_MS = 15_000
const AUTH_MUTATION_LEASE_HEARTBEAT_MS = 5_000

/** 等待其他标签页完成认证变更最多 20 秒；超时后不再并发修改 Cookie。 */
const AUTH_MUTATION_LEASE_WAIT_MS = 20_000
const AUTH_MUTATION_LEASE_POLL_MS = 120

/** 只声明当前使用的 Web Locks 能力，兼容尚未内置完整 DOM 类型的工具链。 */
interface BrowserLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

/** localStorage 中的短期互斥租约。 */
interface AuthMutationLease {
  owner: string
  expiresAt: number
}

/** localStorage 租约尝试的三种结果，用于区分竞争和存储不可用。 */
type LeaseAttempt = 'acquired' | 'busy' | 'unavailable'

/** 异步等待下一次租约检查，不阻塞浏览器主线程。 */
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

/**
 * 生成当前租约的非持久 owner。
 *
 * owner 只用于降低标签页竞争冲突，不是安全凭证；旧浏览器缺少 randomUUID 时允许使用随机字符串降级。
 */
function createLeaseOwner(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

/** 安全解析租约；损坏或过期数据由获取逻辑覆盖。 */
function readLease(): AuthMutationLease | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(AUTH_MUTATION_LEASE_STORAGE_KEY) || '') as Partial<AuthMutationLease>
    if (typeof value.owner === 'string' && typeof value.expiresAt === 'number') {
      return { owner: value.owner, expiresAt: value.expiresAt }
    }
  } catch {
    // localStorage 可能包含旧版本或被手动修改的数据，视为无有效租约即可。
  }
  return undefined
}

/** 写入或续期租约；隐私策略禁用 localStorage 时返回 false。 */
function writeLease(owner: string): boolean {
  try {
    localStorage.setItem(
      AUTH_MUTATION_LEASE_STORAGE_KEY,
      JSON.stringify({
        owner,
        expiresAt: Date.now() + AUTH_MUTATION_LEASE_TTL_MS,
      } satisfies AuthMutationLease),
    )
    return true
  } catch {
    return false
  }
}

/**
 * 尝试取得租约，并回读 owner 缩小多标签页同时写入的竞争窗口。
 *
 * localStorage 没有原子 compare-and-set，这只是旧浏览器下的尽力仲裁，不能替代 Web Locks 的严格互斥。
 */
function tryAcquireLease(owner: string): LeaseAttempt {
  const current = readLease()
  if (current && current.expiresAt > Date.now() && current.owner !== owner) return 'busy'
  if (!writeLease(owner)) return 'unavailable'
  return readLease()?.owner === owner ? 'acquired' : 'busy'
}

/** 仅释放自己持有的租约，避免误删刚被其他标签页接管的新租约。 */
function releaseLease(owner: string): void {
  try {
    if (readLease()?.owner === owner) localStorage.removeItem(AUTH_MUTATION_LEASE_STORAGE_KEY)
  } catch {
    // 存储已不可用时租约会按 TTL 自行失效。
  }
}

/**
 * 使用 localStorage 租约尽力串行认证变更。
 *
 * 旧浏览器没有 Web Locks 时，租约可显著降低并发概率，但受非原子存储和后台定时器
 * 节流限制，不能提供严格互斥；真正的 Refresh Token 重放仍由后端检测并撤销。
 */
async function runWithStorageLease<T>(task: () => Promise<T>): Promise<T> {
  const owner = createLeaseOwner()
  const deadline = Date.now() + AUTH_MUTATION_LEASE_WAIT_MS

  while (Date.now() < deadline) {
    const attempt = tryAcquireLease(owner)

    if (attempt === 'unavailable') {
      // 无持久存储时保留当前标签页可用性；该极端降级不承诺跨标签页互斥。
      return task()
    }

    if (attempt === 'acquired') {
      const heartbeat = setInterval(() => {
        if (readLease()?.owner === owner) writeLease(owner)
      }, AUTH_MUTATION_LEASE_HEARTBEAT_MS)

      try {
        return await task()
      } finally {
        clearInterval(heartbeat)
        releaseLease(owner)
      }
    }

    await delay(AUTH_MUTATION_LEASE_POLL_MS)
  }

  // 超时后不绕过现存租约，避免主动制造一次已知的并发 Cookie 轮换。
  throw new Error('等待认证操作完成超时')
}

/**
 * 跨标签页执行会修改 Refresh Cookie 的认证操作。
 *
 * 客户端优先使用严格互斥的 Web Locks；旧浏览器退化为尽力而为的 localStorage 租约。
 * SSR 调用会直接抛错且不执行 task，因为服务端不能代表浏览器轮换 HttpOnly Cookie。
 */
export async function runWithAuthMutationLock<T>(task: () => Promise<T>): Promise<T> {
  if (!import.meta.client) throw new Error('认证操作只能在浏览器中执行')

  const lockManager = (navigator as Navigator & { locks?: BrowserLockManager }).locks
  if (lockManager) return lockManager.request(AUTH_MUTATION_LOCK_NAME, task)
  return runWithStorageLease(task)
}
