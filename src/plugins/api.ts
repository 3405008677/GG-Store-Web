import type { ApiClient } from '@/api/request'
import { ElMessage } from 'element-plus'
import { createApiClient } from '@/api/request'
import { LOGIN_PATH } from '@/config/app'
import { useStores } from '@/stores'
import { isSessionRefreshBlocked } from '@/utils/core/storage'

/**
 * 为当前 Nuxt 应用实例创建并注入 API 客户端。
 *
 * Store 状态、刷新回调和路由实例都绑定当前应用，避免 SSR 请求之间共享会员凭证。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  // 插件显式传入当前应用 Pinia，防止服务端请求之间误用其他实例。
  const { userStore } = useStores(nuxtApp.$pinia)

  // 刷新回调必须复用同一个客户端，因此先声明变量，再在客户端配置闭包中引用。
  let api: ApiClient
  let sessionExpiredTask: Promise<void> | undefined

  /** 串行处理并发请求触发的会话失效，避免重复清理和重复导航。 */
  function handleSessionExpired(): Promise<void> {
    if (sessionExpiredTask) return sessionExpiredTask

    sessionExpiredTask = (async () => {
      // 刷新后仍返回 401 说明凭证链不可再用；推进代次可同步淘汰其他标签页的迟到响应。
      userStore.expireSession()
      const currentRoute = nuxtApp.$router.currentRoute.value
      if (currentRoute.path !== LOGIN_PATH) {
        await nuxtApp.runWithContext(() =>
          navigateTo(
            {
              path: LOGIN_PATH,
              query: { redirect: currentRoute.fullPath },
            },
            { replace: true },
          ),
        )
      }
    })().finally(() => {
      sessionExpiredTask = undefined
    })

    return sessionExpiredTask
  }

  api = createApiClient({
    baseURL: config.public.apiBase,
    getAuthorization: () => userStore.authorizationHeader,
    // Store 自带 single-flight；成功后请求层从 getAuthorization 读取新 Bearer 并重放一次。
    refreshSession: (rejectedAuthorization) => userStore.refreshSession(api, rejectedAuthorization),
    isSessionRefreshBlocked,
    translate: (key, fallback) => String(nuxtApp.$i18n.t(key, fallback)),
    // SSR 不传 notifier，确保 isShown 只表示浏览器确实展示或抑制了消息。
    notifyError: import.meta.client ? (message) => ElMessage.error(message) : undefined,
    onSessionExpired: handleSessionExpired,
  })

  if (import.meta.client) {
    // 首页等公开 SSR 页面不会进入鉴权中间件；等首次水合完成后再通过 HttpOnly
    // Refresh Cookie 恢复内存会话，既能刷新出会员信息，也不会造成 SSR 水合不一致。
    nuxtApp.hook('app:mounted', () => {
      void userStore.ensureSession(api)
    })
  }

  return { provide: { api } }
})
