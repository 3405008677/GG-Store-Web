<script setup lang="ts">
import { ElMessage, ElPagination } from 'element-plus'
import type {
  ProductBrandSelectItemResponse,
  ProductCategorySelectItemResponse,
  ProductSearchRankingResponse,
} from '@/api/catalog/types'
import { PublicProductSort } from '@/api/catalog/types'
import {
  getProductSearchRankings,
  listProductBrands,
  listProductCategories,
  pageProducts,
  recordProductSearchSelection,
  searchProducts,
} from '@/api/catalog'
import CatalogProductCard from '@/components/common/CatalogProductCard.vue'
import MallFooter from '@/components/common/MallFooter.vue'
import MallHeader from '@/components/common/MallHeader.vue'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'
import { parseApiDateTime } from '@/utils/apiDateTime'
import { useCartBadge } from '@/utils/cartBadge'

type HeaderAction = 'catalog' | 'cart'
type CatalogMode = 'browse' | 'search'
type QueryPatchValue = string | number | null | undefined

interface CatalogListItem {
  productId: number
  name: string
  subtitle: string
  mainImage: string
  merchantName: string
  categoryName: string
  minimumPrice: number | null
  maximumPrice: number | null
  supportingText: string
}

interface CatalogListResult {
  mode: CatalogMode
  items: CatalogListItem[]
  total: number
  pageIndex: number
  pageSize: number
  searchRequestId: string | null
  searchKeyword: string
  searchExpiresAtUtc: string | null
}

interface LoadOutcome<T> {
  value: T | null
  error: string
}

interface CatalogOptionsResult {
  categories: ProductCategorySelectItemResponse[]
  categoryError: string
  brands: ProductBrandSelectItemResponse[]
  brandError: string
}

interface CatalogDynamicResult {
  products: CatalogListResult | null
  productError: string
  ranking: ProductSearchRankingResponse | null
  rankingError: string
}

definePageMeta({
  name: 'products',
  path: '/products',
  requiresAuth: false,
})

const DEFAULT_PAGE_SIZE = 20
const pageSizeOptions = [12, 20, 32, 48] as const
const sortOptions = [
  { value: PublicProductSort.Default, label: '综合排序' },
  { value: PublicProductSort.PriceAscending, label: '价格从低到高' },
  { value: PublicProductSort.PriceDescending, label: '价格从高到低' },
  { value: PublicProductSort.Newest, label: '最新上架' },
] as const

const route = useRoute()
const { userStore } = useStores()
const { count: cartCount, refresh: refreshCartCount, clear: clearCartCount } = useCartBadge()
const isLoggingOut = ref(false)
const openingProductId = ref<number>()
const priceValidationMessage = ref('')
const priceDraft = reactive<{
  minimum: number | undefined
  maximum: number | undefined
}>({
  minimum: undefined,
  maximum: undefined,
})

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function parsePositiveInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number | undefined {
  const numberValue = Number(firstQueryValue(value))
  return Number.isSafeInteger(numberValue) && numberValue > 0 && numberValue <= maximum
    ? numberValue
    : undefined
}

function parsePrice(value: unknown): number | undefined {
  const raw = firstQueryValue(value)
  if (!raw) return undefined
  const numberValue = Number(raw)
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined
}

function parseSort(value: unknown): PublicProductSort {
  const numberValue = Number(firstQueryValue(value))
  return Object.values(PublicProductSort).includes(numberValue)
    ? numberValue as PublicProductSort
    : PublicProductSort.Default
}

function normalizeSearchKeyword(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '')
    .trim()
  return Array.from(normalized).slice(0, 100).join('')
}

const keyword = computed(() =>
  normalizeSearchKeyword(firstQueryValue(route.query.keyword)),
)
const isSearchMode = computed(() => Boolean(keyword.value))
const categoryId = computed(() => parsePositiveInteger(route.query.categoryId))
const brandId = computed(() => parsePositiveInteger(route.query.brandId))
const minimumPrice = computed(() => parsePrice(route.query.minimumPrice))
const maximumPrice = computed(() => parsePrice(route.query.maximumPrice))
const sort = computed(() => parseSort(route.query.sort))
const pageIndex = computed(() => parsePositiveInteger(route.query.page, 1_000) ?? 1)
const pageSize = computed(() => {
  const value = parsePositiveInteger(route.query.pageSize, 50)
  return value && pageSizeOptions.includes(value as (typeof pageSizeOptions)[number])
    ? value
    : DEFAULT_PAGE_SIZE
})
const priceQueryError = computed(() =>
  minimumPrice.value != null &&
  maximumPrice.value != null &&
  maximumPrice.value < minimumPrice.value
    ? '最高价格不能低于最低价格'
    : '',
)

