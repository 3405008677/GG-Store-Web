import type { AppLocale } from '@/types/auth'
import { defineStore } from 'pinia'
import { LANGUAGE_COOKIE_KEY, createCookieOptions } from '@/utils/core/storage'

/** 登录页可选语言；商城后端当前没有远程语言列表接口。 */
export interface LanguageOption {
  val: AppLocale
  txt: string
}

/** 受支持语言为前端静态能力，新增语言时需同时补充 Nuxt i18n 配置和语言包。 */
const LANGUAGE_OPTIONS: readonly Readonly<LanguageOption>[] = Object.freeze([
  Object.freeze({ val: 'CHS', txt: '简体中文' }),
  Object.freeze({ val: 'ENG', txt: 'English' }),
])

/** Setting Store 中可被 Pinia 序列化及 SSR 水合的状态。 */
interface SettingState {
  /** 当前界面语言，与 Nuxt i18n 共用 LANGUAGE Cookie。 */
  language: AppLocale
}

/** 当前 Setting Store 实例捕获的 Cookie 引用，可在异步 action 中安全复用。 */
interface SettingStoreRuntime {
  languageCookie: {
    value: AppLocale
  }
}

/** 按 Store 实例隔离 Cookie 引用，避免 SSR 请求之间共享语言上下文。 */
const settingStoreRuntimeMap = new WeakMap<object, SettingStoreRuntime>()

/** 获取与 Nuxt i18n 配置一致的语言 Cookie 引用。 */
function getLanguageCookie() {
  return useCookie<AppLocale>(LANGUAGE_COOKIE_KEY, {
    ...createCookieOptions(),
    default: () => 'CHS',
  })
}

/** 把 Cookie 等外部输入收窄为商城支持的语言码。 */
function normalizeLanguage(value: unknown): AppLocale {
  return value === 'ENG' ? 'ENG' : 'CHS'
}

/**
 * 在同步 Nuxt 上下文中捕获 Cookie 引用并恢复语言。
 *
 * action 可能在登录或语言包加载等 await 之后执行，届时不能重新调用依赖 Nuxt 上下文的
 * useCookie；因此只在统一 Store 入口初始化时获取一次引用。
 */
function initializeSettingStoreRuntime(store: SettingState): void {
  if (settingStoreRuntimeMap.has(store)) return
  const languageCookie = getLanguageCookie()
  store.language = normalizeLanguage(languageCookie.value)
  settingStoreRuntimeMap.set(store, { languageCookie })
}

/** 从已捕获的 Cookie 恢复语言，供统一重置流程保持持久化偏好。 */
function restoreLanguagePreference(store: SettingState): void {
  const runtime = settingStoreRuntimeMap.get(store)
  if (runtime) store.language = normalizeLanguage(runtime.languageCookie.value)
}

/**
 * 管理语言偏好及其 Cookie 持久化。
 *
 * 按参考项目采用 Options Store，并由 `@/stores` 统一创建实例；持久化继续显式写入
 * Cookie，不依赖额外的 Pinia 持久化插件。
 */
const setting = defineStore('setting', {
  /** state 工厂保持纯函数，确保 `$reset()` 在异步流程或测试中也能安全执行。 */
  state: (): SettingState => ({
    language: 'CHS',
  }),

  getters: {
    /** 返回冻结后的语言选项，页面不能改写前端支持范围。 */
    languageList: (): readonly Readonly<LanguageOption>[] => LANGUAGE_OPTIONS,
  },

  actions: {
    /** 在同步 Nuxt 上下文中初始化当前实例的语言 Cookie。 */
    initializeLanguagePersistence(): void {
      initializeSettingStoreRuntime(this)
    },

    /** `$reset()` 后重新应用已持久化的语言偏好。 */
    restoreLanguagePreference(): void {
      restoreLanguagePreference(this)
    },

    /**
     * 更新语言偏好并同步 Cookie。
     *
     * 实际 i18n 语言切换仍由 useAppLocale 统一执行，避免 Store 与界面语言不一致。
     */
    setLanguage(value: AppLocale): void {
      this.language = value
      const runtime = settingStoreRuntimeMap.get(this)
      // 未初始化时只更新 state，不能在可能已跨越 await 的 action 中临时调用 useCookie。
      if (runtime) runtime.languageCookie.value = value
    },
  },
})

/** 默认导出 Store 定义，保持与参考项目一致，并让 Nuxt Pinia HMR 扫描器识别变量声明。 */
export default setting
