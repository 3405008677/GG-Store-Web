import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@/config/app'
import { useStores } from '@/stores'

/** 只接受站内绝对路径，防止 redirect 参数形成开放重定向。 */
function getSafeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined
  const redirectPath = (value.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/'
  if (redirectPath === LOGIN_PATH) return undefined
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

  const isLoginPage = to.path === LOGIN_PATH
  const requiresAuth = to.meta.requiresAuth === true

  // 商品浏览等匿名页面不应触发 Refresh Cookie 轮换；登录页例外，用于把已有会话送回原目标。
  if (!isLoginPage && !requiresAuth) return

  // 中间件显式传入当前 Nuxt 应用 Pinia，避免依赖全局 active Pinia。
  const { userStore } = useStores(useNuxtApp().$pinia)
  const hasSession = await userStore.ensureSession()

  // 已登录用户访问登录页时恢复其原始目标，避免重复登录。
  if (hasSession) {
    if (isLoginPage) return navigateTo(getSafeRedirect(to.query.redirect) || DEFAULT_HOME_PATH, { replace: true })
    return
  }

  // 匿名用户可以停留在登录页；只有显式声明 requiresAuth 的页面才跳转。
  if (isLoginPage) return
  return navigateTo({ path: LOGIN_PATH, query: { redirect: to.fullPath } }, { replace: true })
})
