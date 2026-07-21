import {
  ElButton,
  ElCheckbox,
  ElConfigProvider,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElSwitch,
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY,
} from 'element-plus'

/**
 * 只注册项目模板实际使用的 Element Plus 组件。
 *
 * 避免 `app.use(ElementPlus)` 把整个组件库运行时代码放进首屏入口；消息与确认框按页面函数导入，
 * 组件样式仍由 nuxt.config.ts 统一引入，语言由 app.vue 的 ConfigProvider 控制。
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Element Plus 的默认 ID 前缀是随机值，SSR 与客户端会因此生成不同的 DOM ID。
  // 注入对象在每次 Nuxt 应用初始化时重新创建，避免 SSR 请求之间共享计数状态。
  nuxtApp.vueApp.provide(ID_INJECTION_KEY, {
    prefix: 1024,
    current: 0,
  })
  nuxtApp.vueApp.provide(ZINDEX_INJECTION_KEY, {
    current: 0,
  })

  const components = [
    ElButton,
    ElCheckbox,
    ElConfigProvider,
    ElDatePicker,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElInputNumber,
    ElOption,
    ElSelect,
    ElSkeleton,
    ElSwitch,
  ]

  for (const component of components) {
    if (component.name) nuxtApp.vueApp.component(component.name, component)
  }
})
