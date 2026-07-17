/** 商城前端当前支持的语言码；该值只属于前端国际化，不会提交给认证接口。 */
export type AppLocale = 'CHS' | 'ENG'

/**
 * 登录页面维护的字段。
 *
 * password 仅短暂存在于页面内存，在 API 边界进入后端规定的混合加密信封；
 * 不写入 Pinia 持久化、Cookie、localStorage 或日志。
 */
export interface LoginFormData {
  account: string
  password: string
}

/** 登录密文内部的明文载荷；该对象不会直接作为 HTTP 请求体发送。 */
export interface LoginRequest extends LoginFormData {
  /** 浏览器安装级稳定标识，登录和刷新必须复用同一个值。 */
  deviceId: string
}

/**
 * 注册页面维护的字段。
 *
 * confirmPassword 和 agreed 只用于前端交互校验，不会进入认证密文或发送给后端。
 */
export interface RegisterFormData {
  /** 唯一登录名，后端按 Unicode NFKC 规范化后校验。 */
  username: string
  /** 商城内展示的会员名称。 */
  displayName: string
  /** 唯一电子邮箱，同时可用于后续登录。 */
  email: string
  /** 可选手机号；填写后也可作为登录账号。 */
  phoneNumber: string
  /** 仅短暂保存在当前注册页面内存中的原始密码。 */
  password: string
  /** 仅用于浏览器端确认两次密码输入一致。 */
  confirmPassword: string
  /** 用户是否已确认注册协议与隐私政策。 */
  agreed: boolean
}

/** 注册密文内部的明文载荷；确认密码和协议勾选不会提交。 */
export interface RegisterRequest {
  username: string
  displayName: string
  email: string
  phoneNumber?: string
  password: string
  /** 注册成功后创建首个刷新会话时使用的浏览器设备标识。 */
  deviceId: string
}

/** `GET /UserManage/Auth/LoginEncryption` 返回的一次性加密挑战。 */
export interface LoginEncryptionChallengeResponse {
  /** 当前登录 RSA 密钥标识，提交密文时必须原样返回。 */
  keyId: string
  /** 后端固定使用 RSA-OAEP-SHA256 封装 AES 密钥。 */
  keyAlgorithm: 'RSA-OAEP-256'
  /** 后端固定使用 AES-256-GCM 加密内容。 */
  contentAlgorithm: 'A256GCM'
  /** RSA 公钥固定使用 SPKI 格式。 */
  publicKeyFormat: 'spki'
  /** 无填充 Base64Url 编码的 RSA SPKI 公钥。 */
  publicKeySpki: string
  /** 绑定客户端 IP、短时有效且只能消费一次的随机挑战。 */
  challenge: string
  /** 必须原样参与 AES-GCM 认证的附加数据。 */
  additionalAuthenticatedData: string
  /** ISO 8601 UTC 失效时间。 */
  expiresAtUtc: string
}

/** 登录或注册接口实际发送的混合加密信封。 */
export interface EncryptedLoginRequest {
  keyId: string
  challenge: string
  /** RSA-OAEP-SHA256 加密后的 32 字节 AES 密钥。 */
  encryptedKey: string
  /** 12 字节 AES-GCM Nonce。 */
  nonce: string
  /** 不含认证标签的 AES-GCM 密文。 */
  ciphertext: string
  /** 独立编码的 16 字节 AES-GCM 认证标签。 */
  tag: string
}

/** `POST /UserManage/Auth/Refresh` 的请求 DTO。 */
export interface RefreshSessionRequest {
  /** 必须与创建 Token Family 时一致，否则后端会拒绝并撤销该设备会话。 */
  deviceId: string
}

/** 后端返回的最小会员身份信息。 */
export interface AuthUser {
  id: number
  username: string
  displayName: string
  role: string
}

/** 登录和刷新成功后返回的短效 Access Token 数据。 */
export interface AccessTokenResponse {
  accessToken: string
  /** 当前后端固定返回 Bearer，保留字段以兼容协议演进。 */
  tokenType: string
  /** Access Token 剩余有效秒数。 */
  expiresIn: number
  user: AuthUser
}
