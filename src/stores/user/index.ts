import { type ApiClient, useApi } from '@/api/request'
import type { AccessTokenResponse, AuthUser, LoginFormData, RegisterFormData } from '@/types/auth'
import { defineStore } from 'pinia'
import {
  login as loginApi,
  logout as logoutApi,
  logoutAll as logoutAllApi,
  refreshAccessToken,
  register as registerApi,
} from '@/api/login'
import { ApiRequestError } from '@/types/api'
import { runWithAuthMutationLock } from '@/utils/core/authSession'
import {
  advanceAuthSessionEpoch,
  getAuthSessionEpoch,
  getOrCreateDeviceId,
  getSessionRefreshRetryAt,
  isSessionRefreshBlocked,
  setAuthSessionEpoch,
  setSessionRefreshBlocked,
  setSessionRefreshRetryAfter,
} from '@/utils/core/storage'

/** 在实际过期前提前刷新，避免 Token 在请求传输过程中刚好失效。 */
const ACCESS_TOKEN_REFRESH_LEEWAY_MS = 30_000

/** 网络或服务异常后默认冷却 10 秒，429 则优先使用后端 Retry-After。 */
const DEFAULT_REFRESH_BACKOFF_MS = 10_000

/** 等待其他标签页广播指定认证代次；超时后在锁内安全地再次刷新。 */
const SESSION_BROADCAST_WAIT_MS = 1_000

/** 同源标签页通过该频道同步内存 Token 和退出事件。 */
const AUTH_SESSION_CHANNEL_NAME = 'gg-store-auth-session'

/** 登录或刷新消息携带短效 Token、最小会员信息和绝对过期时间，不包含 Refresh Token。 */
type AuthSessionMessage =
  | {
      type: 'session'
      epoch: number
      expiresAt: number
      session: AccessTokenResponse
    }
  | {
      type: 'logout'
      epoch: number
    }

/** applySession 的副作用选项；跨标签页消息禁止再次广播。 */
interface ApplySessionOptions {
  epoch: number
  expiresAt?: number
  shouldBroadcast?: boolean
}

/** 等待某个会话代次到达的临时订阅。 */
interface SessionWaiter {
  epoch: number
  resolve: () => void
  timeout?: ReturnType<typeof setTimeout>
}

/** 判断值是否为可读取字段的普通对象。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]'
}

/** 完整校验后端会员对象，避免损坏的跨标签页消息污染 Store 类型。 */
function isAuthUser(value: unknown): value is AuthUser {
  if (!isPlainObject(value)) return false
  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.username === 'string' &&
    Boolean(value.username) &&
    typeof value.displayName === 'string' &&
    typeof value.role === 'string'
  )
}

/** 校验登录/刷新响应的完整运行时形状。 */
function isAccessTokenResponse(value: unknown): value is AccessTokenResponse {
  if (!isPlainObject(value)) return false
  return (
    typeof value.accessToken === 'string' &&
    Boolean(value.accessToken) &&
    typeof value.tokenType === 'string' &&
    Boolean(value.tokenType) &&
    typeof value.expiresIn === 'number' &&
    Number.isFinite(value.expiresIn) &&
    value.expiresIn > 0 &&
    isAuthUser(value.user)
  )
}

/** 收窄 BroadcastChannel 消息；未知版本或不完整消息会被直接忽略。 */
function isAuthSessionMessage(value: unknown): value is AuthSessionMessage {
  if (!isPlainObject(value) || typeof value.epoch !== 'number' || !Number.isSafeInteger(value.epoch) || value.epoch <= 0) return false
  if (value.type === 'logout') return true
  return value.type === 'session' && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) && isAccessTokenResponse(value.session)
}

