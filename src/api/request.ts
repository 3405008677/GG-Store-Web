import type { FetchOptions } from 'ofetch'
import type { ApiResult } from '@/types/api'
import { ApiRequestError } from '@/types/api'

/** 商城接口默认超时 50 秒；上传等长任务后续应在具体能力中单独配置。 */
const REQUEST_TIMEOUT_MS = 50_000

/** 相同错误在该窗口内只展示一次，避免并发失败产生重复消息。 */
const MESSAGE_THROTTLE_MS = 3_000

/** 请求层目前支持的 HTTP 方法。 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 明确接口是否使用商城 ApiResult 外壳，避免根据普通 DTO 字段做错误猜测。 */
type ApiResponseMode = 'api-result' | 'raw'

/**
 * 商城后端稳定错误码与本地文案的映射。
 *
 * 只翻译已确认的公共错误码；未识别的业务错误仍展示后端 message，避免隐藏有价值的领域信息。
 */
const API_ERROR_MESSAGES: Readonly<Record<string, readonly [key: string, fallback: string]>> = Object.freeze({
  AUTH_ENCRYPTED_REQUEST_INVALID: ['communal.loginEncryptionInvalid.text', '登录安全参数无效或已过期，请重试'],
  AUTH_INVALID_CREDENTIALS: ['communal.invalidCredentials.text', '账号或密码错误'],
  AUTH_UNAUTHORIZED: ['communal.sessionExpired.text', '登录状态已失效，请重新登录'],
  AUTH_FORBIDDEN: ['communal.noPermission.text', '没有操作权限'],
  AUTH_TOO_MANY_REQUESTS: ['communal.requestTooFrequent.text', '请求过于频繁，请稍后重试'],
  VALIDATION_FAILED: ['communal.validationFailed.text', '提交内容不符合要求'],
} as const)

/**
 * 对 ofetch 异常结构的最小描述。
 *
 * 这里只声明请求层实际读取的字段，避免业务代码依赖 FetchError 的具体实现。
 */
interface FetchLikeError {
  name?: string
  code?: string
  message?: string
  /** ofetch 对解析后错误体提供的便捷字段。 */
  data?: unknown
  response?: {
    status?: number
    _data?: unknown
    headers?: Headers
  }
}

/** 每次 API 调用可覆盖的行为选项。 */
export interface ApiCallOptions {
  /** 额外请求头；Authorization 默认由请求层生成。 */
  headers?: HeadersInit
  /** 用于页面卸载、搜索切换等场景主动取消请求。 */
  signal?: AbortSignal
  /** 登录、刷新、退出等匿名接口设为 false。 */
  auth?: boolean
  /**
   * 认证请求遇到 401 时是否允许刷新并重试一次。
   * GET 默认开启；写操作必须由 API 模块确认幂等后显式开启。
   */
  retryOnUnauthorized?: boolean
  /** 后台恢复会话等场景不弹出错误消息。 */
  silent?: boolean
  /** 默认 api-result；后端直接返回 DTO 的公开接口必须显式设为 raw。 */
  responseMode?: ApiResponseMode
}

/** `request` 方法使用的完整选项，CRUD 便捷方法会转换为该结构。 */
export interface ApiRequestOptions extends ApiCallOptions {
  method?: HttpMethod
  query?: Record<string, unknown>
  body?: unknown
}

/** 创建客户端时由 Nuxt 插件提供的应用级能力。 */
export interface ApiClientOptions {
  baseURL: string
  /** 返回完整 Authorization 值，例如 `Bearer ey...`。 */
  getAuthorization: () => string
  /**
   * 轮换 Refresh Cookie 并更新 Store；参数是本次 401 实际使用的 Authorization，
   * Store 据此区分“其他请求已刷新”和“同一个旧 Token 尚未到本地过期时间”。
   */
  refreshSession?: (rejectedAuthorization: string) => Promise<boolean>
  /** 判断刷新是否因 Cookie 失效等确定原因被永久熔断，网络退避不应强制跳转登录页。 */
  isSessionRefreshBlocked?: () => boolean
  translate: (key: string, fallback: string) => string
  notifyError?: (message: string) => void
  /** 仅在安全重放后仍 401，或 Store 已确认刷新永久熔断时调用；匿名接口和临时退避不会触发。 */
  onSessionExpired?: () => void | Promise<void>
}

