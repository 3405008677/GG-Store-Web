/** Nuxt i18n 与 Setting Store 共用同一个语言 Cookie。 */
export const LANGUAGE_COOKIE_KEY = 'LANGUAGE'

/** 语言偏好保留一年；它不包含认证信息。 */
export const LANGUAGE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60

/** DeviceId 不是秘密，用于让后端把 Refresh Token 会话绑定到同一浏览器。 */
const DEVICE_ID_STORAGE_KEY = 'GG-STORE-DEVICE-ID'

/** 主动退出或确定的 Refresh 401 后，阻止前端继续用残留 Cookie 自动恢复会话。 */
const REFRESH_BLOCKED_STORAGE_KEY = 'GG-STORE-REFRESH-BLOCKED'

/** 网络或服务异常后的下次允许刷新时间，跨标签页共享以保护后端限流。 */
const REFRESH_RETRY_AT_STORAGE_KEY = 'GG-STORE-REFRESH-RETRY-AT'

/** 每次登录、刷新或退出都递增该代次，用于丢弃跨标签页迟到的认证响应。 */
const AUTH_SESSION_EPOCH_STORAGE_KEY = 'GG-STORE-AUTH-EPOCH'

// 浏览器禁用 localStorage 时仍需在当前标签页保持一致状态；这些变量不会跨标签页同步。
let memoryDeviceId = ''
let memoryRefreshBlocked = false
let memoryRefreshRetryAt = 0
let memoryAuthSessionEpoch = 0

/** 安全读取 localStorage；隐私策略拒绝访问时返回 null，由调用方使用内存回退值。 */
function readStorage(key: string): string | null {
  if (!import.meta.client) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 尽力写入 localStorage；失败不会中断登录流程，调用方仍使用内存回退值。 */
function writeStorage(key: string, value: string): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // 某些隐私模式会禁用持久存储，当前标签页内存状态仍能维持本次会话。
  }
}

/** 尽力删除 localStorage 键，和 writeStorage 使用相同的隐私模式降级策略。 */
function removeStorage(key: string): void {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(key)
  } catch {
    // 无法访问持久存储时没有可删除的数据，保持内存状态即可。
  }
}

/** 返回语言 Cookie 的统一配置。 */
export function createCookieOptions() {
  return {
    path: '/',
    // lax 允许常规站内导航，同时降低跨站请求自动携带偏好 Cookie 的范围。
    sameSite: 'lax' as const,
    secure: import.meta.env.PROD,
    maxAge: LANGUAGE_COOKIE_MAX_AGE,
  }
}

/** 生成符合后端 8..128 长度约束的 32 位浏览器设备标识。 */
function generateDeviceId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll('-', '')

  if (globalThis.crypto?.getRandomValues) {
    // 现代浏览器都支持 getRandomValues；该分支只兼容缺少 randomUUID 的运行时。
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)
    return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  }

  // DeviceId 不是鉴权秘密；极旧运行时仅需生成满足长度约束且本页稳定的标识。
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

/**
 * 获取或首次创建稳定 DeviceId。
 *
 * 认证动作只在客户端执行；服务端渲染阶段没有 localStorage，因此返回空字符串。
 */
export function getOrCreateDeviceId(): string {
  if (!import.meta.client) return ''

  const existing = readStorage(DEVICE_ID_STORAGE_KEY)?.trim() || memoryDeviceId
  if (existing && existing.length >= 8 && existing.length <= 128) {
    memoryDeviceId = existing
    return existing
  }

  memoryDeviceId = generateDeviceId()
  writeStorage(DEVICE_ID_STORAGE_KEY, memoryDeviceId)
  return memoryDeviceId
}

/** 查询当前会话是否已被确定禁止继续通过 Refresh Cookie 自动恢复。 */
export function isSessionRefreshBlocked(): boolean {
  return import.meta.client && (memoryRefreshBlocked || readStorage(REFRESH_BLOCKED_STORAGE_KEY) === '1')
}

/** 登录成功解除阻止；主动退出或确定的刷新失效会持久化阻止状态。 */
export function setSessionRefreshBlocked(blocked: boolean): void {
  if (!import.meta.client) return
  memoryRefreshBlocked = blocked
  if (blocked) writeStorage(REFRESH_BLOCKED_STORAGE_KEY, '1')
  else removeStorage(REFRESH_BLOCKED_STORAGE_KEY)
}

/** 读取自动刷新冷却截止时间；损坏值按无冷却处理。 */
export function getSessionRefreshRetryAt(): number {
  if (!import.meta.client) return 0
  const storedValue = Number(readStorage(REFRESH_RETRY_AT_STORAGE_KEY))
  const normalizedStoredValue = Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0
  return Math.max(memoryRefreshRetryAt, normalizedStoredValue)
}

/** 设置跨标签页刷新冷却；传入 0 可在登录或刷新成功后立即解除。 */
export function setSessionRefreshRetryAfter(milliseconds: number): void {
  if (!import.meta.client) return
  if (milliseconds <= 0) {
    memoryRefreshRetryAt = 0
    removeStorage(REFRESH_RETRY_AT_STORAGE_KEY)
    return
  }
  memoryRefreshRetryAt = Date.now() + milliseconds
  writeStorage(REFRESH_RETRY_AT_STORAGE_KEY, String(memoryRefreshRetryAt))
}

/** 读取当前认证代次；无效或缺失的持久值按 0 处理。 */
export function getAuthSessionEpoch(): number {
  if (!import.meta.client) return 0
  const storedValue = Number(readStorage(AUTH_SESSION_EPOCH_STORAGE_KEY))
  const normalizedStoredValue = Number.isSafeInteger(storedValue) && storedValue > 0 ? storedValue : 0
  return Math.max(memoryAuthSessionEpoch, normalizedStoredValue)
}

/** 同步本地或跨标签页认证代次；同时比较持久值，保证代次只向前推进。 */
export function setAuthSessionEpoch(epoch: number): void {
  if (!import.meta.client || !Number.isSafeInteger(epoch)) return
  const currentEpoch = getAuthSessionEpoch()
  if (epoch < currentEpoch) return
  memoryAuthSessionEpoch = epoch
  writeStorage(AUTH_SESSION_EPOCH_STORAGE_KEY, String(epoch))
}

/**
 * 推进认证代次并返回新值。
 *
 * 同时结合当前时间与旧值加一，降低多个标签页在同一毫秒变更状态时产生相同代次的概率。
 * SSR 没有浏览器认证状态，直接返回 0 且不写入任何存储。
 */
export function advanceAuthSessionEpoch(): number {
  if (!import.meta.client) return 0
  const nextEpoch = Math.max(Date.now(), getAuthSessionEpoch() + 1)
  setAuthSessionEpoch(nextEpoch)
  return nextEpoch
}
