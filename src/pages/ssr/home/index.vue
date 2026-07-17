<script setup lang="ts">
import { ElMessage } from 'element-plus'
import MallFooter from '@/components/common/MallFooter.vue'
import MallHeader from '@/components/common/MallHeader.vue'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'
import ActivitySection from './components/activitySection.vue'
import BomSection from './components/bomSection.vue'
import BrandSection from './components/brandSection.vue'
import HeroSection from './components/heroSection.vue'
import ProductSection from './components/productSection.vue'

/** 与公共页头事件契约一致的快捷操作类型。 */
type HeaderAction = 'bom' | 'cart'

// 首页是公开商城入口，游客无需经过会员鉴权中间件。
definePageMeta({
  name: 'home',
  path: '/',
  requiresAuth: false,
})

// 公共页头和首页会员区只需要会员展示名，不在首页复制或改写认证状态。
const { userStore } = useStores()

// 退出按钮状态属于当前页面交互，不写入全局 Store。
const isLoggingOut = ref(false)

/**
 * Banner 接口接入点：接口会一次返回 8 张图片 URL。
 * 收到接口地址后，在页面加载阶段为该数组赋值即可，轮播组件不需要再调整。
 */
const bannerUrls = ref<string[]>([])

// 首页反馈复用现有认证语言包，切换语言后提示会同步变化。
const { t } = useI18n()

/** 公共页头提交搜索时给出明确反馈，商品搜索页接入后替换为真实跳转。 */
function handleSearch(keyword: string): void {
  ElMessage.info(`正在准备搜索“${keyword}”的商品结果`)
}

/** 公共页头和首页 BOM 入口暂时展示接入提示，避免无反馈的空按钮。 */
function handleHeaderAction(action: HeaderAction): void {
  if (action === 'cart') {
    void navigateTo('/cart')
    return
  }
  ElMessage.info('BOM 配单功能即将开放')
}

/**
 * 撤销当前设备会话。
 *
 * User Store 会在请求前立即清理并广播本地认证状态；即使服务端暂时不可用，
 * 页面也不会重新恢复已退出的会话。请求层已展示过的异常不在页面重复弹出。
 */
async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return
  isLoggingOut.value = true

  try {
    await userStore.logout()
    ElMessage.success(t('communal.logoutSuccess.text'))
  } catch (error) {
    if (!isApiRequestError(error) || !error.isShown) {
      ElMessage.warning(t('communal.logoutFailed.text'))
    }
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="mall-home">
    <MallHeader
      :user-name="userStore.displayName"
      :cart-count="0"
      :logout-pending="isLoggingOut"
      @search="handleSearch"
      @action="handleHeaderAction"
      @logout="handleLogout"
    />

    <main>
      <HeroSection :user-name="userStore.displayName" :banner-urls="bannerUrls" />
      <ActivitySection />
      <BrandSection />
      <ProductSection />
      <BomSection @action="handleHeaderAction" />
    </main>

    <MallFooter />
  </div>
</template>

<style lang="scss" scoped>
.mall-home {
  --mall-primary: var(--mall-color-primary);
  --mall-primary-dark: var(--mall-color-primary-dark);
  --mall-text: var(--mall-color-text);
  --mall-muted: var(--mall-color-muted);
  --mall-border: var(--mall-color-border);

  min-width: 320px;
  color: var(--mall-text);
  background: #f4f6f9;
}

</style>
