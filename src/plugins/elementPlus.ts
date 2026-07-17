import {
  ElButton,
  ElCheckbox,
  ElConfigProvider,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElSwitch,
} from 'element-plus'

/**
 * 只注册项目模板实际使用的 Element Plus 组件。
 *
 * 避免 `app.use(ElementPlus)` 把整个组件库运行时代码放进首屏入口；消息与确认框按页面函数导入，
 * 组件样式仍由 nuxt.config.ts 统一引入，语言由 app.vue 的 ConfigProvider 控制。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const components = [
    ElButton,
    ElCheckbox,
    ElConfigProvider,
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