/** Pinia 可序列化的会员认证状态；Refresh Token 永远不会进入前端状态。 */
interface UserState {
  /** 当前页面内存中的短效 Access Token。 */
  accessToken: string
  /** 后端返回的 Token 类型，默认使用 Bearer。 */
  tokenType: string
  /** Access Token 的绝对过期时间戳。 */
  accessTokenExpiresAt: number
  /** 当前登录会员的最小公开信息。 */
  userInfo: AuthUser | null
}

/**
 * 单个 User Store 实例对应的浏览器运行时资源。
 *
 * Promise、BroadcastChannel、Set 和定时器不可序列化，不能写进 Pinia state；WeakMap
 * 既保持 Options Store 写法，也保证每个 Nuxt 应用实例拥有独立资源。
 */
interface UserStoreRuntime {
  refreshPromise?: Promise<boolean>
  appliedSessionEpoch: number
  authChannel?: BroadcastChannel
  sessionWaiters: Set<SessionWaiter>
  /** HMR 或统一重置后标记旧异步任务失效，禁止其重建已关闭的频道。 */
  disposed: boolean
}

/** 按 Store 实例隔离不可序列化资源，避免 SSR 请求之间共享认证状态。 */
const userStoreRuntimeMap = new WeakMap<object, UserStoreRuntime>()

/** 记录已经注册 HMR 清理回调的 Store，重置后重新初始化时不重复注册。 */
const userStoreHmrRegistrationSet = new WeakSet<object>()

/** 释放已满足目标代次的等待者；退出或销毁时可强制结束全部等待。 */
function settleSessionWaiters(runtime: UserStoreRuntime, force = false): void {
  for (const waiter of runtime.sessionWaiters) {
    if (!force && runtime.appliedSessionEpoch < waiter.epoch) continue
    if (waiter.timeout) clearTimeout(waiter.timeout)
    runtime.sessionWaiters.delete(waiter)
    waiter.resolve()
  }
}

/** 只清理 JavaScript 内存状态，不尝试读取或删除 HttpOnly Refresh Cookie。 */
function clearSessionState(store: UserState): void {
  store.accessToken = ''
  store.tokenType = 'Bearer'
  store.accessTokenExpiresAt = 0
  store.userInfo = null
}

/** 关闭当前 Store 的跨标签页频道，并清理仍在等待广播的任务。 */
function disposeUserStoreRuntime(store: UserState): void {
  const runtime = userStoreRuntimeMap.get(store)
  if (!runtime) return
  runtime.disposed = true
  runtime.authChannel?.close()
  settleSessionWaiters(runtime, true)
  userStoreRuntimeMap.delete(store)
}

/**
 * 应用登录或刷新响应。
 *
 * 无效响应或已过期的绝对时间会抛出统一异常；成功后写入内存、解除刷新熔断与冷却，
 * 并默认把短效 Token、绝对过期时间和认证代次广播给其他标签页。
 */
function applySession(store: UserState, session: AccessTokenResponse, options: ApplySessionOptions): void {
  if (!isAccessTokenResponse(session)) {
    throw new ApiRequestError('认证响应缺少有效的 Access Token 或会员信息', { code: 'INVALID_AUTH_RESPONSE' })
  }

  const expiresAt = options.expiresAt ?? Date.now() + session.expiresIn * 1000
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new ApiRequestError('认证响应中的 Access Token 已过期', { code: 'INVALID_AUTH_RESPONSE' })
  }

  const runtime = getUserStoreRuntime(store)
  store.accessToken = session.accessToken
  store.tokenType = session.tokenType || 'Bearer'
  store.accessTokenExpiresAt = expiresAt
  store.userInfo = session.user
  runtime.appliedSessionEpoch = Math.max(runtime.appliedSessionEpoch, options.epoch)
  setAuthSessionEpoch(options.epoch)
  setSessionRefreshBlocked(false)
  setSessionRefreshRetryAfter(0)
  settleSessionWaiters(runtime)

  if (options.shouldBroadcast !== false) {
    runtime.authChannel?.postMessage({ type: 'session', epoch: options.epoch, expiresAt, session } satisfies AuthSessionMessage)
  }
}

