import type {
  EncryptedLoginRequest,
  LoginEncryptionChallengeResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types/auth'
import { ApiRequestError } from '@/types/api'

/** 后端固定的认证密钥封装算法。 */
const EXPECTED_KEY_ALGORITHM = 'RSA-OAEP-256'

/** 后端固定的认证内容加密算法。 */
const EXPECTED_CONTENT_ALGORITHM = 'A256GCM'

/** Web Crypto 导入 RSA 公钥时使用的格式。 */
const EXPECTED_PUBLIC_KEY_FORMAT = 'spki'

/** AAD 必须与后端 LoginRequestEncryptionService 的协议版本完全一致。 */
const AUTH_PROTOCOL_PREFIX = 'gg-store-login:v1'

/** AES-256 密钥长度。 */
const AES_KEY_SIZE = 32

/** GCM 推荐的 96 位 Nonce 长度。 */
const GCM_NONCE_SIZE = 12

/** 后端固定接收 128 位 GCM 认证标签。 */
const GCM_TAG_SIZE = 16

/** 后端拒绝超过 8 KiB 的认证明文。 */
const MAX_AUTH_PLAINTEXT_SIZE = 8 * 1024

/** Base64Url 只允许 URL 安全字母，且不包含 `=` 填充。 */
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/

/** 构造本地浏览器不支持安全加密时的统一异常。 */
function encryptionUnavailableError(): ApiRequestError {
  return new ApiRequestError('当前浏览器无法建立安全登录请求', {
    code: 'AUTH_LOGIN_ENCRYPTION_UNAVAILABLE',
  })
}

/** 构造挑战字段、算法或有效期不符合后端协议时的统一异常。 */
function invalidChallengeError(cause?: unknown): ApiRequestError {
  return new ApiRequestError('登录安全参数无效或已过期，请重试', {
    code: 'AUTH_LOGIN_ENCRYPTION_PROTOCOL_INVALID',
    cause,
  })
}

/** 将字节编码为后端要求的无填充 canonical Base64Url。 */
function encodeBase64Url(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

/** 严格解码 canonical Base64Url，拒绝填充、空值和非 URL 安全字符。 */
function decodeBase64Url(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !value || !BASE64_URL_PATTERN.test(value) || value.length % 4 === 1) {
    throw invalidChallengeError()
  }

  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  try {
    const binary = atob(padded)
    const decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    if (encodeBase64Url(decoded) !== value) {
      decoded.fill(0)
      throw invalidChallengeError()
    }
    return decoded
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw invalidChallengeError(error)
  }
}

/** 检查挑战响应的算法、格式、AAD、长度与时间格式，并返回已解码的 SPKI 公钥。 */
function validateChallenge(challenge: LoginEncryptionChallengeResponse): Uint8Array {
  if (
    !challenge ||
    challenge.keyAlgorithm !== EXPECTED_KEY_ALGORITHM ||
    challenge.contentAlgorithm !== EXPECTED_CONTENT_ALGORITHM ||
    challenge.publicKeyFormat !== EXPECTED_PUBLIC_KEY_FORMAT ||
    typeof challenge.keyId !== 'string' ||
    !challenge.keyId ||
    typeof challenge.challenge !== 'string'
  ) {
    throw invalidChallengeError()
  }

  const expectedAdditionalData = `${AUTH_PROTOCOL_PREFIX}:${challenge.keyId}:${challenge.challenge}`
  const expiresAt = Date.parse(challenge.expiresAtUtc)
  // 服务端时间才是挑战过期的权威依据；客户端只校验格式，避免终端时钟偏快误拒绝新挑战。
  if (challenge.additionalAuthenticatedData !== expectedAdditionalData || !Number.isFinite(expiresAt)) {
    throw invalidChallengeError()
  }

  const challengeBytes = decodeBase64Url(challenge.challenge)
  if (challengeBytes.byteLength !== 32) {
    challengeBytes.fill(0)
    throw invalidChallengeError()
  }
  challengeBytes.fill(0)
  return decodeBase64Url(challenge.publicKeySpki)
}

/** 获取浏览器 Web Crypto；非安全上下文或旧浏览器直接拒绝认证。 */
function getBrowserCrypto(): Crypto {
  if (
    globalThis.isSecureContext === false ||
    !globalThis.crypto?.subtle ||
    typeof globalThis.crypto.getRandomValues !== 'function' ||
    typeof globalThis.atob !== 'function' ||
    typeof globalThis.btoa !== 'function'
  ) {
    throw encryptionUnavailableError()
  }
  return globalThis.crypto
}

/**
 * 按商城后端协议构造一次性认证密文信封。
 *
 * 流程为：导入 RSA SPKI 公钥 → 生成 AES-256 密钥与 Nonce → AES-GCM 加密 JSON
 * → 拆分 16 字节认证标签 → RSA-OAEP-SHA256 加密 AES 密钥 → Base64Url 编码。
 * JavaScript 无法可靠擦除字符串，但会在 finally 中尽力清零原始 AES 密钥和 UTF-8 明文字节。
 */
async function encryptAuthenticationRequest<TPayload extends object>(
  request: TPayload,
  challenge: LoginEncryptionChallengeResponse,
): Promise<EncryptedLoginRequest> {
  const cryptoApi = getBrowserCrypto()
  let aesKeyBytes: Uint8Array | undefined
  let plaintextBytes: Uint8Array | undefined

  try {
    const publicKeyBytes = validateChallenge(challenge)
    const publicKey = await cryptoApi.subtle.importKey(
      'spki',
      publicKeyBytes,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt'],
    )

    aesKeyBytes = cryptoApi.getRandomValues(new Uint8Array(AES_KEY_SIZE))
    const aesKey = await cryptoApi.subtle.importKey('raw', aesKeyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
    const nonce = cryptoApi.getRandomValues(new Uint8Array(GCM_NONCE_SIZE))
    plaintextBytes = new TextEncoder().encode(JSON.stringify(request))

    if (!plaintextBytes.byteLength || plaintextBytes.byteLength > MAX_AUTH_PLAINTEXT_SIZE) {
      throw invalidChallengeError()
    }

    const additionalData = new TextEncoder().encode(challenge.additionalAuthenticatedData)
    const encryptedPayload = new Uint8Array(
      await cryptoApi.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData,
          tagLength: GCM_TAG_SIZE * 8,
        },
        aesKey,
        plaintextBytes,
      ),
    )
    if (encryptedPayload.byteLength <= GCM_TAG_SIZE) throw invalidChallengeError()

    // Web Crypto 返回 ciphertext || tag，后端 DTO 要求把最后 16 字节单独提交。
    const ciphertext = encryptedPayload.slice(0, -GCM_TAG_SIZE)
    const tag = encryptedPayload.slice(-GCM_TAG_SIZE)
    const encryptedKey = new Uint8Array(
      await cryptoApi.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        publicKey,
        aesKeyBytes,
      ),
    )

    return {
      keyId: challenge.keyId,
      challenge: challenge.challenge,
      encryptedKey: encodeBase64Url(encryptedKey),
      nonce: encodeBase64Url(nonce),
      ciphertext: encodeBase64Url(ciphertext),
      tag: encodeBase64Url(tag),
    }
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('无法加密登录请求，请刷新页面后重试', {
      code: 'AUTH_LOGIN_ENCRYPTION_FAILED',
      cause: error,
    })
  } finally {
    aesKeyBytes?.fill(0)
    plaintextBytes?.fill(0)
  }
}

/** 加密登录账号、密码和设备标识，避免调用方意外携带页面内部字段。 */
export function encryptLoginRequest(
  request: LoginRequest,
  challenge: LoginEncryptionChallengeResponse,
): Promise<EncryptedLoginRequest> {
  return encryptAuthenticationRequest(
    {
      account: request.account,
      password: request.password,
      deviceId: request.deviceId,
    } satisfies LoginRequest,
    challenge,
  )
}

/** 加密注册资料和设备标识；确认密码、协议勾选等页面字段不会进入请求。 */
export function encryptRegisterRequest(
  request: RegisterRequest,
  challenge: LoginEncryptionChallengeResponse,
): Promise<EncryptedLoginRequest> {
  return encryptAuthenticationRequest(
    {
      username: request.username,
      displayName: request.displayName,
      email: request.email,
      phoneNumber: request.phoneNumber,
      password: request.password,
      deviceId: request.deviceId,
    } satisfies RegisterRequest,
    challenge,
  )
}
