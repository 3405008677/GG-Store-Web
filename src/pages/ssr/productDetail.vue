<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { ClassifiedContainerSelectData } from '@/api/cart/types'
import {
  addCartItem,
  addFavoriteItem,
  createCart,
  createFavoriteList,
  listCartSelectData,
  listFavoriteListSelectData,
} from '@/api/cart'
import type {
  JsonValue,
  ProductDetailFieldResponse,
  PublicProductDetailResponse,
  PublicProductSkuResponse,
} from '@/api/catalog/types'
import { ProductAttributeValueScope } from '@/api/catalog/types'
import { getProductDetail } from '@/api/catalog'
import MallFooter from '@/components/common/MallFooter.vue'
import MallHeader from '@/components/common/MallHeader.vue'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'
import { useCartBadge } from '@/utils/cartBadge'

type HeaderAction = 'catalog' | 'cart'
type CollectionAction = 'cart' | 'favorite'

definePageMeta({
  name: 'product-detail',
  path: '/products/:id',
  requiresAuth: false,
})

const route = useRoute()
const { userStore } = useStores()
const { count: cartCount, refresh: refreshCartCount, clear: clearCartCount } = useCartBadge()
const productId = computed(() => {
  const value = Number(route.params.id)
  return Number.isSafeInteger(value) && value > 0 ? value : 0
})

const {
  data: product,
  pending,
  error,
  refresh,
} = await useAsyncData<PublicProductDetailResponse>(
  () => `public-product-${productId.value}`,
  async () => {
    if (!productId.value) {
      throw createError({ statusCode: 404, statusMessage: '商品编号无效' })
    }
    return getProductDetail(productId.value)
  },
  { watch: [productId] },
)

if (import.meta.server && error.value) {
  const requestEvent = useRequestEvent()
  const statusCode = Number(error.value.statusCode)
  if (requestEvent) {
    setResponseStatus(
      requestEvent,
      Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
        ? statusCode
        : 500,
    )
  }
}

useHead(() => ({
  title: product.value ? `${product.value.name} - 管管商城` : '商品详情 - 管管商城',
  meta: product.value
    ? [{ name: 'description', content: product.value.subtitle || product.value.description }]
    : [],
}))

const selectedSkuId = ref<number>()
const quantity = ref(1)
const isLoggingOut = ref(false)
const actionDialogVisible = ref(false)
const actionMode = ref<CollectionAction>('cart')
const actionOptions = ref<ClassifiedContainerSelectData[]>([])
const actionTargetId = ref<number>()
const actionLoading = ref(false)
const actionSubmitting = ref(false)
const cartOperationId = ref('')
const cartOperationSignature = ref('')

watch(
  product,
  (value) => {
    selectedSkuId.value = value?.skus[0]?.skuId
    quantity.value = 1
  },
  { immediate: true },
)

watch(
  () => userStore.userInfo?.id,
  (userId) => {
    if (!import.meta.client) return
    if (userId) void refreshCartCount(true).catch(() => undefined)
    else clearCartCount()
  },
  { immediate: true },
)

const selectedSku = computed<PublicProductSkuResponse | undefined>(() =>
  product.value?.skus.find((item) => item.skuId === selectedSkuId.value),
)

const productDetailRecord = computed<Record<string, JsonValue>>(() => {
  const value = product.value?.detail
  return isJsonRecord(value) ? value : {}
})

const selectedSkuSpecification = computed<Record<string, JsonValue>>(() => {
  const value = selectedSku.value?.specification
  return isJsonRecord(value) ? value : {}
})

const productFieldGroups = computed(() =>
  product.value?.detailTemplate?.groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) =>
          field.valueScope === ProductAttributeValueScope.Product &&
          getJsonFieldValue(productDetailRecord.value, field.code) !== undefined,
      ),
    }))
    .filter((group) => group.fields.length) ?? [],
)

