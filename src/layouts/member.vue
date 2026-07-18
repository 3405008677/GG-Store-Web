<script setup lang="ts">
import { ElMessage } from 'element-plus'
import MallFooter from '@/components/common/MallFooter.vue'
import MallHeader from '@/components/common/MallHeader.vue'
import MemberSidebar from '@/components/member/MemberSidebar.vue'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'
import { useCartBadge } from '@/utils/cartBadge'

/** 会员布局支持的公共页头快捷操作。 */
type HeaderAction = 'catalog' | 'cart'

/** 布局只消费认证展示状态，不直接持久化 Token 或 Cookie。 */
const { userStore } = useStores()
const { count: cartCount, refresh: refreshCartCount, clear: clearCartCount } = useCartBadge()
const { t } = useI18n()
const isLoggingOut = ref(false)

/** 会员中心页头搜索与公开商城使用同一个真实搜索页。 */
function handleSearch(keyword: string): void {
  void navigateTo({ path: '/products', query: { keyword } })
}

/** 页头快捷入口统一进入已经接入真实后端的页面。 */
function handleHeaderAction(action: HeaderAction): void {
  if (action === 'cart') {
    void navigateTo('/cart')
    return
  }
  void navigateTo('/products')
}

/** 退出期间锁定页头按钮，并由 Store 完成服务端会话撤销。 */
async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return
  isLoggingOut.value = true

  try {
    clearCartCount()
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

watch(
  () => userStore.userInfo?.id,
  (userId) => {
    if (!import.meta.client) return
    if (userId) void refreshCartCount(true).catch(() => undefined)
    else clearCartCount()
  },
  { immediate: true },
)
</script>

<template>
  <div class="member-shell">
    <MallHeader
      :user-name="userStore.displayName"
      :cart-count="cartCount"
      :logout-pending="isLoggingOut"
      @search="handleSearch"
      @action="handleHeaderAction"
      @logout="handleLogout"
    />

    <main class="member-main">
      <MemberSidebar />
      <div class="member-content">
        <slot />
      </div>
    </main>

    <MallFooter />
  </div>
</template>

<style lang="scss" scoped>
.member-shell {
  min-width: 320px;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 86% 8%, rgb(23 104 215 / 4%), transparent 24%),
    var(--mall-color-page);
}

.member-main {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  width: min(var(--mall-content-max), calc(100% - var(--mall-page-gutter)));
  min-height: 560px;
  padding: 24px 0 48px;
  margin: 0 auto;
}

.member-content {
  min-width: 0;
}

@media (max-width: 920px) {
  .member-main {
    grid-template-columns: 1fr;
    padding-top: 14px;
  }
}
</style>