/** 处理其他同源标签页广播的登录、刷新和退出消息。 */
function handleAuthSessionMessage(store: UserState, runtime: UserStoreRuntime, value: unknown): void {
  if (!isAuthSessionMessage(value) || runtime.disposed) return

  const localEpoch = getAuthSessionEpoch()
  if (value.epoch < localEpoch) return
  // localStorage 的代次递增不是跨标签页原子操作；同代次冲突时退出状态必须压过会话恢复。
  if (value.type === 'session' && value.epoch === localEpoch && isSessionRefreshBlocked()) return

  setAuthSessionEpoch(value.epoch)
  if (value.type === 'logout') {
    setSessionRefreshBlocked(true)
    setSessionRefreshRetryAfter(0)
    clearSessionState(store)
    settleSessionWaiters(runtime, true)
    return
  }

  // 标签页休眠期间迟到的短效 Token 已无使用价值，不能按 expiresIn 重新延长。
  if (value.expiresAt <= Date.now()) return
  applySession(store, value.session, {
    epoch: value.epoch,
    expiresAt: value.expiresAt,
    shouldBroadcast: false,
  })
}

/** 获取当前 Store 的运行时资源，并在首次访问时建立跨标签页频道。 */
function getUserStoreRuntime(store: UserState): UserStoreRuntime {
  const existingRuntime = userStoreRuntimeMap.get(store)
  if (existingRuntime) return existingRuntime

  const runtime: UserStoreRuntime = {
    appliedSessionEpoch: 0,
    authChannel: import.meta.client && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(AUTH_SESSION_CHANNEL_NAME) : undefined,
    sessionWaiters: new Set<SessionWaiter>(),
    disposed: false,
  }
  userStoreRuntimeMap.set(store, runtime)

  // 只接受不早于本地代次的消息，旧刷新响应不能覆盖后来发生的退出或重新登录。
  runtime.authChannel?.addEventListener('message', (event: MessageEvent<unknown>) => {
    handleAuthSessionMessage(store, runtime, event.data)
  })

  // 热更新销毁旧客户端模块时关闭频道；每个 Store 只注册一次，避免重置后累计回调。
  if (import.meta.client && !userStoreHmrRegistrationSet.has(store)) {
    userStoreHmrRegistrationSet.add(store)
    import.meta.hot?.dispose(() => disposeUserStoreRuntime(store))
  }
  return runtime
}

/**
 * 等待持锁标签页广播对应会话代次。
 *
 * 超时不作为同步成功依据；调用方仍在认证锁内，随后会比较 Authorization 并按需安全刷新。
 */
function waitForSessionEpoch(runtime: UserStoreRuntime, epoch: number): Promise<void> {
  if (!runtime.authChannel || runtime.appliedSessionEpoch >= epoch) return Promise.resolve()

  return new Promise((resolve) => {
    const waiter: SessionWaiter = { epoch, resolve }
    waiter.timeout = setTimeout(() => {
      runtime.sessionWaiters.delete(waiter)
      resolve()
    }, SESSION_BROADCAST_WAIT_MS)
    runtime.sessionWaiters.add(waiter)
  })
}

/**
 * 禁止前端继续自动恢复当前会话，并把退出状态同步到其他标签页。
 *
 * 推进代次会使在途登录或刷新响应失效；真正的服务端 Token Family 撤销仍由退出接口完成。
 */
function expireSessionState(store: UserState, forceEpochAdvance = false): void {
  const runtime = getUserStoreRuntime(store)

  // 同一标签页的并发 401 只需要首次推进代次，之后保持既有熔断状态即可。
  if (!forceEpochAdvance && isSessionRefreshBlocked() && !store.accessToken) {
    clearSessionState(store)
    settleSessionWaiters(runtime, true)
    return
  }

  const epoch = advanceAuthSessionEpoch()
  setSessionRefreshBlocked(true)
  setSessionRefreshRetryAfter(0)
  clearSessionState(store)
  settleSessionWaiters(runtime, true)
  runtime.authChannel?.postMessage({ type: 'logout', epoch } satisfies AuthSessionMessage)
}

