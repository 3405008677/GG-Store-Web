// 后端未开放跨域访问，开发环境通过 Nuxt 将同源 /api 请求转发到 UserManage 服务。
const apiProxyTarget = process.env.NUXT_API_PROXY_TARGET?.replace(/\/+$/, '')
// Nitro 开发代理会改变后端看到的来源 IP，因此不得作为生产网关使用。
const shouldProxyApi = process.env.NODE_ENV !== 'production' && Boolean(apiProxyTarget)

export default defineNuxtConfig({
  // 业务代码统一放在 src 下，保持与 gg.autofinance 相同的源码分层习惯。
  compatibilityDate: '2026-07-17',
  srcDir: 'src/',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],
  // 页面私有组件与页面入口共址，但不得被 Nuxt 扫描成独立路由。
  pages: {
    pattern: ['**/*.vue', '!**/components/**/*.vue'],
  },
  css: ['~/styles/index.scss', 'element-plus/dist/index.css'],
  app: {
    head: {
      title: '管管商城',
      meta: [
        { name: 'description', content: '管管商城，一站式电子元器件与工业品采购平台' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      // 浏览器始终访问同源地址；服务端真实地址只存在于非 public 的代理配置中。
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },
  routeRules: {
    // ssr/csr 目录只负责源码分组，实际渲染方式始终按公开 URL 显式声明。
    '/': { ssr: true },
    '/login': { ssr: false },
    // 只有开发环境认证接口需要经过 Nitro 同源代理。
    // UserManage 控制器本身以 /api 开头，因此开发代理必须保留该前缀。
    ...(shouldProxyApi && apiProxyTarget
      ? {
          // 当前 target 是 UserManage，只代理认证路径；未来 Catalog 等服务必须单独分流。
          '/api/auth/**': { proxy: `${apiProxyTarget}/api/auth/**` },
        }
      : {}),
  },
  i18n: {
    restructureDir: 'src/i18n',
    langDir: 'lang',
    strategy: 'no_prefix',
    defaultLocale: 'CHS',
    // CHS/ENG 是前端既有语言码；language 字段再映射到标准的 zh-CN/en-US。
    locales: [
      { code: 'CHS', language: 'zh-CN', name: '简体中文', files: ['zhCn/communal.ts'] },
      { code: 'ENG', language: 'en-US', name: 'English', files: ['en/communal.ts'] },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'LANGUAGE',
      fallbackLocale: 'CHS',
      redirectOn: 'root',
    },
    vueI18n: 'i18nConfig.ts',
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
})