const dynamicSignature = computed(() => [
  keyword.value,
  categoryId.value ?? '',
  isSearchMode.value ? '' : brandId.value ?? '',
  isSearchMode.value ? '' : minimumPrice.value ?? '',
  isSearchMode.value ? '' : maximumPrice.value ?? '',
  isSearchMode.value ? '' : sort.value,
  pageIndex.value,
  pageSize.value,
].join('|'))

watch(
  () => [route.query.minimumPrice, route.query.maximumPrice],
  () => {
    priceDraft.minimum = parsePrice(route.query.minimumPrice)
    priceDraft.maximum = parsePrice(route.query.maximumPrice)
    priceValidationMessage.value = ''
  },
  { immediate: true },
)

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

async function capture<T>(loader: () => Promise<T>, fallback: string): Promise<LoadOutcome<T>> {
  try {
    return { value: await loader(), error: '' }
  } catch (error) {
    return { value: null, error: getErrorMessage(error, fallback) }
  }
}

function formatPopularity(value: number): string {
  return `${Math.max(0, value).toLocaleString('zh-CN')} 次搜索热度`
}

async function loadCatalogProducts(): Promise<CatalogListResult> {
  if (isSearchMode.value) {
    const response = await searchProducts({
      keyword: keyword.value,
      categoryId: categoryId.value,
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })
    return {
      mode: 'search',
      items: response.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        subtitle: item.subtitle,
        mainImage: item.mainImage,
        merchantName: item.merchantName,
        categoryName: item.categoryName,
        minimumPrice: item.minimumPrice,
        maximumPrice: null,
        supportingText: formatPopularity(item.globalSearchCount),
      })),
      total: response.total,
      pageIndex: response.pageIndex,
      pageSize: response.pageSize,
      searchRequestId: response.searchRequestId,
      searchKeyword: response.keyword,
      searchExpiresAtUtc: response.expiresAtUtc,
    }
  }

  if (priceQueryError.value) throw new Error(priceQueryError.value)
  const response = await pageProducts({
    categoryId: categoryId.value,
    brandId: brandId.value,
    minimumPrice: minimumPrice.value,
    maximumPrice: maximumPrice.value,
    sort: sort.value,
    pageIndex: pageIndex.value,
    pageSize: pageSize.value,
  })
  return {
    mode: 'browse',
    items: response.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      subtitle: item.subtitle,
      mainImage: item.mainImage,
      merchantName: item.merchantName,
      categoryName: item.categoryName,
      minimumPrice: item.minimumPrice,
      maximumPrice: item.maximumPrice,
      supportingText: `${item.availableSkuCount} 个 SKU 可售`,
    })),
    total: response.total,
    pageIndex: response.pageIndex,
    pageSize: response.pageSize,
    searchRequestId: null,
    searchKeyword: '',
    searchExpiresAtUtc: null,
  }
}

const {
  data: optionData,
  pending: optionPending,
  refresh: refreshOptions,
} = await useAsyncData<CatalogOptionsResult>(
  'public-catalog-options',
  async () => {
    const [categoryOutcome, brandOutcome] = await Promise.all([
      capture(() => listProductCategories(), '商品类目加载失败'),
      capture(() => listProductBrands(), '商品品牌加载失败'),
    ])
    return {
      categories: categoryOutcome.value ?? [],
      categoryError: categoryOutcome.error,
      brands: brandOutcome.value ?? [],
      brandError: brandOutcome.error,
    }
  },
)