const skuFieldGroups = computed(() => {
  const specification = selectedSkuSpecification.value
  return (
    product.value?.detailTemplate?.groups
      .map((group) => ({
        ...group,
        fields: group.fields.filter(
          (field) =>
            field.valueScope === ProductAttributeValueScope.Sku &&
            getJsonFieldValue(specification, field.code) !== undefined,
        ),
      }))
      .filter((group) => group.fields.length) ?? []
  )
})

function isJsonRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 与后端 OrdinalIgnoreCase 模板校验保持一致地读取 JSON 字段。 */
function getJsonFieldValue(
  record: Record<string, JsonValue>,
  fieldCode: string,
): JsonValue | undefined {
  const normalizedCode = fieldCode.toUpperCase()
  const matchingKey = Object.keys(record).find(
    (key) => key.toUpperCase() === normalizedCode,
  )
  return matchingKey === undefined ? undefined : record[matchingKey]
}

function formatPrice(value: number): string {
  return value.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  })
}

function formatFieldValue(value: JsonValue | undefined, field?: ProductDetailFieldResponse): string {
  if (value === undefined || value === null || value === '') return '—'

  const optionLabels = new Map(field?.options.map((option) => [option.value, option.label]) ?? [])
  let text: string
  if (Array.isArray(value)) {
    text = value
      .map((item) =>
        typeof item === 'string' ? optionLabels.get(item) || item : formatFieldValue(item),
      )
      .join('、')
  } else if (typeof value === 'boolean') {
    text = value ? '是' : '否'
  } else if (typeof value === 'object') {
    text = JSON.stringify(value)
  } else {
    text = typeof value === 'string' ? optionLabels.get(value) || value : String(value)
  }
  return field?.unit ? `${text} ${field.unit}` : text
}

function createOperationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map((item) => item.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** 只为完全相同的加购载荷复用幂等 ID；用户改数量、SKU 或目标分类后生成新操作。 */
function resolveCartOperationId(cartId: number, skuId: number, itemQuantity: number): string {
  const signature = `${cartId}:${skuId}:${itemQuantity}`
  if (!cartOperationId.value || cartOperationSignature.value !== signature) {
    cartOperationId.value = createOperationId()
    cartOperationSignature.value = signature
  }
  return cartOperationId.value
}

function showError(errorValue: unknown, fallback = '操作失败，请稍后重试'): void {
  if (!isApiRequestError(errorValue) || !errorValue.isShown) {
    ElMessage.error(errorValue instanceof Error ? errorValue.message : fallback)
  }
}

async function ensureSignedIn(): Promise<boolean> {
  if (await userStore.ensureSession()) return true
  await navigateTo({
    path: '/login',
    query: { redirect: route.fullPath },
  })
  return false
}

async function createDefaultCollection(mode: CollectionAction): Promise<ClassifiedContainerSelectData> {
  if (mode === 'cart') {
    const cart = await createCart({
      name: '默认购物车',
      description: '系统为首次加购自动创建',
      isDefault: true,
      sortOrder: 0,
    })
    return { value: cart.id, label: cart.name, isDefault: cart.isDefault, version: cart.version }
  }

  const list = await createFavoriteList({
    name: '默认收藏夹',
    description: '系统为首次收藏自动创建',
    isDefault: true,
    sortOrder: 0,
  })
  return { value: list.id, label: list.name, isDefault: list.isDefault, version: list.version }
}

async function openCollectionAction(mode: CollectionAction): Promise<void> {
  if (!product.value || actionLoading.value) return
  if (mode === 'cart' && !selectedSku.value) {
    ElMessage.warning('当前商品没有可售 SKU')
    return
  }
  if (!(await ensureSignedIn())) return

  actionMode.value = mode
  actionLoading.value = true
  try {
    const options =
      mode === 'cart' ? await listCartSelectData() : await listFavoriteListSelectData()
    actionOptions.value = options.length ? options : [await createDefaultCollection(mode)]
    actionTargetId.value =
      actionOptions.value.find((item) => item.isDefault)?.value ?? actionOptions.value[0]?.value
    if (mode === 'cart') {
      cartOperationId.value = ''
      cartOperationSignature.value = ''
    }
    actionDialogVisible.value = true
  } catch (errorValue) {
    showError(errorValue, mode === 'cart' ? '无法读取购物车分类' : '无法读取收藏夹分类')
  } finally {
    actionLoading.value = false
  }
}

async function submitCollectionAction(): Promise<void> {
  if (!product.value || !actionTargetId.value || actionSubmitting.value) return
  actionSubmitting.value = true
  try {
    if (actionMode.value === 'cart') {
      if (!selectedSku.value) return
      const itemQuantity = Math.min(
        Math.max(Number.isFinite(quantity.value) ? Math.trunc(quantity.value) : 1, 1),
        selectedSku.value.availableStock,
        9999,
      )
      await addCartItem(actionTargetId.value, {
        operationId: resolveCartOperationId(
          actionTargetId.value,
          selectedSku.value.skuId,
          itemQuantity,
        ),
        productSkuId: selectedSku.value.skuId,
        quantity: itemQuantity,
        isSelected: true,
      })
      cartOperationId.value = ''
      cartOperationSignature.value = ''
      void refreshCartCount(true).catch(() => undefined)
      ElMessage.success('商品已加入购物车')
    } else {
      await addFavoriteItem(actionTargetId.value, product.value.productId)
      ElMessage.success('商品已加入收藏夹')
    }
    actionDialogVisible.value = false
  } catch (errorValue) {
    showError(errorValue)
  } finally {
    actionSubmitting.value = false
  }
}

function handleSearch(keyword: string): void {
  void navigateTo({ path: '/products', query: { keyword } })
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
  } catch (errorValue) {
    showError(errorValue, '退出失败，请稍后重试')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="product-page">
    <MallHeader
      :user-name="userStore.displayName"
      :cart-count="cartCount"
      :logout-pending="isLoggingOut"
      @search="handleSearch"
      @action="handleHeaderAction"
      @logout="handleLogout"
    />

    <main class="page-container">
      <nav class="breadcrumbs" aria-label="面包屑">
        <NuxtLink to="/">首页</NuxtLink>
        <span>›</span>
        <NuxtLink to="/products">全部商品</NuxtLink>
        <template v-if="product">
          <span>›</span>
          <NuxtLink :to="{ path: '/products', query: { categoryId: product.categoryId } }">
            {{ product.categoryName }}
          </NuxtLink>
          <span>›</span>
          <strong>{{ product.name }}</strong>
        </template>
      </nav>

      <section v-if="pending" class="state-card">
        <ElSkeleton :rows="10" animated />
      </section>

      <section v-else-if="error || !product" class="state-card state-card--empty">
        <span aria-hidden="true">!</span>
        <h1>商品暂时无法查看</h1>
        <p>商品可能已下架、库存售罄，或目录服务暂时不可用。</p>
        <div>
          <ElButton @click="refresh()">重新加载</ElButton>
          <ElButton type="primary" @click="navigateTo('/products')">浏览其他商品</ElButton>
        </div>
      </section>

      <template v-else>
        <section class="product-hero">
          <div class="product-image">
            <img
              v-if="product.mainImage"
              :src="product.mainImage"
              :alt="product.name"
              fetchpriority="high"
            />
            <span v-else aria-hidden="true">GG</span>
          </div>

          <article class="product-summary">
            <div class="product-tags">
              <span>{{ product.categoryName }}</span>
              <span v-if="product.brandName">{{ product.brandName }}</span>
              <span>现货可售</span>
            </div>
            <h1>{{ product.name }}</h1>
            <p class="product-subtitle">{{ product.subtitle || '专业工业品与电子元器件供应' }}</p>

            <dl class="product-meta">
              <div>
                <dt>供应商</dt>
                <dd>{{ product.merchantName }}</dd>
              </div>
              <div>
                <dt>商品编号</dt>
                <dd>{{ product.productId }}</dd>
              </div>
              <div>
                <dt>可售 SKU</dt>
                <dd>{{ product.skus.length }} 种</dd>
              </div>
            </dl>

            <div v-if="selectedSku" class="price-panel">
              <span>商城价</span>
              <strong>{{ formatPrice(selectedSku.price) }}</strong>
              <del v-if="selectedSku.originalPrice > selectedSku.price">
                {{ formatPrice(selectedSku.originalPrice) }}
              </del>
            </div>

            <div class="sku-picker">
              <strong>选择规格</strong>
              <div>
                <button
                  v-for="sku in product.skus"
                  :key="sku.skuId"
                  type="button"
                  :class="{ active: selectedSkuId === sku.skuId }"
                  @click="selectedSkuId = sku.skuId"
                >
                  <span>{{ sku.skuCode }}</span>
                  <small>库存 {{ sku.availableStock }}</small>
                </button>
              </div>
            </div>

            <div class="purchase-row">
              <ElInputNumber
                v-model="quantity"
                :min="1"
                :max="Math.min(selectedSku?.availableStock || 1, 9999)"
                aria-label="购买数量"
              />
              <ElButton
                type="primary"
                size="large"
                :loading="actionLoading && actionMode === 'cart'"
                :disabled="!selectedSku"
                @click="openCollectionAction('cart')"
              >
                加入购物车
              </ElButton>
              <ElButton
                size="large"
                :loading="actionLoading && actionMode === 'favorite'"
                @click="openCollectionAction('favorite')"
              >
                收藏商品
              </ElButton>
            </div>
          </article>
        </section>

        <section class="detail-layout">
          <article class="detail-main">
            <header>
              <span>PRODUCT DETAILS</span>
              <h2>商品详情</h2>
            </header>

            <p class="description">{{ product.description || '商家暂未填写商品说明。' }}</p>

            <section
              v-for="group in productFieldGroups"
              :key="group.code"
              class="attribute-group"
            >
              <h3>{{ group.label }}</h3>
              <dl>
                <div v-for="field in group.fields" :key="field.code">
                  <dt>{{ field.label }}</dt>
                  <dd>
                    {{
                      formatFieldValue(
                        getJsonFieldValue(productDetailRecord, field.code),
                        field,
                      )
                    }}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              v-for="group in skuFieldGroups"
              :key="group.code"
              class="attribute-group"
            >
              <h3>{{ group.label }} · {{ selectedSku?.skuCode }}</h3>
              <dl>
                <div v-for="field in group.fields" :key="field.code">
                  <dt>{{ field.label }}</dt>
                  <dd>
                    {{
                      formatFieldValue(
                        getJsonFieldValue(selectedSkuSpecification, field.code),
                        field,
                      )
                    }}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              v-if="
                selectedSku &&
                !skuFieldGroups.length &&
                Object.keys(selectedSkuSpecification).length
              "
              class="attribute-group"
            >
              <h3>SKU 参数 · {{ selectedSku.skuCode }}</h3>
              <dl>
                <div v-for="(value, key) in selectedSkuSpecification" :key="key">
                  <dt>{{ key }}</dt>
                  <dd>{{ formatFieldValue(value) }}</dd>
                </div>
              </dl>
            </section>

            <section
              v-if="!productFieldGroups.length && Object.keys(productDetailRecord).length"
              class="attribute-group"
            >
              <h3>商品参数</h3>
              <dl>
                <div v-for="(value, key) in productDetailRecord" :key="key">
                  <dt>{{ key }}</dt>
                  <dd>{{ formatFieldValue(value) }}</dd>
                </div>
              </dl>
            </section>
          </article>

          <aside class="service-card">
            <h2>采购保障</h2>
            <ul>
              <li><strong>实时库存</strong><span>页面库存来自当前可售 SKU 快照</span></li>
              <li><strong>价格复核</strong><span>结算时将再次校验价格与库存</span></li>
              <li><strong>商家隔离</strong><span>商品归属 {{ product.merchantName }}</span></li>
            </ul>
            <NuxtLink to="/products">继续浏览商品</NuxtLink>
          </aside>
        </section>
      </template>
    </main>

    <MallFooter />

    <ElDialog
      v-model="actionDialogVisible"
      :title="actionMode === 'cart' ? '加入购物车' : '收藏商品'"
      width="min(460px, calc(100% - 28px))"
    >
      <ElForm label-position="top">
        <ElFormItem :label="actionMode === 'cart' ? '目标购物车' : '目标收藏夹'">
          <ElSelect v-model="actionTargetId" class="collection-select">
            <ElOption
              v-for="item in actionOptions"
              :key="item.value"
              :value="item.value"
              :label="item.isDefault ? `${item.label}（默认）` : item.label"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="actionMode === 'cart'" label="加入数量">
          <ElInputNumber
            v-model="quantity"
            :min="1"
            :max="Math.min(selectedSku?.availableStock || 1, 9999)"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="actionDialogVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="actionSubmitting"
          :disabled="!actionTargetId"
          @click="submitCollectionAction"
        >
          确认
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style lang="scss" scoped>
.product-page {
  min-width: 320px;
  background: var(--mall-color-page);
}

.page-container {
  width: min(var(--mall-content-max), calc(100% - var(--mall-page-gutter)));
  min-height: 620px;
  padding-bottom: 54px;
  margin: 0 auto;
}

.breadcrumbs {
  display: flex;
  gap: 9px;
  align-items: center;
  min-height: 48px;
  overflow: hidden;
  color: var(--mall-color-muted);
  font-size: 12px;
  white-space: nowrap;

  a {
    color: inherit;
    text-decoration: none;
  }

  strong {
    overflow: hidden;
    color: var(--mall-color-text);
    text-overflow: ellipsis;
  }
}

.state-card,
.product-hero,
.detail-main,
.service-card {
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  box-shadow: var(--mall-shadow-card);
}

.state-card {
  min-height: 500px;
  padding: 48px;
  border-radius: var(--mall-radius-large);
}

.state-card--empty {
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;

  > span {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    color: var(--mall-color-primary);
    font-size: 26px;
    background: var(--mall-color-primary-light);
    border-radius: 50%;
  }

  h1 {
    margin: 20px 0 8px;
  }

  p {
    margin: 0 0 24px;
    color: var(--mall-color-muted);
  }
}

.product-hero {
  display: grid;
  grid-template-columns: minmax(340px, 42%) minmax(0, 1fr);
  min-height: 520px;
  border-radius: var(--mall-radius-large);
}

.product-image {
  display: grid;
  place-items: center;
  min-height: 520px;
  overflow: hidden;
  color: #91a5bf;
  font-size: 56px;
  font-weight: 900;
  background:
    radial-gradient(circle at center, rgb(23 104 215 / 8%), transparent 48%),
    #f8fafc;
  border-right: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large) 0 0 var(--mall-radius-large);

  img {
    width: 88%;
    height: 88%;
    object-fit: contain;
    mix-blend-mode: multiply;
  }
}

.product-summary {
  padding: clamp(28px, 3vw, 48px);

  h1 {
    margin: 14px 0 8px;
    font-size: clamp(26px, 2.5vw, 38px);
    line-height: 1.3;
  }
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    padding: 4px 8px;
    color: var(--mall-color-primary);
    font-size: 10px;
    background: var(--mall-color-primary-light);
    border-radius: 4px;
  }
}

