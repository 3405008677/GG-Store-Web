<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { getProductCategoryTree, listProductBrands, pageProducts } from '@/api/catalog'
import { PublicProductSort } from '@/api/catalog/types'
import MallFooter from '@/components/common/MallFooter.vue'
import MallHeader from '@/components/common/MallHeader.vue'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'
import { useCartBadge } from '@/utils/cartBadge'
import ActivitySection from './components/activitySection.vue'
import BomSection from './components/bomSection.vue'
import BrandSection from './components/brandSection.vue'
import HeroSection from './components/heroSection.vue'
import ProductSection from './components/productSection.vue'

/** 与公共页头事件契约一致的快捷操作类型。 */
type HeaderAction = 'catalog' | 'cart'

// 首页是公开商城入口，游客无需经过会员鉴权中间件。
definePageMeta({
  name: 'home',
  path: '/',
  requiresAuth: false,
})

// 公共页头和首页会员区只需要会员展示名，不在首页复制或改写认证状态。
const { userStore } = useStores()
const { count: cartCount, refresh: refreshCartCount, clear: clearCartCount } = useCartBadge()

// 退出按钮状态属于当前页面交互，不写入全局 Store。
const isLoggingOut = ref(false)

/** 当前后端未提供 Banner 接口，组件会展示不伪造业务数据的商城默认封面。 */
const bannerUrls = ref<string[]>([])

// 首页反馈复用现有认证语言包，切换语言后提示会同步变化。
const { t } = useI18n()

/**
 * 首页目录数据彼此独立。单个下游服务异常时保留其余可用内容，避免一个推荐区
 * 暂不可用就让整个公开首页 SSR 失败。
 */
const { data: homeCatalog } = await useAsyncData('home-catalog', async () => {
  const [categoriesResult, brandsResult, productsResult] = await Promise.allSettled([
    getProductCategoryTree(),
    listProductBrands(),
    pageProducts({
      sort: PublicProductSort.Newest,
      pageIndex: 1,
      pageSize: 8,
    }),
  ])

  return {
    categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
    brands: brandsResult.status === 'fulfilled' ? brandsResult.value : [],
    products: productsResult.status === 'fulfilled' ? productsResult.value.items : [],
  }
})

const categories = computed(() => homeCatalog.value?.categories ?? [])
const brands = computed(() => homeCatalog.value?.brands ?? [])
const products = computed(() => homeCatalog.value?.products ?? [])

/** 公共页头提交搜索时进入真实商品搜索与筛选页。 */
function handleSearch(keyword: string): void {
  void navigateTo({ path: '/products', query: { keyword } })
}

/** 公共页头快捷入口只指向已接入的商品目录和购物车。 */
function handleHeaderAction(action: HeaderAction): void {
  if (action === 'cart') {
    void navigateTo('/cart')
    return
  }
  void navigateTo('/products')
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

/** 会话由认证插件恢复后再读取会员购物车，公开 SSR 不携带短效 Access Token。 */
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
  <div class="mall-home">
    <MallHeader
      :user-name="userStore.displayName"
      :cart-count="cartCount"
      :logout-pending="isLoggingOut"
      @search="handleSearch"
      @action="handleHeaderAction"
      @logout="handleLogout"
    />

    <main>
      <HeroSection
        :user-name="userStore.displayName"
        :banner-urls="bannerUrls"
        :categories="categories"
      />
      <ActivitySection />
      <BrandSection :brands="brands" />
      <ProductSection :products="products" />
      <BomSection />
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
  background: var(--mall-color-page);
}

</style>