const {
  data: dynamicData,
  pending: dynamicPending,
  refresh: refreshDynamic,
} = await useAsyncData<CatalogDynamicResult>(
  () => `public-catalog-products:${dynamicSignature.value}`,
  async () => {
    const [productOutcome, rankingOutcome] = await Promise.all([
      capture(() => loadCatalogProducts(), '商品列表加载失败，请稍后重试'),
      capture(
        () => getProductSearchRankings({ categoryId: categoryId.value, limit: 8 }),
        '排行榜加载失败',
      ),
    ])
    return {
      products: productOutcome.value,
      productError: productOutcome.error,
      ranking: rankingOutcome.value,
      rankingError: rankingOutcome.error,
    }
  },
)

const categories = computed(() => optionData.value?.categories ?? [])
const brands = computed(() => optionData.value?.brands ?? [])
const catalogResult = computed(() => dynamicData.value?.products ?? null)
const productError = computed(() => dynamicData.value?.productError ?? '')
const ranking = computed(() => dynamicData.value?.ranking ?? null)
const rankingError = computed(() => dynamicData.value?.rankingError ?? '')
const total = computed(() => catalogResult.value?.total ?? 0)
const currentPage = computed(() => catalogResult.value?.pageIndex ?? pageIndex.value)
const currentPageSize = computed(() => catalogResult.value?.pageSize ?? pageSize.value)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / currentPageSize.value)))

const selectedCategory = computed(() =>
  categories.value.find((item) => item.value === categoryId.value),
)
const selectedBrand = computed(() =>
  brands.value.find((item) => item.value === brandId.value),
)

const resultHeading = computed(() =>
  isSearchMode.value ? `“${keyword.value}”的搜索结果` : '全部可售商品',
)
const resultSummary = computed(() => {
  if (dynamicPending.value) return '正在从商品目录读取最新数据…'
  if (productError.value) return '本次数据读取未完成'
  if (isSearchMode.value) {
    return `为你找到 ${total.value.toLocaleString('zh-CN')} 件相关商品`
  }
  return `当前共有 ${total.value.toLocaleString('zh-CN')} 件商品符合条件`
})

useHead(() => ({
  title: isSearchMode.value
    ? `${keyword.value} - 商品搜索 - 管管商城`
    : '全部商品 - 管管商城',
  meta: [
    {
      name: 'description',
      content: isSearchMode.value
        ? `在管管商城搜索 ${keyword.value} 相关的可售商品。`
        : '浏览管管商城当前公开可售的电子元器件与工业品。',
    },
  ],
}))

function categoryOptionLabel(item: ProductCategorySelectItemResponse): string {
  return `${'　'.repeat(Math.max(0, item.depth))}${item.label}`
}

async function updateRouteQuery(patch: Record<string, QueryPatchValue>): Promise<void> {
  const nextQuery: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string') nextQuery[key] = value
    else if (Array.isArray(value)) {
      const values = value.filter((item): item is string => typeof item === 'string')
      if (values.length) nextQuery[key] = values
    }
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '') delete nextQuery[key]
    else nextQuery[key] = String(value)
  }
  await navigateTo({ path: '/products', query: nextQuery })
}

function handleSearch(searchKeyword: string): void {
  const normalizedKeyword = normalizeSearchKeyword(searchKeyword)
  if (!normalizedKeyword) return
  void navigateTo({
    path: '/products',
    query: { keyword: normalizedKeyword },
  })
}

function handleCategoryChange(value: string | number | undefined): void {
  const numericValue = Number(value)
  void updateRouteQuery({
    categoryId: Number.isSafeInteger(numericValue) && numericValue > 0 ? numericValue : undefined,
    page: undefined,
  })
}

function handleBrandChange(value: string | number | undefined): void {
  const numericValue = Number(value)
  void updateRouteQuery({
    brandId: Number.isSafeInteger(numericValue) && numericValue > 0 ? numericValue : undefined,
    page: undefined,
  })
}

function handleSortChange(value: PublicProductSort): void {
  void updateRouteQuery({
    sort: value === PublicProductSort.Default ? undefined : value,
    page: undefined,
  })
}

function applyPriceFilter(): void {
  const minimum = priceDraft.minimum
  const maximum = priceDraft.maximum
  if (
    (minimum != null && (!Number.isFinite(minimum) || minimum < 0)) ||
    (maximum != null && (!Number.isFinite(maximum) || maximum < 0))
  ) {
    priceValidationMessage.value = '价格必须是大于等于 0 的有效数字'
    return
  }
  if (minimum != null && maximum != null && maximum < minimum) {
    priceValidationMessage.value = '最高价格不能低于最低价格'
    return
  }

  priceValidationMessage.value = ''
  void updateRouteQuery({
    minimumPrice: minimum,
    maximumPrice: maximum,
    page: undefined,
  })
}