/**
 * 按业务域 API 文件使用的统一客户端。
 *
 * 泛型 T 表示已去除 ApiResult 外壳后的 data；若 data 允许为 null，调用方也必须在
 * 泛型中包含 null。后端直接返回 DTO 的接口需传入 responseMode=raw。
 */
export interface ApiClient {
  request<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T>
  get<T = unknown>(url: string, query?: Record<string, unknown>, options?: ApiCallOptions): Promise<T>
  post<T = unknown, TBody = unknown>(url: string, body?: TBody, options?: ApiCallOptions): Promise<T>
  put<T = unknown, TBody = unknown>(url: string, body?: TBody, options?: ApiCallOptions): Promise<T>
  patch<T = unknown, TBody = unknown>(url: string, body?: TBody, options?: ApiCallOptions): Promise<T>
  delete<T = unknown>(url: string, query?: Record<string, unknown>, options?: ApiCallOptions): Promise<T>
}

/** 判断值是否为可安全读取字段的普通对象。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]'
}

/** 仅识别商城后端的统一 ApiResult；普通 DTO 由调用方通过 raw 模式显式声明。 */
function isApiResult(value: unknown): value is ApiResult<unknown> {
  return isPlainObject(value) && 'data' in value && typeof value.success === 'boolean' && typeof value.code === 'string' && typeof value.message === 'string'
}

/** 兼容代理或框架未使用 ApiResult 时返回的 RFC Problem Details 文案。 */
function getProblemDetailsMessage(value: unknown): string | undefined {
  if (!isPlainObject(value)) return undefined
  if (typeof value.detail === 'string' && value.detail) return value.detail
  if (typeof value.title === 'string' && value.title) return value.title
  return undefined
}

/** 兼容浏览器主动取消与 ofetch 取消请求时使用的不同错误名称。 */
function isAbortError(error: FetchLikeError): boolean {
  return ['AbortError', 'RequestAbortedError'].includes(error.name || '') || ['ABORT_ERR', 'ERR_CANCELED'].includes(error.code || '')
}

