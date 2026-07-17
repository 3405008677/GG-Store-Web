<script setup lang="ts">
import en from 'element-plus/es/locale/lang/en'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const { locale } = useI18n()

// 业务语言码使用 CHS/ENG，这里映射为 Element Plus 内置语言对象。
const elementLocale = computed(() => (locale.value === 'ENG' ? en : zhCn))

// 同步 HTML lang，供无障碍工具、浏览器翻译和搜索引擎识别页面语言。
const htmlLanguage = computed(() => (locale.value === 'ENG' ? 'en-US' : 'zh-CN'))

// 响应式 head 在切换语言后立即更新，不需要刷新页面。
useHead(() => ({
  htmlAttrs: { lang: htmlLanguage.value },
}))
</script>

<template>
  <ElConfigProvider :locale="elementLocale">
    <NuxtLoadingIndicator color="#1768d7" :height="3" />
    <!-- 页面布局由各路由的 definePageMeta 决定；认证页使用 false，会员页使用 member。 -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </ElConfigProvider>
</template>
