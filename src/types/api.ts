/**
 * 商城后端统一响应外壳。
 *
 * UserManage 等使用 ApiResult 的接口都会返回该结构；少数公开查询接口会直接返回 DTO，
 * 后者必须由 API 模块显式声明 raw 响应模式。
 */
export interface ApiResult<T = unknown> {
  /** 业务是否成功。 */
  success: boolean
  /** 后端业务码；成功时固定为 OK。 */
  code: string
  /** 可直接展示或记录的后端消息。 */
  message: string
  /** 成功数据；失败时通常为 null。 */
  data: T | null
}

/** 构造统一请求异常时可附带的诊断信息。 */
export interface ApiRequestErrorOptions {
  /** 后端业务码或客户端错误码。 */
  code?: string
  /** HTTP 状态码；网络错误和主动取消没有该值。 */
  statusCode?: number
  /** 429 响应建议等待的秒数。 */
  retryAfter?: number
  /** 是否由 AbortSignal 主动取消。 */
  isAborted?: boolean
  /** 请求层是否已经展示过错误，页面据此避免重复弹窗。 */
  isShown?: boolean
  /** 原始异常，供日志和调试工具追踪。 */
  cause?: unknown
}

/**
 * API 请求的统一异常类型。
 *
 * HTTP 错误、后端 ApiResult 失败、网络异常和主动取消最终都归一为该类型，
 * 页面无需识别 ofetch 的内部异常结构。
 */
export class ApiRequestError extends Error {
  readonly code: string
  readonly statusCode?: number
  readonly retryAfter?: number
  readonly isAborted: boolean
  readonly isShown: boolean

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiRequestError'
    this.code = options.code ?? 'REQUEST_FAILED'
    this.statusCode = options.statusCode
    this.retryAfter = options.retryAfter
    this.isAborted = options.isAborted ?? false
    this.isShown = options.isShown ?? false
  }
}

/** 将 unknown 安全收窄为 ApiRequestError。 */
export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}
