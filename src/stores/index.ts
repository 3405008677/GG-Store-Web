/**
 * Store 仓库统一入口。
 *
 * 目录、默认导出和集中实例化方式参考 gg.autofinance。参考项目是 Vite SPA，可以在
 * 模块顶层持有唯一 Pinia；本项目使用 Nuxt，因此必须把 Store 绑定到当前应用的
 * `$pinia`，避免服务端渲染请求之间共享会员状态。
 */
import type { Pinia } from 'pinia'
import setting from '@/stores/setting'
import user from '@/stores/user'

/** 当前商城已经接入的全局 Store 实例集合。 */
export interface AppStores {
  settingStore: ReturnType<typeof setting>
  userStore: ReturnType<typeof user>
}

/**
 * 获取绑定当前 Nuxt 应用的全局 Store。
 *
 * 页面 setup 和组合函数可省略 pinia；Nuxt 插件、中间件等基础设施应显式传入
 * `nuxtApp.$pinia`。Pinia 会对同一实例重复调用返回同一个 Store。
 */
export function useStores(pinia?: Pinia): AppStores {
  const settingStore = setting(pinia)
  const userStore = user(pinia)

  // 参考项目会在入口立即实例化全局 Store；这里同步初始化每个 Store 的非序列化运行时资源。
  settingStore.initializeLanguagePersistence()
  userStore.initializeAuthSync()

  return {
    settingStore,
    userStore,
  }
}

/**
 * 将全部全局 Store 恢复到初始状态。
 *
 * User Store 的 BroadcastChannel、Promise 和等待器不属于 Pinia state，需要先单独释放；
 * `$reset()` 随后按 Options Store 的 state 工厂恢复可序列化数据。
 */
export function resetPinia(pinia?: Pinia): void {
  const { settingStore, userStore } = useStores(pinia)
  // 先推进认证代次，使所有已经发出的登录或刷新响应在返回后自动失效。
  userStore.invalidateSessionForReset()
  userStore.disposeAuthSync()
  settingStore.$reset()
  userStore.$reset()
  // 语言属于持久化偏好，重置运行时状态后仍应从已捕获的 Cookie 恢复。
  settingStore.restoreLanguagePreference()
  // resetPinia 是运行中重置而非应用卸载，当前页面仍需继续接收其他标签页的认证广播。
  userStore.initializeAuthSync()
}

/** 同时导出 Store 定义，供测试或需要显式 Pinia 实例的基础设施使用。 */
export { setting, user }
