import type { ApiClient } from '@/api/request'

/** 为 Nuxt App 注入对象补充 `$api` 类型。 */
declare module '#app' {
  interface NuxtApp {
    $api: ApiClient
  }

  interface PageMeta {
    /** 仅显式标记的会员页面进入全局登录守卫，商城公开页面保持匿名可访问。 */
    requiresAuth?: boolean
  }
}

/** 允许 Options API 或模板通过组件实例识别 `$api`。 */
declare module 'vue' {
  interface ComponentCustomProperties {
    $api: ApiClient
  }
}

export {}
