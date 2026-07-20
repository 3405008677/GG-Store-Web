import { DEFAULT_HOME_PATH, LOGIN_PATH, REGISTER_PATH } from '@/config/app'
import { useStores } from '@/stores'

/** 只接受站内绝对路径，防止 redirect 参数形成开放重定向。 */
function getSafeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined
  const redirectPath = (value.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/'
  if (redirectPath === LOGIN_PATH || redirectPath === REGISTER_PATH) return undefined
  return value
}

/**
 * 全局会员会话守卫。
 *
 * 当前 Access Token 仅保存在浏览器内存，因此会话恢复在客户端导航阶段完成；
 * 真正的数据权限始终由后端 Bearer 鉴权兜底，不能依赖前端守卫保证安全。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const isAuthPage = to.path === LOGIN_PATH || to.path === REGISTER_PATH
  const requiresAuth = to.meta.requiresAuth === true

  // 公开页面的会话展示由客户端挂载后的启动恢复负责；路由中间件只为认证页和受保护页立即校验。
  if (!isAuthPage && !requiresAuth) return

  // 中间件显式传入当前 Nuxt 应用 Pinia，避免依赖全局 active Pinia。
  const { userStore } = useStores(useNuxtApp().$pinia)
  const hasSession = await userStore.ensureSession()

  // 已登录用户访问登录或注册页时恢复其原始目标，避免重复创建认证会话。
  if (hasSession) {
    if (isAuthPage) return navigateTo(getSafeRedirect(to.query.redirect) || DEFAULT_HOME_PATH, { replace: true })
    return
  }

  // 匿名用户可以停留在登录/注册页；只有显式声明 requiresAuth 的页面才跳转。
  if (isAuthPage) return
  return navigateTo({ path: LOGIN_PATH, query: { redirect: to.fullPath } }, { replace: true })
})