/** 读取限流响应中的 Retry-After 秒数，非法值不向上透出。 */
function getRetryAfter(error: FetchLikeError): number | undefined {
  const value = error.response?.headers?.get('retry-after')
  if (!value) return undefined
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

/**
 * 创建与当前 Nuxt 应用实例绑定的商城 API 客户端。
 *
 * 请求顺序为：合并请求头 → 注入 Bearer → 携带 Refresh Cookie → 解析 ApiResult →
 * 401 单次刷新重试 → 统一异常与消息去重。请求层保持协议无关；后端规定的登录密文
 * 信封只由 `api/login` 在提交边界构造。
 */
export function createApiClient(clientOptions: ApiClientOptions): ApiClient {
  // 写操作不自动做网络重试，防止登录、下单等请求被重复提交。
  const fetcher = $fetch.create({
    baseURL: clientOptions.baseURL,
    timeout: REQUEST_TIMEOUT_MS,
    retry: 0,
    credentials: 'include',
  })
  const shownMessages = new Set<string>()

  /** 获取国际化文案；缺少语言键时使用调用方提供的中文兜底。 */
  function translate(key: string, fallback: string): string {
    return clientOptions.translate(key, fallback) || fallback
  }

  /** 优先翻译后端公共错误码，未知业务码保留后端提供的消息。 */
  function translateApiError(code: string | undefined, fallback: string): string {
    const translation = code ? API_ERROR_MESSAGES[code] : undefined
    return translation ? translate(translation[0], translation[1]) : fallback
  }

  /**
   * 相同消息只在节流窗口内通知一次。
   *
   * 已展示和因重复而被抑制都返回 true，页面据此确认请求层已经处理该消息。
   */
  function notifyOnce(message: string, silent: boolean): boolean {
    if (silent || !clientOptions.notifyError) return false
    if (shownMessages.has(message)) return true
    shownMessages.add(message)
    clientOptions.notifyError(message)
    setTimeout(() => shownMessages.delete(message), MESSAGE_THROTTLE_MS)
    return true
  }

  /** 根据调用选项和当前 Store 状态构造最终请求头。 */
  function createHeaders(options: ApiRequestOptions): Headers {
    const headers = new Headers(options.headers)
    if (options.auth !== false && !headers.has('Authorization')) {
      const authorization = clientOptions.getAuthorization()
      if (authorization) headers.set('Authorization', authorization)
    }
    return headers
  }

  /** 按 API 模块声明的响应模式处理数据，避免普通 DTO 被误判为 ApiResult。 */
  function unwrapResponse<T>(payload: unknown, responseMode: ApiResponseMode): T {
    if (responseMode === 'raw') return payload as T
    if (!isApiResult(payload)) {
      throw new ApiRequestError('接口响应格式不符合 ApiResult 约定', {
        code: 'INVALID_API_RESPONSE',
      })
    }
    if (payload.success) return payload.data as T
    throw new ApiRequestError(payload.message || '请求失败', { code: payload.code })
  }

  /**
   * 将失败 ApiResult、HTTP、网络和取消异常统一为 ApiRequestError，
   * 并根据 silent 和消息节流状态决定是否通知用户。
   */
  function normalizeError(error: unknown, silent: boolean): ApiRequestError {
    if (error instanceof ApiRequestError) {
      const message = translateApiError(error.code, error.message)
      const isShown = notifyOnce(message, silent || error.isAborted)
      if (!isShown) return error
      return new ApiRequestError(message, {
        code: error.code,
        statusCode: error.statusCode,
        retryAfter: error.retryAfter,
        isAborted: error.isAborted,
        isShown: true,
        cause: error,
      })
    }

    const fetchError = (error || {}) as FetchLikeError
    if (isAbortError(fetchError)) {
      return new ApiRequestError('请求已取消', {
        code: 'REQUEST_ABORTED',
        isAborted: true,
        cause: error,
      })
    }

    const statusCode = fetchError.response?.status
    // 兼容 ofetch 的 error.data 与底层 Response._data，两者都可能承载已解析的 ApiResult。
    const payload = fetchError.response?._data ?? fetchError.data
    const apiError = isApiResult(payload) ? payload : undefined
    const serverMessage = apiError?.message || getProblemDetailsMessage(payload)
    let message = translateApiError(apiError?.code, serverMessage || fetchError.message || translate('communal.systemErrorUnknown.text', '未知错误'))

    // 没有后端消息时再按 HTTP/网络状态提供用户可理解的兜底。
    if (!serverMessage) {
      if (statusCode === 401) message = translate('communal.sessionExpired.text', '登录状态已失效')
      else if (statusCode === 403) message = translate('communal.noPermission.text', '没有操作权限')
      else if (statusCode === 429) message = translate('communal.requestTooFrequent.text', '请求过于频繁，请稍后重试')
      else if (statusCode && statusCode >= 500) message = translate('communal.apiResponseAbnormal.text', '服务器响应异常')
      else if (!statusCode) message = translate('communal.networkConnectionError.text', '网络连接错误，请检查网络')
    }

    const isShown = notifyOnce(message, silent)
    return new ApiRequestError(message, {
      code: apiError?.code || (statusCode ? `HTTP_${statusCode}` : 'NETWORK_ERROR'),
      statusCode,
      retryAfter: getRetryAfter(fetchError),
      isShown,
      cause: error,
    })
  }

  /** 执行请求，并保证同一请求最多因 401 自动重放一次。 */
  async function execute<T>(url: string, options: ApiRequestOptions, hasRetried = false): Promise<T> {
    const method = options.method || 'GET'
    const configuredHeaders = new Headers(options.headers)
    const usesManagedAuthorization = options.auth !== false && !configuredHeaders.has('Authorization')
    const canReplayAfterRefresh = options.retryOnUnauthorized ?? method === 'GET'
    const headers = createHeaders(options)
    const requestAuthorization = headers.get('Authorization') || ''

    try {
      const fetchOptions: FetchOptions<'json'> = {
        method,
        query: options.query,
        body: options.body as FetchOptions<'json'>['body'],
        headers,
        signal: options.signal,
      }
      const response = await fetcher<unknown>(url, fetchOptions)
      return unwrapResponse<T>(response, options.responseMode || 'api-result')
    } catch (error) {
      const fetchError = (error || {}) as FetchLikeError
      const statusCode = error instanceof ApiRequestError ? error.statusCode : fetchError.response?.status
      const currentAuthorization = clientOptions.getAuthorization()
      const hasNewAuthorization =
        statusCode === 401 && usesManagedAuthorization && canReplayAfterRefresh && !hasRetried && Boolean(currentAuthorization) && currentAuthorization !== requestAuthorization

      if (hasNewAuthorization) {
        // 其他并发请求已经完成刷新，本请求直接使用新 Token 重放，不能再次轮换 Refresh Cookie。
        return execute<T>(url, options, true)
      }

      const canRefresh = statusCode === 401 && usesManagedAuthorization && canReplayAfterRefresh && !hasRetried

      if (canRefresh && clientOptions.refreshSession) {
        // Store 内部使用 single-flight，多个并发 401 会共享同一次 Refresh Token 轮换。
        let refreshed = false
        try {
          refreshed = await clientOptions.refreshSession(requestAuthorization)
        } catch {
          // 刷新回调异常按“恢复失败”处理，最终仍归一化并抛出原始 401。
        }
        if (refreshed) return execute<T>(url, options, true)
      }

      // 未授权写操作若未声明可重放，只向调用方抛错；后续安全请求仍有机会刷新会话。
      // 只有已进入刷新链路并最终失败的请求，才确认会话失效并跳转登录页。
      const shouldExpireSession =
        statusCode === 401 &&
        usesManagedAuthorization &&
        canReplayAfterRefresh &&
        (hasRetried || (clientOptions.isSessionRefreshBlocked?.() ?? true))
      if (shouldExpireSession) await clientOptions.onSessionExpired?.()
      throw normalizeError(error, options.silent ?? false)
    }
  }

  return {
    request: <T>(url: string, options: ApiRequestOptions = {}) => execute<T>(url, options),
    get: <T>(url: string, query?: Record<string, unknown>, options: ApiCallOptions = {}) => execute<T>(url, { ...options, method: 'GET', query }),
    post: <T, TBody>(url: string, body?: TBody, options: ApiCallOptions = {}) => execute<T>(url, { ...options, method: 'POST', body }),
    put: <T, TBody>(url: string, body?: TBody, options: ApiCallOptions = {}) => execute<T>(url, { ...options, method: 'PUT', body }),
    patch: <T, TBody>(url: string, body?: TBody, options: ApiCallOptions = {}) => execute<T>(url, { ...options, method: 'PATCH', body }),
    delete: <T>(url: string, query?: Record<string, unknown>, options: ApiCallOptions = {}) => execute<T>(url, { ...options, method: 'DELETE', query }),
  }
}

/** 获取 Nuxt 插件注入的当前应用 API 客户端。 */
export function useApi(): ApiClient {
  return useNuxtApp().$api
}