function resetAllFilters(): void {
  priceDraft.minimum = undefined
  priceDraft.maximum = undefined
  priceValidationMessage.value = ''
  void navigateTo('/products')
}

function retryOptions(): void {
  void refreshOptions()
}

function retryDynamicData(): void {
  void refreshDynamic()
}

function clearKeyword(): void {
  void updateRouteQuery({ keyword: undefined, page: undefined })
}

function handlePageChange(value: number): void {
  if (value === currentPage.value) return
  void updateRouteQuery({ page: value <= 1 ? undefined : value })
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handlePageSizeChange(value: number): void {
  if (!pageSizeOptions.includes(value as (typeof pageSizeOptions)[number])) return
  void updateRouteQuery({
    pageSize: value === DEFAULT_PAGE_SIZE ? undefined : value,
    page: undefined,
  })
}

function createOperationId(): string | undefined {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) return undefined
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map((item) => item.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** 在后台记录搜索选择；搜索快照过期时先静默获取一份仍包含该商品的新快照。 */
async function recordSearchAttribution(
  productId: number,
  result: CatalogListResult,
): Promise<void> {
  const operationId = createOperationId()
  if (
    result.mode !== 'search' ||
    !result.searchRequestId ||
    !result.searchKeyword ||
    !operationId
  ) {
    return
  }

  let searchRequestId = result.searchRequestId
  let searchKeyword = result.searchKeyword
  const expiresAt = result.searchExpiresAtUtc
    ? parseApiDateTime(result.searchExpiresAtUtc).getTime()
    : 0

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    const refreshed = await searchProducts({
      keyword: keyword.value,
      categoryId: categoryId.value,
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })
    if (!refreshed.items.some((item) => item.productId === productId)) return
    searchRequestId = refreshed.searchRequestId
    searchKeyword = refreshed.keyword
  }

  await recordProductSearchSelection({
    searchRequestId,
    operationId,
    productId,
    keyword: searchKeyword,
  })
}

/**
 * 归因是辅助统计，始终后台提交而不阻塞详情导航；修饰键和中键点击只记录，
 * 由浏览器保留打开新标签/窗口的原生行为。
 */
async function openProduct(productId: number, shouldNavigate = true): Promise<void> {
  if (shouldNavigate && openingProductId.value) return
  const result = catalogResult.value
  if (result?.mode === 'search') {
    void recordSearchAttribution(productId, result).catch(() => undefined)
  }
  if (!shouldNavigate) return

  openingProductId.value = productId
  try {
    await navigateTo(`/products/${productId}`)
  } finally {
    openingProductId.value = undefined
  }
}

function handleHeaderAction(action: HeaderAction): void {
  if (action === 'cart') {
    void navigateTo('/cart')
    return
  }
  void navigateTo('/products')
}

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    clearCartCount()
    await userStore.logout()
    ElMessage.success('已安全退出')
  } catch (error) {
    if (!isApiRequestError(error) || !error.isShown) {
      ElMessage.warning(error instanceof Error ? error.message : '退出失败，请稍后重试')
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
  <div class="products-page">
    <MallHeader
      :user-name="userStore.displayName"
      :cart-count="cartCount"
      :initial-keyword="keyword"
      :logout-pending="isLoggingOut"
      @search="handleSearch"
      @action="handleHeaderAction"
      @logout="handleLogout"
    />

    <main class="products-container">
      <nav class="breadcrumb" aria-label="面包屑">
        <NuxtLink to="/">首页</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>商品中心</span>
        <template v-if="keyword">
          <span aria-hidden="true">/</span>
          <strong>{{ keyword }}</strong>
        </template>
      </nav>

      <section class="catalog-intro">
        <div>
          <span class="catalog-intro__eyebrow">{{ isSearchMode ? 'PRODUCT SEARCH' : 'PRODUCT CATALOG' }}</span>
          <h1>{{ resultHeading }}</h1>
          <p>{{ resultSummary }}</p>
        </div>
        <button v-if="isSearchMode" type="button" class="catalog-intro__action" @click="clearKeyword">
          退出搜索，浏览全部商品
        </button>
      </section>

      <div class="catalog-layout">
        <aside class="catalog-sidebar">
          <section class="filter-panel" aria-labelledby="filter-heading">
            <header class="panel-heading">
              <div>
                <span>FILTER</span>
                <h2 id="filter-heading">筛选商品</h2>
              </div>
              <button type="button" @click="resetAllFilters">清除</button>
            </header>

            <div class="filter-field">
              <label for="catalog-category">商品类目</label>
              <ElSelect
                id="catalog-category"
                class="control-full"
                :model-value="categoryId"
                :disabled="optionPending"
                placeholder="全部类目"
                clearable
                filterable
                @change="handleCategoryChange"
              >
                <ElOption
                  v-for="item in categories"
                  :key="item.value"
                  :label="categoryOptionLabel(item)"
                  :value="item.value"
                />
              </ElSelect>
              <small v-if="selectedCategory">当前：{{ selectedCategory.label }}</small>
              <p v-if="optionData?.categoryError" class="field-error">{{ optionData.categoryError }}</p>
            </div>

            <template v-if="!isSearchMode">
              <div class="filter-field">
                <label for="catalog-brand">商品品牌</label>
                <ElSelect
                  id="catalog-brand"
                  class="control-full"
                  :model-value="brandId"
                  :disabled="optionPending"
                  placeholder="全部品牌"
                  clearable
                  filterable
                  @change="handleBrandChange"
                >
                  <ElOption
                    v-for="item in brands"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
                <small v-if="selectedBrand">当前：{{ selectedBrand.label }}</small>
                <p v-if="optionData?.brandError" class="field-error">{{ optionData.brandError }}</p>
              </div>

              <div class="filter-field">
                <label>价格区间</label>
                <div class="price-range">
                  <ElInputNumber
                    v-model="priceDraft.minimum"
                    :min="0"
                    :step="1"
                    :precision="2"
                    :controls="false"
                    aria-label="最低价格"
                    placeholder="最低价"
                  />
                  <span>—</span>
                  <ElInputNumber
                    v-model="priceDraft.maximum"
                    :min="0"
                    :step="1"
                    :precision="2"
                    :controls="false"
                    aria-label="最高价格"
                    placeholder="最高价"
                  />
                </div>
                <p v-if="priceValidationMessage" class="field-error">{{ priceValidationMessage }}</p>
                <button type="button" class="filter-apply" @click="applyPriceFilter">应用价格</button>
              </div>

              <div class="filter-field">
                <label for="catalog-sort">排列方式</label>
                <ElSelect
                  id="catalog-sort"
                  class="control-full"
                  :model-value="sort"
                  @change="handleSortChange"
                >
                  <ElOption
                    v-for="item in sortOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </div>
            </template>

            <p v-else class="filter-hint">
              关键词搜索按相关度返回结果；品牌、价格和排序可在退出搜索后使用。
            </p>

            <button
              v-if="optionData?.categoryError || optionData?.brandError"
              type="button"
              class="panel-retry"
              @click="retryOptions"
            >
              重新加载筛选数据
            </button>
          </section>

          <section class="ranking-panel" aria-labelledby="ranking-heading">
            <header class="panel-heading">
              <div>
                <span>POPULAR</span>
                <h2 id="ranking-heading">搜索热榜</h2>
              </div>
            </header>

            <div v-if="dynamicPending" class="ranking-loading" aria-label="排行榜加载中">
              <i v-for="index in 5" :key="index" />
            </div>
            <div v-else-if="rankingError" class="ranking-state">
              <p>{{ rankingError }}</p>
              <button type="button" @click="retryDynamicData">重试</button>
            </div>
            <ol v-else-if="ranking?.items.length" class="ranking-list">
              <li v-for="item in ranking.items" :key="item.productId">
                <span>{{ item.rank }}</span>
                <NuxtLink :to="`/products/${item.productId}`">
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.searchCount.toLocaleString('zh-CN') }} 次搜索</small>
                </NuxtLink>
              </li>
            </ol>
            <div v-else class="ranking-state">
              <p>当前范围暂无搜索排行</p>
            </div>
          </section>
        </aside>

        <section class="catalog-results" aria-labelledby="results-heading">
          <header class="results-toolbar">
            <div>
              <h2 id="results-heading">{{ resultHeading }}</h2>
              <p v-if="!dynamicPending && !productError">
                第 {{ currentPage }} / {{ pageCount }} 页
              </p>
            </div>
            <label>
              每页
              <ElSelect
                class="page-size-select"
                :model-value="currentPageSize"
                aria-label="每页商品数量"
                @change="handlePageSizeChange"
              >
                <ElOption
                  v-for="size in pageSizeOptions"
                  :key="size"
                  :label="`${size} 件`"
                  :value="size"
                />
              </ElSelect>
            </label>
          </header>

          <div v-if="dynamicPending" class="product-grid product-grid--loading" aria-label="商品加载中">
            <div v-for="index in 8" :key="index" class="product-skeleton">
              <i />
              <span />
              <span />
              <span />
            </div>
          </div>

          <section v-else-if="productError" class="result-state result-state--error">
            <span aria-hidden="true">!</span>
            <h2>商品数据暂时无法显示</h2>
            <p>{{ productError }}</p>
            <button type="button" @click="retryDynamicData">重新加载</button>
          </section>

          <div v-else-if="catalogResult?.items.length" class="product-grid">
            <CatalogProductCard
              v-for="item in catalogResult.items"
              :key="item.productId"
              :product-id="item.productId"
              :name="item.name"
              :subtitle="item.subtitle"
              :image-url="item.mainImage"
              :merchant-name="item.merchantName"
              :category-name="item.categoryName"
              :minimum-price="item.minimumPrice"
              :maximum-price="item.maximumPrice"
              :supporting-text="item.supportingText"
              :pending="openingProductId === item.productId"
              @select="openProduct"
            />
          </div>

          <section v-else class="result-state">
            <span aria-hidden="true">0</span>
            <h2>{{ isSearchMode ? '没有找到相关商品' : '当前筛选下暂无商品' }}</h2>
            <p>
              {{ isSearchMode ? '试试更换关键词或选择其他类目。' : '请放宽品牌、类目或价格条件后再试。' }}
            </p>
            <button type="button" @click="resetAllFilters">查看全部商品</button>
          </section>

          <footer v-if="!dynamicPending && !productError && total > currentPageSize" class="catalog-pagination">
            <ElPagination
              background
              layout="prev, pager, next"
              :current-page="currentPage"
              :page-size="currentPageSize"
              :total="total"
              :pager-count="5"
              @current-change="handlePageChange"
            />
          </footer>
        </section>
      </div>
    </main>

    <MallFooter />
  </div>
