import type { AppLocale } from '@/types/auth'
import { useStores } from '@/stores'

/** 商城前端当前支持的语言白名单。 */
export const APP_LOCALES = ['CHS', 'ENG'] as const satisfies readonly AppLocale[]

/** 校验 Cookie、查询参数等不可信值是否为受支持语言。 */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && APP_LOCALES.includes(value as AppLocale)
}

/**
 * 统一控制 Nuxt i18n 与 Setting Store。
 *
 * 页面只通过该组合函数切换语言，避免界面语言和持久化 Cookie 出现不一致。
 */
export function useAppLocale() {
  const i18n = useI18n()
  // 语言能力从统一 Store 入口取得实例，保持全局状态调用方式一致。
  const { settingStore } = useStores()

  /** 切换运行时语言，并同步写入业务语言 Cookie。 */
  async function setAppLocale(locale: AppLocale): Promise<void> {
    await i18n.setLocale(locale)
    settingStore.setLanguage(locale)
  }

  return {
    t: i18n.t,
    locale: i18n.locale,
    setAppLocale,
  }
}