/** 记录刷新失败的熔断或退避策略，并统一回收当前内存 Token。 */
function handleRefreshFailure(store: UserState, error: unknown): void {
  if (error instanceof ApiRequestError && error.statusCode === 401) {
    // Refresh Cookie 失效、重放或设备不匹配时同步熔断所有标签页，直到下一次显式登录。
    expireSessionState(store)
    return
  }

  if (error instanceof ApiRequestError && error.statusCode === 429) {
    setSessionRefreshRetryAfter((error.retryAfter || 60) * 1000)
  } else if (!isSessionRefreshBlocked()) {
    // 网络、5xx 或锁异常仅短暂退避，服务恢复后仍允许自动恢复登录。
    setSessionRefreshRetryAfter(DEFAULT_REFRESH_BACKOFF_MS)
  }
  clearSessionState(store)
}

/**
 * 会员认证 Store。
 *
 * 按参考项目使用 Options Store，并由 `@/stores` 统一创建实例。Access Token 和用户
 * 信息只保存在当前页面内存；跨刷新恢复依赖后端 HttpOnly Refresh Cookie。
 */
const user = defineStore('user', {
  /** 返回可被 Pinia DevTools、SSR 水合和 `$reset()` 正确识别的认证状态。 */
  state: (): UserState => ({
    accessToken: '',
    tokenType: 'Bearer',
    accessTokenExpiresAt: 0,
    userInfo: null,
  }),

  getters: {
    /** 页面展示名优先使用 DisplayName，后端未设置时回退到 Username。 */
    displayName: (state): string => state.userInfo?.displayName || state.userInfo?.username || '',

    /** 请求层直接使用的完整 Authorization 值。 */
    authorizationHeader: (state): string => (state.accessToken ? `${state.tokenType || 'Bearer'} ${state.accessToken}` : ''),
  },

  actions: {
    /** 提前初始化当前实例的跨标签页认证频道；重复调用不会重复创建。 */
    initializeAuthSync(): void {
      getUserStoreRuntime(this)
    },

    /** 销毁非序列化运行时资源，供统一重置或热更新流程调用。 */
    disposeAuthSync(): void {
      disposeUserStoreRuntime(this)
    },

    /** 判断 Access Token 在预留刷新窗口后是否仍然可用。 */
    hasValidAccessToken(): boolean {
      return Boolean(this.accessToken) && Date.now() + ACCESS_TOKEN_REFRESH_LEEWAY_MS < this.accessTokenExpiresAt
    },

    /** 只清理当前页面的短效认证状态，不推进代次，也不撤销服务端会话。 */
    clearSession(): void {
      clearSessionState(this)
    },

    /**
     * 禁止当前前端继续自动恢复会话。
     *
     * 该动作会推进认证代次并广播退出，但不会调用后端撤销接口。
     */
    expireSession(): void {
      expireSessionState(this)
    },

    /**
     * 无条件推进认证代次并失效当前状态。
     *
     * 统一 `$reset()` 前使用该动作，可保证已经发出的登录或刷新响应无法在重置后重新写回。
     */
    invalidateSessionForReset(): void {
      expireSessionState(this, true)
    },

    /**
     * 提交账号密码并建立会话。
     *
     * 密码只存在于函数参数，并在 API 边界进入后端规定的登录密文信封；登录与其他
     * Cookie 变更共用认证锁。若请求期间另一个标签页退出，新响应会因代次变化而丢弃。
     */
    async login(form: LoginFormData, client?: ApiClient): Promise<AuthUser> {
      // 在进入异步锁之前捕获 Nuxt 注入客户端，避免回调执行时丢失应用上下文。
      const requestClient = client || useApi()
      const runtime = getUserStoreRuntime(this)

      return runWithAuthMutationLock(async () => {
        // reset/HMR 可能在等待跨标签页锁期间销毁旧 runtime，此时不能再向后端建立 Cookie 会话。
        if (runtime.disposed) {
          throw new ApiRequestError('认证状态已在其他页面发生变化，请重新登录', { code: 'AUTH_STATE_CHANGED' })
        }

        const requestEpoch = getAuthSessionEpoch()
        const session = await loginApi(
          {
            account: form.account.trim(),
            password: form.password,
            deviceId: getOrCreateDeviceId(),
          },
          requestClient,
        )

        if (runtime.disposed || getAuthSessionEpoch() !== requestEpoch) {
          throw new ApiRequestError('认证状态已在其他页面发生变化，请重新登录', { code: 'AUTH_STATE_CHANGED' })
        }

        const nextEpoch = advanceAuthSessionEpoch()
        applySession(this, session, { epoch: nextEpoch })
        return session.user
      })
    },

    /**
     * 创建会员账号并直接建立当前浏览器会话。
     *
     * 页面专用的确认密码和协议勾选不会越过 Store 边界；注册、登录和退出共享同一把跨标签页认证锁，
     * 防止较晚返回的注册响应覆盖用户在其他页面执行的退出或重新登录。
     */
    async register(form: RegisterFormData, client?: ApiClient): Promise<AuthUser> {
      const requestClient = client || useApi()
      const runtime = getUserStoreRuntime(this)

      return runWithAuthMutationLock(async () => {
        if (runtime.disposed) {
          throw new ApiRequestError('认证状态已在其他页面发生变化，请重新注册', { code: 'AUTH_STATE_CHANGED' })
        }

        const requestEpoch = getAuthSessionEpoch()
        const session = await registerApi(
          {
            username: form.username.trim(),
            displayName: form.displayName.trim(),
            email: form.email.trim(),
            phoneNumber: form.phoneNumber.trim() || undefined,
            password: form.password,
            deviceId: getOrCreateDeviceId(),
          },
          requestClient,
        )

        if (runtime.disposed || getAuthSessionEpoch() !== requestEpoch) {
          throw new ApiRequestError('认证状态已在其他页面发生变化，请重新注册', { code: 'AUTH_STATE_CHANGED' })
        }

        const nextEpoch = advanceAuthSessionEpoch()
        applySession(this, session, { epoch: nextEpoch })
        return session.user
      })
    },

    /**
     * 通过 HttpOnly Cookie 恢复或轮换会话。
     *
     * 该动作仅在客户端执行，并受持久熔断、共享冷却、当前标签页 Promise 锁及跨标签页
     * 认证锁共同约束。rejectedAuthorization 来自 401 请求：只有当前 Token 已经变化时才可
     * 短路，否则即使旧 Token 尚未到本地过期时间也必须真正刷新。
     */
    async refreshSession(client?: ApiClient, rejectedAuthorization = ''): Promise<boolean> {
      if (!import.meta.client || isSessionRefreshBlocked()) return false
      if (Date.now() < getSessionRefreshRetryAt()) return false

      const runtime = getUserStoreRuntime(this)
      // 在任何 await 之前捕获客户端，保证后续分支仍绑定当前 Nuxt 应用。
      const requestClient = client || useApi()

      if (runtime.refreshPromise) {
        const joinedResult = await runtime.refreshPromise
        if (!joinedResult || runtime.disposed) return false

        if (rejectedAuthorization) {
          // 每个 401 必须用自己的被拒 Token 判断；首个调用者的成功结果不能直接代表本请求。
          if (this.authorizationHeader && this.authorizationHeader !== rejectedAuthorization && this.hasValidAccessToken()) return true
          return this.refreshSession(requestClient, rejectedAuthorization)
        }

        return this.hasValidAccessToken() || this.refreshSession(requestClient)
      }

      // 记录进入跨标签页锁前的代次，用于判断等待期间是否已经收到其他页面的新会话。
      const waitingEpoch = getAuthSessionEpoch()

      runtime.refreshPromise = runWithAuthMutationLock(async () => {
        if (runtime.disposed || isSessionRefreshBlocked() || Date.now() < getSessionRefreshRetryAt()) return false

        const lockedEpoch = getAuthSessionEpoch()
        if (lockedEpoch !== waitingEpoch) await waitForSessionEpoch(runtime, lockedEpoch)
        if (runtime.disposed || isSessionRefreshBlocked() || Date.now() < getSessionRefreshRetryAt()) return false

        if (rejectedAuthorization) {
          // 仅不同于被拒值且仍有余量的新 Token，才能证明其他请求已完成有效刷新。
          if (this.authorizationHeader && this.authorizationHeader !== rejectedAuthorization && this.hasValidAccessToken()) return true
        } else if (this.hasValidAccessToken()) {
          return true
        }

        const refreshEpoch = getAuthSessionEpoch()
        try {
          const session = await refreshAccessToken({ deviceId: getOrCreateDeviceId() }, requestClient)

          // 主动退出会先推进代次并熔断，迟到的刷新响应不得重新解除退出状态。
          // 旧任务只丢弃自己的响应；当前 Store 可能已由新 runtime 或其他标签页应用了更新会话。
          if (runtime.disposed || isSessionRefreshBlocked() || getAuthSessionEpoch() !== refreshEpoch) return false

          const nextEpoch = advanceAuthSessionEpoch()
          applySession(this, session, { epoch: nextEpoch })
          return true
        } catch (error) {
          if (runtime.disposed) return false
          handleRefreshFailure(this, error)
          return false
        }
      })
        .catch((error) => {
          // Web Lock、租约或存储异常也遵守 Promise<boolean> 契约，不向路由守卫泄漏拒绝。
          if (runtime.disposed) return false
          handleRefreshFailure(this, error)
          return false
        })
        .finally(() => {
          runtime.refreshPromise = undefined
        })

      return runtime.refreshPromise
    },

    /** 路由进入前优先复用有效 Access Token，否则尝试一次安全 Cookie 恢复。 */
    async ensureSession(client?: ApiClient): Promise<boolean> {
      return this.hasValidAccessToken() || this.refreshSession(client)
    },

    /**
     * 主动退出当前设备。
     *
     * 先推进代次、熔断并广播退出，再在认证锁内撤销服务端 Token Family。即使网络错误，
     * 本地也不会违背用户意图自动恢复；服务端错误仍向页面抛出以便提示。
     */
    async logout(client?: ApiClient): Promise<void> {
      const requestClient = client || useApi()
      expireSessionState(this)
      await runWithAuthMutationLock(() => logoutApi(requestClient))
    },

    /**
     * 撤销全部设备会话。
     *
     * 先在未熔断状态下保证 Bearer 有效，再推进代次并进入认证锁；这样既不会在锁内递归刷新，
     * 也不会因提前阻止刷新而漏掉真正的 logout-all 请求。无论远端结果如何，本地保持退出。
     */
    async logoutAll(client?: ApiClient): Promise<void> {
      const requestClient = client || useApi()
      const hasSession = await this.ensureSession(requestClient)
      const authorization = this.authorizationHeader
      expireSessionState(this)

      // 其他标签页可能在 ensureSession 完成后立即退出；没有可用 Bearer 时不得发送空鉴权请求。
      if (!hasSession || !authorization) {
        throw new ApiRequestError('登录状态已失效，无法撤销其他设备会话', {
          code: 'AUTH_UNAUTHORIZED',
          statusCode: 401,
        })
      }

      await runWithAuthMutationLock(() => logoutAllApi(requestClient, authorization))
    },
  },
})

/** 默认导出 Store 定义，保持与参考项目一致，并让 Nuxt Pinia HMR 扫描器识别变量声明。 */
export default user