</template>

<style lang="scss" scoped>
.products-page {
  min-width: 320px;
  min-height: 100dvh;
  color: var(--mall-color-text);
  background: var(--mall-color-page);
}

.products-container {
  width: min(var(--mall-content-max, 1800px), calc(100% - var(--mall-page-gutter, 64px)));
  padding: 22px 0 72px;
  margin: 0 auto;
}

.breadcrumb {
  display: flex;
  min-height: 32px;
  gap: 9px;
  align-items: center;
  overflow: hidden;
  color: var(--mall-color-muted);
  font-size: 13px;
  white-space: nowrap;

  a {
    color: var(--mall-color-primary);
    text-decoration: none;
  }

  strong {
    overflow: hidden;
    color: var(--mall-color-text);
    font-weight: 600;
    text-overflow: ellipsis;
  }
}

.catalog-intro {
  position: relative;
  display: flex;
  min-height: 168px;
  gap: 30px;
  align-items: center;
  justify-content: space-between;
  padding: clamp(28px, 4vw, 52px);
  margin: 12px 0 24px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 88% 0%, rgb(78 161 255 / 42%), transparent 36%),
    linear-gradient(120deg, #0f4fa7, #1768d7 58%, #168ecf);
  border-radius: var(--mall-radius-large);
  box-shadow: 0 18px 38px rgb(15 84 183 / 16%);

  &::after {
    position: absolute;
    right: 7%;
    bottom: -86px;
    width: 250px;
    height: 250px;
    content: '';
    border: 34px solid rgb(255 255 255 / 7%);
    border-radius: 50%;
  }

  > div,
  > button {
    position: relative;
    z-index: 1;
  }

  h1 {
    margin: 7px 0 8px;
    font-size: clamp(25px, 3vw, 42px);
    line-height: 1.18;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: rgb(255 255 255 / 78%);
    font-size: 15px;
  }
}

