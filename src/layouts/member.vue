<script setup lang="ts">
import { ElMessage } from 'element-plus'
import MallFooter from '@/components/common/MallFooter.vue'
import MallHeader from '@/components/common/MallHeader.vue'
import MemberSidebar from '@/components/member/MemberSidebar.vue'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'

/** 会员布局支持的公共页头快捷操作。 */
type HeaderAction = 'bom' | 'cart'

/** 布局只消费认证展示状态，不直接持久化 Token 或 Cookie。 */
const { userStore } = useStores()
const { t } = useI18n()
const isLoggingOut = ref(false)

/** 搜索结果页未开放前保留输入反馈。 */
function handleSearch(keyword: string): void {
  ElMessage.info(`商品搜索页接入后将为你搜索“${keyword}”`)
}

/** 购物车使用真实路由，BOM 接口开放前只给出状态提示。 */
function handleHeaderAction(action: HeaderAction): void {
  if (action === 'cart') {
    void navigateTo('/cart')
    return
  }
  ElMessage.info('BOM 配单功能即将开放')
}

/** 退出期间锁定页头按钮，并由 Store 完成服务端会话撤销。 */
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
  <div class="member-shell">
    <MallHeader
      :user-name="userStore.displayName"
      :cart-count="0"
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
