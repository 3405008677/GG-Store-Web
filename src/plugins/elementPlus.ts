import ElementPlus from 'element-plus'

/**
 * 全局注册 Element Plus 组件和指令。
 *
 * 组件样式由 nuxt.config.ts 的 css 统一引入，语言由 app.vue 的 ConfigProvider 控制。
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(ElementPlus)
})