.catalog-intro__eyebrow {
  color: #a9d8ff;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.catalog-intro__action {
  padding: 11px 17px;
  color: #fff;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  background: rgb(255 255 255 / 12%);
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 999px;
  transition: background 160ms ease;

  &:hover {
    background: rgb(255 255 255 / 20%);
  }
}

.catalog-layout {
  display: grid;
  grid-template-columns: minmax(238px, 286px) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.catalog-sidebar {
  display: grid;
  gap: 18px;
}

.filter-panel,
.ranking-panel,
.catalog-results {
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-medium);
}

.filter-panel,
.ranking-panel {
  padding: 20px;
}

.panel-heading {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid #edf0f4;

  span {
    display: block;
    margin-bottom: 2px;
    color: var(--mall-color-primary);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.14em;
  }

  h2 {
    margin: 0;
    font-size: 17px;
  }

  > button {
    padding: 5px 0;
    color: var(--mall-color-primary);
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    border: 0;
  }
}

.filter-field {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;

  label {
    color: #3a475b;
    font-size: 13px;
    font-weight: 650;
  }

  small {
    color: var(--mall-color-muted);
    font-size: 12px;
  }
}

.control-full {
  width: 100%;
}

.filter-field :deep(.el-select__wrapper),
.filter-field :deep(.el-input__wrapper) {
  min-height: 40px;
}

