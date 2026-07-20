import type { ApiClient } from '@/api/request'
import type {
  AccessTokenResponse,
  AuthUser,
  ChangePasswordRequest,
  ChangePasswordResponse,
  EncryptedLoginRequest,
  LoginEncryptionChallengeResponse,
  LoginRequest,
  RegisterRequest,
  RefreshSessionRequest,
} from '@/types/auth'
import { useApi } from '@/api/request'
import {
  encryptChangePasswordRequest,
  encryptLoginRequest,
  encryptRegisterRequest,
} from '@/utils/core/loginEncryption'

/** 与 UserManage/AuthController 的 Route 保持一致。 */
const AUTH_API_BASE = '/UserManage/Auth'

/** logout 接口的 data 是后端 `new { }` 序列化得到的空对象。 */
type EmptyAuthResponse = Record<string, never>

/** 显式传入客户端用于 401 自动刷新回调；普通页面调用时使用 Nuxt 注入实例。 */
function resolveClient(client?: ApiClient): ApiClient {
  return client || useApi()
}

/** 获取绑定客户端 IP、短时有效且只能消费一次的登录加密挑战。 */
export function getLoginEncryptionChallenge(client?: ApiClient): Promise<LoginEncryptionChallengeResponse> {
  return resolveClient(client).get<LoginEncryptionChallengeResponse>(`${AUTH_API_BASE}/LoginEncryption`, undefined, {
    auth: false,
    retryOnUnauthorized: false,
  })
}

/**
 * 获取一次性挑战、加密账号密码和设备标识，再提交登录密文信封。
 *
 * 每次调用都使用新挑战和新 AES 密钥；密文请求不可自动重放。HTTPS 仍是必要的传输
 * 安全边界，混合加密只是后端要求的纵深防御，前端不得持久化密码或自行执行 SHA1。
 */
export async function login(params: LoginRequest, client?: ApiClient): Promise<AccessTokenResponse> {
  // 两个请求必须复用同一客户端和网络出口，保证后端的客户端 IP 挑战绑定一致。
  const requestClient = resolveClient(client)
  const challenge = await getLoginEncryptionChallenge(requestClient)
  const encryptedRequest = await encryptLoginRequest(params, challenge)

  return requestClient.post<AccessTokenResponse, EncryptedLoginRequest>(`${AUTH_API_BASE}/Login`, encryptedRequest, {
    auth: false,
    retryOnUnauthorized: false,
  })
}

/**
 * 获取一次性挑战、加密注册资料并创建会员账号。
 *
 * 注册成功响应与登录一致，同时由后端写入 HttpOnly Refresh Cookie，因此页面可以直接建立会话。
 */
export async function register(params: RegisterRequest, client?: ApiClient): Promise<AccessTokenResponse> {
  const requestClient = resolveClient(client)
  const challenge = await getLoginEncryptionChallenge(requestClient)
  const encryptedRequest = await encryptRegisterRequest(params, challenge)

  return requestClient.post<AccessTokenResponse, EncryptedLoginRequest>(`${AUTH_API_BASE}/Register`, encryptedRequest, {
    auth: false,
    retryOnUnauthorized: false,
  })
}

/**
 * 获取一次性挑战，加密当前密码和新密码后提交。
 *
 * 成功后服务端会撤销全部刷新会话并删除当前 Refresh Cookie；调用方必须立即清理
 * 本地 Access Token 并引导用户重新登录。
 */
export async function changePassword(
  params: ChangePasswordRequest,
  client?: ApiClient,
): Promise<ChangePasswordResponse> {
  const requestClient = resolveClient(client)
  const challenge = await getLoginEncryptionChallenge(requestClient)
  const encryptedRequest = await encryptChangePasswordRequest(params, challenge)

  return requestClient.post<ChangePasswordResponse, EncryptedLoginRequest>(
    `${AUTH_API_BASE}/ChangePassword`,
    encryptedRequest,
    {
      retryOnUnauthorized: false,
    },
  )
}

/**
 * 使用 HttpOnly Refresh Cookie 轮换会话。
 *
 * 请求层统一设置 credentials=include；silent 防止后台恢复失败时先弹错再跳登录页。
 */
export function refreshAccessToken(params: RefreshSessionRequest, client?: ApiClient): Promise<AccessTokenResponse> {
  return resolveClient(client).post<AccessTokenResponse, RefreshSessionRequest>(`${AUTH_API_BASE}/Refresh`, params, {
    auth: false,
    retryOnUnauthorized: false,
    silent: true,
  })
}

/** 撤销当前浏览器对应的 Refresh Token Family；成功响应的 data 是空对象。 */
export function logout(client?: ApiClient): Promise<EmptyAuthResponse> {
  return resolveClient(client).post<EmptyAuthResponse>(`${AUTH_API_BASE}/Logout`, undefined, {
    auth: false,
    retryOnUnauthorized: false,
  })
}

/**
 * 撤销当前会员的全部会话；成功响应的 data 为空对象。
 *
 * Store 会在进入认证锁前捕获 Bearer 并通过 authorization 传入，避免清理内存后丢失请求头；
 * 此处不自动刷新，防止在已经持有认证锁时递归申请同一把 Web Lock。
 */
export function logoutAll(client?: ApiClient, authorization?: string): Promise<EmptyAuthResponse> {
  return resolveClient(client).post<EmptyAuthResponse>(`${AUTH_API_BASE}/LogoutAll`, undefined, {
    headers: authorization ? { Authorization: authorization } : undefined,
    retryOnUnauthorized: false,
  })
}

/** 使用当前 Bearer Token 获取后端最新的最小会员信息。 */
export function getCurrentUser(client?: ApiClient): Promise<AuthUser> {
  return resolveClient(client).get<AuthUser>(`${AUTH_API_BASE}/Me`)
}
