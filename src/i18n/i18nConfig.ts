/**
 * Vue I18n 运行时配置。
 *
 * 使用 Composition API 模式；本地基础语言包始终包含关键文案，因此关闭缺失键噪声，
 * 真正缺失时统一回退到 CHS。
 */
export default defineI18nConfig(() => ({
  legacy: false,
  globalInjection: true,
  fallbackLocale: 'CHS',
  missingWarn: false,
  fallbackWarn: false,
}))