.price-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 6px;
  align-items: center;

  span {
    color: #9aa4b3;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

.filter-apply,
.panel-retry,
.result-state button,
.ranking-state button {
  min-height: 36px;
  padding: 7px 13px;
  color: var(--mall-color-primary);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  background: var(--mall-color-primary-light);
  border: 1px solid rgb(23 104 215 / 14%);
  border-radius: 7px;
  transition:
    color 150ms ease,
    background 150ms ease;

  &:hover {
    color: #fff;
    background: var(--mall-color-primary);
  }
}

.filter-apply {
  width: 100%;
}

.panel-retry {
  width: 100%;
}

.field-error {
  margin: 0;
  color: var(--mall-color-danger);
  font-size: 12px;
  line-height: 1.45;
}

.filter-hint {
  padding: 12px;
  margin: 0 0 17px;
  color: #607187;
  font-size: 12px;
  line-height: 1.65;
  background: #f5f8fc;
  border-radius: 7px;
}

.ranking-loading {
  display: grid;
  gap: 10px;

  i {
    height: 42px;
    background: linear-gradient(90deg, #f1f3f6, #fafbfc 50%, #f1f3f6);
    background-size: 200% 100%;
    border-radius: 7px;
    animation: catalog-loading 1.3s linear infinite;
  }
}

.ranking-list {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f0f2f5;

    &:last-child {
      border-bottom: 0;
    }

    > span {
      display: grid;
      width: 24px;
      height: 24px;
      color: #69768a;
      font-size: 12px;
      font-weight: 750;
      background: #edf1f6;
      border-radius: 6px;
      place-items: center;
    }

    &:nth-child(-n + 3) > span {
      color: #fff;
      background: linear-gradient(135deg, #ff9a42, #f05b45);
    }
  }

  a {
    display: grid;
    min-width: 0;
    color: inherit;
    text-decoration: none;
    gap: 2px;

    &:hover strong {
      color: var(--mall-color-primary);
    }
  }

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 13px;
    transition: color 150ms ease;
  }

  small {
    color: var(--mall-color-muted);
    font-size: 11px;
  }
}

.ranking-state {
  padding: 12px 0 4px;
  color: var(--mall-color-muted);
  font-size: 13px;
  text-align: center;

  p {
    margin: 0 0 10px;
  }
}

.catalog-results {
  min-width: 0;
  padding: clamp(16px, 2vw, 26px);
}

.results-toolbar {
  display: flex;
  min-height: 56px;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18px;
  margin-bottom: 20px;
  border-bottom: 1px solid #edf0f4;

  h2 {
    margin: 0;
    font-size: clamp(18px, 2vw, 24px);
  }

  p {
    margin: 4px 0 0;
    color: var(--mall-color-muted);
    font-size: 12px;
  }

  label {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--mall-color-muted);
    font-size: 13px;
    white-space: nowrap;
  }

}

