/**
 * 认证类型的兼容导出入口。
 *
 * 业务模块可以从 `@/api/login/types` 引用认证 DTO，而真实定义集中在 types/auth。
 */
export type {
  AccessTokenResponse,
  AuthUser,
  EncryptedLoginRequest,
  LoginEncryptionChallengeResponse,
  LoginFormData,
  LoginRequest,
  RegisterFormData,
  RegisterRequest,
  RefreshSessionRequest,
} from '@/types/auth'