.product-subtitle {
  margin: 0 0 22px;
  color: var(--mall-color-muted);
}

.product-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 0 20px;
  border: 1px solid var(--mall-color-border);
  border-radius: 8px;

  div {
    padding: 12px 14px;
    border-right: 1px solid var(--mall-color-border);

    &:last-child {
      border-right: 0;
    }
  }

  dt {
    color: var(--mall-color-muted);
    font-size: 10px;
  }

  dd {
    margin: 4px 0 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.price-panel {
  display: flex;
  gap: 13px;
  align-items: baseline;
  padding: 17px 18px;
  margin-bottom: 22px;
  background: linear-gradient(90deg, #fff3ef, #fff9f6);
  border-radius: 7px;

  span {
    color: var(--mall-color-muted);
    font-size: 12px;
  }

  strong {
    color: #e94e35;
    font-size: 29px;
  }

  del {
    color: #a3aab4;
    font-size: 12px;
  }
}

.sku-picker {
  display: grid;
  gap: 10px;

  > strong {
    font-size: 13px;
  }

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  button {
    display: grid;
    gap: 3px;
    min-width: 112px;
    padding: 9px 12px;
    color: var(--mall-color-text);
    text-align: left;
    background: #fff;
    border: 1px solid var(--mall-color-border);
    border-radius: 6px;
    cursor: pointer;

    &.active {
      color: var(--mall-color-primary);
      background: var(--mall-color-primary-light);
      border-color: var(--mall-color-primary);
    }

    small {
      color: var(--mall-color-muted);
      font-size: 9px;
    }
  }
}

.purchase-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  align-items: start;
  margin-top: 18px;
}

.detail-main,
.service-card {
  border-radius: var(--mall-radius-large);
}

.detail-main {
  padding: 30px;

  > header span {
    color: var(--mall-color-primary);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  > header h2 {
    margin: 5px 0 20px;
    font-size: 24px;
  }
}

.description {
  padding: 18px;
  margin: 0 0 24px;
  color: #526074;
  line-height: 1.9;
  white-space: pre-wrap;
  background: #f8fafc;
  border-radius: 8px;
}

.attribute-group {
  margin-top: 26px;

  h3 {
    padding-bottom: 10px;
    margin: 0;
    font-size: 16px;
    border-bottom: 2px solid var(--mall-color-primary);
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    border-left: 1px solid var(--mall-color-border);
  }

  dl > div {
    display: grid;
    grid-template-columns: minmax(100px, 34%) 1fr;
    min-height: 46px;
    border-right: 1px solid var(--mall-color-border);
    border-bottom: 1px solid var(--mall-color-border);
  }

  dt,
  dd {
    display: flex;
    align-items: center;
    padding: 9px 12px;
    overflow-wrap: anywhere;
  }

  dt {
    color: var(--mall-color-muted);
    font-size: 11px;
    background: #f8fafc;
  }

  dd {
    margin: 0;
    font-size: 12px;
  }
}

.service-card {
  position: sticky;
  top: 18px;
  padding: 22px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  ul {
    display: grid;
    gap: 16px;
    padding: 20px 0;
    margin: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 4px;
  }

  li strong {
    font-size: 12px;
  }

  li span {
    color: var(--mall-color-muted);
    font-size: 10px;
    line-height: 1.6;
  }

  > a {
    display: grid;
    place-items: center;
    height: 38px;
    color: var(--mall-color-primary);
    font-size: 12px;
    text-decoration: none;
    border: 1px solid #a9c9f1;
    border-radius: 5px;
  }
}

.collection-select {
  width: 100%;
}

@media (max-width: 920px) {
  .product-hero {
    grid-template-columns: 1fr;
  }

  .product-image {
    min-height: 380px;
    border-right: 0;
    border-bottom: 1px solid var(--mall-color-border);
    border-radius: var(--mall-radius-large) var(--mall-radius-large) 0 0;
  }

  .detail-layout {
    grid-template-columns: 1fr;
  }

  .service-card {
    position: static;
  }
}

@media (max-width: 640px) {
  .product-image {
    min-height: 300px;
  }

  .product-summary,
  .detail-main {
    padding: 20px;
  }

  .product-meta,
  .attribute-group dl {
    grid-template-columns: 1fr;
  }

  .product-meta div {
    border-right: 0;
    border-bottom: 1px solid var(--mall-color-border);

    &:last-child {
      border-bottom: 0;
    }
  }

  .purchase-row :deep(.el-button) {
    flex: 1;
    margin-left: 0;
  }
}
</style>