.page-size-select {
  width: 96px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 238px), 1fr));
  gap: 18px;
}

.product-skeleton {
  min-height: 390px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf0f4;
  border-radius: var(--mall-radius-medium);

  i {
    display: block;
    aspect-ratio: 4 / 3;
    margin-bottom: 20px;
    background: linear-gradient(90deg, #f0f2f5, #fafbfc 50%, #f0f2f5);
    background-size: 200% 100%;
    animation: catalog-loading 1.3s linear infinite;
  }

  span {
    display: block;
    width: calc(100% - 36px);
    height: 13px;
    margin: 0 18px 12px;
    background: #f0f2f5;
    border-radius: 999px;

    &:nth-of-type(1) {
      width: 42%;
    }

    &:nth-of-type(3) {
      width: 68%;
      margin-top: 28px;
    }
  }
}

.result-state {
  display: grid;
  min-height: 430px;
  padding: 50px 20px;
  color: var(--mall-color-muted);
  text-align: center;
  place-items: center;
  align-content: center;

  > span {
    display: grid;
    width: 68px;
    height: 68px;
    margin-bottom: 14px;
    color: var(--mall-color-primary);
    font-size: 22px;
    font-weight: 750;
    background: var(--mall-color-primary-light);
    border-radius: 50%;
    place-items: center;
  }

  h2 {
    margin: 0 0 7px;
    color: var(--mall-color-text);
    font-size: 20px;
  }

  p {
    max-width: 520px;
    margin: 0 0 20px;
    line-height: 1.7;
  }

  button {
    min-width: 120px;
  }
}

.result-state--error > span {
  color: var(--mall-color-danger);
  background: rgb(229 72 77 / 10%);
}

.catalog-pagination {
  display: flex;
  justify-content: center;
  padding-top: 30px;
  margin-top: 28px;
  border-top: 1px solid #edf0f4;

  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@keyframes catalog-loading {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

@media (min-width: 1580px) {
  .catalog-layout {
    grid-template-columns: 294px minmax(0, 1fr);
  }

  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .catalog-layout {
    grid-template-columns: 242px minmax(0, 1fr);
  }

  .filter-panel,
  .ranking-panel {
    padding: 17px;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 880px) {
  .catalog-layout {
    grid-template-columns: 1fr;
  }

  .catalog-sidebar {
    grid-template-columns: minmax(0, 1.6fr) minmax(230px, 1fr);
  }

  .filter-panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;

    > .panel-heading,
    > .filter-hint,
    > .panel-retry {
      grid-column: 1 / -1;
    }
  }

  .filter-field {
    margin-bottom: 14px;
  }
}

@media (max-width: 680px) {
  .products-container {
    width: calc(100% - 32px);
    padding-top: 14px;
  }

  .catalog-intro {
    min-height: 0;
    align-items: flex-start;
    padding: 26px 22px;
    flex-direction: column;
  }

  .catalog-intro__action {
    white-space: normal;
  }

  .catalog-sidebar {
    grid-template-columns: 1fr;
  }

  .product-grid {
    grid-template-columns: 1fr;
  }

  .results-toolbar {
    align-items: flex-start;
  }

  .product-skeleton {
    min-height: 190px;
  }
}

@media (max-width: 480px) {
  .products-container {
    width: calc(100% - 24px);
    padding-bottom: 48px;
  }

  .breadcrumb {
    font-size: 12px;
  }

  .catalog-intro {
    margin-top: 8px;
    border-radius: var(--mall-radius-medium);
  }

  .catalog-intro h1 {
    font-size: 24px;
  }

  .filter-panel {
    grid-template-columns: 1fr;

    > .panel-heading,
    > .filter-hint,
    > .panel-retry {
      grid-column: auto;
    }
  }

  .filter-panel,
  .ranking-panel,
  .catalog-results {
    padding: 15px;
  }

  .results-toolbar {
    gap: 12px;
    flex-direction: column;
  }

  .result-state {
    min-height: 360px;
    padding: 38px 12px;
  }

  .catalog-pagination {
    overflow-x: auto;
    justify-content: flex-start;
  }
}
</style>
