const normalizeProxyTarget = (target: string | undefined) => target?.replace(/\/+$/, '')

// Windows 下开发服务和生产构建同时写同一个生成目录会触发文件锁。
// 显式分离目录，也允许 CI 通过环境变量选择临时生成位置。
const nuxtBuildDir =
  process.env.NUXT_BUILD_DIR ||
  (process.env.NODE_ENV === 'production'
    ? 'node_modules/.cache/nuxt-production/.nuxt'
    : '.nuxt')

// 后端未开放跨域访问，开发环境通过 Nuxt 按 API 路径转发到对应的微服务。
const apiProxyTargets = {
  order: normalizeProxyTarget(process.env.NUXT_ORDER_API_PROXY_TARGET),
  catalog: normalizeProxyTarget(process.env.NUXT_CATALOG_API_PROXY_TARGET),
  cart: normalizeProxyTarget(process.env.NUXT_CART_API_PROXY_TARGET),
  merchant: normalizeProxyTarget(process.env.NUXT_MERCHANT_API_PROXY_TARGET),
  admin: normalizeProxyTarget(process.env.NUXT_ADMIN_API_PROXY_TARGET),
  // 兼容原有的单服务变量，已有本地配置无需立即迁移。
  userManage: normalizeProxyTarget(
    process.env.NUXT_USER_MANAGE_API_PROXY_TARGET || process.env.NUXT_API_PROXY_TARGET,
  ),
}

// Nitro 开发代理会改变后端看到的来源 IP，因此不得作为生产网关使用。
const shouldProxyApi = process.env.NODE_ENV !== 'production'

const createApiProxyRoute = (target: string | undefined, route: string) =>
  shouldProxyApi && target
    ? {
        [route]: { proxy: `${target}${route}` },
      }
    : {}

export default defineNuxtConfig({
  // 业务代码统一放在 src 下，保持与 gg.autofinance 相同的源码分层习惯。
  compatibilityDate: '2026-07-17',
  buildDir: nuxtBuildDir,
  srcDir: 'src/',
  // 生产环境关闭开发面板，减少无关客户端代码和运行时监听。
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
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
    // 公开 SSR 请求可通过服务器侧绝对网关地址访问目录服务；浏览器仍保持同源。
    apiBase: process.env.NUXT_API_BASE || '',
    public: {
      // 浏览器始终访问同源地址；服务端真实地址只存在于非 public 的代理配置中。
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/',
    },
  },
  routeRules: {
    // ssr/csr 目录只负责源码分组，实际渲染方式始终按公开 URL 显式声明。
    '/': { ssr: true },
    '/login': { ssr: false },
    '/register': { ssr: false },
    // 会员数据依赖浏览器内存中的短效 Token，使用 CSR 可避免输出无数据的 SSR 外壳和重复水合。
    '/member/**': { ssr: false },
    '/cart': { ssr: false },
    // 控制器按 WebApi 中的“服务/控制器”路由分组，代理时保留完整路径与大小写。
    ...createApiProxyRoute(apiProxyTargets.order, '/Order/**'),
    ...createApiProxyRoute(apiProxyTargets.catalog, '/Catalog/**'),
    ...createApiProxyRoute(apiProxyTargets.cart, '/Cart/**'),
    ...createApiProxyRoute(apiProxyTargets.merchant, '/Merchant/**'),
    ...createApiProxyRoute(apiProxyTargets.admin, '/Admin/**'),
    ...createApiProxyRoute(apiProxyTargets.userManage, '/UserManage/**'),
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
