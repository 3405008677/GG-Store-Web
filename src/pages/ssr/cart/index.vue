<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CartDetail, CartItem, CartSummary } from '@/api/cart/types'
import {
  archiveCart,
  createCart,
  deleteCartItem,
  getCart,
  listCarts,
  mergeCarts,
  updateCart,
  updateCartItem,
} from '@/api/cart'
import { isApiRequestError } from '@/types/api'

/** 购物车属于受保护会员页面，统一复用会员中心页头、侧栏和页脚。 */
definePageMeta({
  name: 'shopping-cart',
  path: '/cart',
  layout: 'member',
  requiresAuth: true,
})

useHead({ title: '购物车 - 管管商城' })

/** 创建与编辑弹窗共用的本地表单结构。 */
interface CollectionForm {
  name: string
  description: string
  isDefault: boolean
  sortOrder: number
}

/** 购物车摘要、当前详情与页面加载状态。 */
const carts = ref<CartSummary[]>([])
const selectedId = ref<number>()
const detail = ref<CartDetail>()
const isListLoading = ref(true)
const isDetailLoading = ref(false)
const isSubmitting = ref(false)
const busySkuId = ref<number>()
const collectionDialogVisible = ref(false)
const collectionDialogMode = ref<'create' | 'edit'>('create')
const mergeDialogVisible = ref(false)
const mergeTargetId = ref<number>()

/** 递增序号用于丢弃快速切换分类时较晚返回的旧详情请求。 */
let detailLoadSequence = 0

/** 弹窗表单不直接绑定接口响应，取消编辑时不会污染当前详情。 */
const collectionForm = reactive<CollectionForm>({
  name: '',
  description: '',
  isDefault: false,
  sortOrder: 0,
})

/** 合并目标不能选择当前购物车。 */
const mergeTargets = computed(() =>
  carts.value.filter((item) => item.id !== selectedId.value),
)

/** 结算区只统计已选择且当前可售的商品。 */
const selectedItems = computed(() =>
  detail.value?.items.filter((item) => item.isSelected && item.isAvailable) ?? [],
)

/** 当前可结算商品的总件数。 */
const selectedQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.quantity, 0),
)

/** 当前可结算商品的金额预览。 */
const selectedAmount = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
)

/** 后端仍可能保留已经选中但随后失效的商品，结算前必须显式拦截。 */
const hasUnavailableSelection = computed(() =>
  detail.value?.items.some((item) => item.isSelected && !item.isAvailable) ?? false,
)

/** 详情页顶部展示的全部 SKU 件数，避免模板在每次更新时重复归并。 */
const detailTotalQuantity = computed(() =>
  detail.value?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
)

/** 使用固定人民币格式展示后端返回的单价和小计。 */
function formatPrice(value: number): string {
  return value.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  })
}

/** 请求层已弹出的错误不再重复提示。 */
function showError(error: unknown): void {
  if (!isApiRequestError(error) || !error.isShown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败，请稍后重试')
  }
}

/** 局部详情更新后同步左侧摘要，减少一次完整列表请求。 */
function syncSummary(cart: CartDetail): void {
  const summary = carts.value.find((item) => item.id === cart.id)
  if (!summary) return
  summary.name = cart.name
  summary.description = cart.description
  summary.isDefault = cart.isDefault
  summary.sortOrder = cart.sortOrder
  summary.itemCount = cart.items.length
  summary.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  summary.version = cart.version
  summary.updatedAt = cart.updatedAt
}

/** 加载指定购物车详情，并忽略快速切换产生的过期响应。 */
async function loadDetail(cartId: number): Promise<void> {
  const requestSequence = ++detailLoadSequence
  selectedId.value = cartId
  isDetailLoading.value = true
  try {
    const cart = await getCart(cartId)
    if (requestSequence !== detailLoadSequence) return
    detail.value = cart
    syncSummary(cart)
  } catch (error) {
    if (requestSequence !== detailLoadSequence) return
    detail.value = undefined
    showError(error)
  } finally {
    if (requestSequence === detailLoadSequence) isDetailLoading.value = false
  }
}

/** 刷新购物车摘要，并尽量保持用户当前选中的分类。 */
async function loadCarts(preferredId?: number): Promise<void> {
  isListLoading.value = true
  try {
    carts.value = await listCarts()
    const targetId =
      carts.value.find((item) => item.id === preferredId)?.id ??
      carts.value.find((item) => item.id === selectedId.value)?.id ??
      carts.value[0]?.id

    if (targetId) await loadDetail(targetId)
    else {
      detailLoadSequence += 1
      selectedId.value = undefined
      detail.value = undefined
      isDetailLoading.value = false
    }
  } catch (error) {
    carts.value = []
    detail.value = undefined
    showError(error)
  } finally {
    isListLoading.value = false
  }
}

/** 使用适合当前列表数量的默认值打开创建弹窗。 */
function openCreateDialog(): void {
  collectionDialogMode.value = 'create'
  Object.assign(collectionForm, {
    name: '',
    description: '',
    isDefault: carts.value.length === 0,
    sortOrder: carts.value.length * 10,
  })
  collectionDialogVisible.value = true
}

/** 将当前购物车快照复制到编辑表单。 */
function openEditDialog(): void {
  if (!detail.value) return
  collectionDialogMode.value = 'edit'
  Object.assign(collectionForm, {
    name: detail.value.name,
    description: detail.value.description || '',
    isDefault: detail.value.isDefault,
    sortOrder: detail.value.sortOrder,
  })
  collectionDialogVisible.value = true
}

/** 创建或按乐观并发版本更新购物车分类。 */
async function submitCollection(): Promise<void> {
  const name = collectionForm.name.normalize('NFKC').trim()
  const description = collectionForm.description.normalize('NFKC').trim()
  if (!name) {
    ElMessage.warning('请输入购物车名称')
    return
  }

  isSubmitting.value = true
  try {
    const request = {
      name,
      description,
      isDefault: collectionForm.isDefault,
      sortOrder: collectionForm.sortOrder,
    }
    const result =
      collectionDialogMode.value === 'create'
        ? await createCart(request)
        : await updateCart(detail.value!.id, {
            ...request,
            expectedVersion: detail.value!.version,
          })
    collectionDialogVisible.value = false
    ElMessage.success(collectionDialogMode.value === 'create' ? '购物车创建成功' : '购物车更新成功')
    await loadCarts(result.id)
  } catch (error) {
    showError(error)
    if (isApiRequestError(error) && error.code === 'CART_VERSION_CONFLICT') {
      await loadCarts(selectedId.value)
    }
  } finally {
    isSubmitting.value = false
  }
}

/** 二次确认后归档当前购物车，并处理并发版本冲突。 */
async function handleArchive(): Promise<void> {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `归档“${detail.value.name}”后将不再出现在购物车列表中，此操作目前不能恢复。`,
      '确认归档购物车',
      {
        confirmButtonText: '确认归档',
        cancelButtonText: '暂不归档',
        type: 'warning',
      },
    )
    await archiveCart(detail.value.id, detail.value.version)
    ElMessage.success('购物车已归档')
    selectedId.value = undefined
    await loadCarts()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showError(error)
    if (isApiRequestError(error) && error.code === 'CART_VERSION_CONFLICT') {
      await loadCarts(selectedId.value)
    }
  }
}

/** 为合并弹窗预选第一个可用目标。 */
function openMergeDialog(): void {
  if (!detail.value || !mergeTargets.value.length) return
  mergeTargetId.value = mergeTargets.value[0]?.id
  mergeDialogVisible.value = true
}

/** 将当前购物车合并到用户选择的目标分类。 */
async function submitMerge(): Promise<void> {
  if (!detail.value || !mergeTargetId.value) return
  isSubmitting.value = true
  try {
    const sourceName = detail.value.name
    const target = await mergeCarts(detail.value.id, mergeTargetId.value)
    mergeDialogVisible.value = false
    ElMessage.success(`“${sourceName}”已合并到“${target.name}”`)
    await loadCarts(target.id)
  } catch (error) {
    showError(error)
  } finally {
    isSubmitting.value = false
  }
}

/** 以 SKU 版本为并发条件提交数量或选中状态变更。 */
async function submitItemUpdate(
  item: CartItem,
  quantity: number,
  isSelected: boolean,
): Promise<void> {
  if (!detail.value || busySkuId.value) return
  busySkuId.value = item.productSkuId
  try {
    const updated = await updateCartItem(detail.value.id, item.productSkuId, {
      quantity,
      isSelected,
      expectedItemVersion: item.version,
    })
    detail.value = updated
    syncSummary(updated)
  } catch (error) {
    showError(error)
    if (isApiRequestError(error) && error.code === 'CART_VERSION_CONFLICT') {
      await loadDetail(detail.value.id)
    }
  } finally {
    busySkuId.value = undefined
  }
}

/** 规范化数量并忽略没有实际变化的输入。 */
function handleQuantityChange(item: CartItem, value: number | undefined): void {
  const quantity = Math.max(1, Math.min(9999, Number(value) || item.quantity))
  if (quantity === item.quantity) return
  void submitItemUpdate(item, quantity, item.isSelected)
}

/** 只在选中状态真实改变时调用更新接口。 */
function handleSelectionChange(item: CartItem, value: boolean): void {
  if (value === item.isSelected) return
  void submitItemUpdate(item, item.quantity, value)
}

/** 二次确认后从当前购物车移除 SKU。 */
async function handleDeleteItem(item: CartItem): Promise<void> {
  if (!detail.value || busySkuId.value) return
  try {
    await ElMessageBox.confirm(
      `确定从购物车移除“${item.productName}”吗？`,
      '移除商品',
      {
        confirmButtonText: '移除',
        cancelButtonText: '保留',
      },
    )
    busySkuId.value = item.productSkuId
    const cartId = detail.value.id
    await deleteCartItem(cartId, item.productSkuId)
    ElMessage.success('商品已移出购物车')
    await loadCarts(cartId)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showError(error)
  } finally {
    busySkuId.value = undefined
  }
}

/** 在订单接口开放前仅完成前置校验，不伪造结算动作。 */
function handleCheckout(): void {
  if (!selectedItems.value.length) {
    ElMessage.warning('请先选择可售商品')
    return
  }
  if (hasUnavailableSelection.value) {
    ElMessage.warning('请取消选择已失效商品后再结算')
    return
  }
  ElMessage.warning('订单创建和结算接口尚未开放，已为你保留当前购物车选中状态')
}

/** 页面首次挂载后读取会员购物车；错误由统一提示逻辑处理。 */
onMounted(() => void loadCarts())
</script>

<template>
  <section class="cart-page">
    <header class="page-heading">
      <div>
        <span>SHOPPING CART</span>
        <h1>购物车</h1>
        <p>按分类管理待购 SKU，价格和库存以当前查询结果为准</p>
      </div>
      <ElButton type="primary" @click="openCreateDialog">新建购物车</ElButton>
    </header>

    <div class="cart-layout">
      <aside class="cart-list" aria-label="购物车分类列表">
        <header>
          <strong>购物车分类</strong>
          <span>{{ carts.length }}/50</span>
        </header>

        <div v-if="isListLoading" class="cart-list__loading">
          <ElSkeleton :rows="4" animated />
        </div>

        <div v-else-if="carts.length" class="cart-list__items">
          <button
            v-for="item in carts"
            :key="item.id"
            type="button"
            :class="{ active: selectedId === item.id }"
            @click="loadDetail(item.id)"
          >
            <span class="cart-list__icon" aria-hidden="true">车</span>
            <span class="cart-list__name">
              <strong>{{ item.name }}</strong>
              <small>{{ item.itemCount }} 种 / {{ item.totalQuantity }} 件</small>
            </span>
            <i v-if="item.isDefault">默认</i>
          </button>
        </div>

        <button v-else class="cart-list__empty" type="button" @click="openCreateDialog">
          <span>＋</span>
          创建第一个购物车
        </button>
      </aside>

      <article class="cart-detail">
        <div v-if="isDetailLoading" class="detail-loading">
          <ElSkeleton :rows="7" animated />
        </div>

        <template v-else-if="detail">
          <header class="detail-heading">
            <div>
              <div class="detail-heading__title">
                <h2>{{ detail.name }}</h2>
                <span v-if="detail.isDefault">默认购物车</span>
              </div>
              <p>{{ detail.description || '暂未填写购物车说明' }}</p>
            </div>
            <div class="detail-actions">
              <ElButton @click="openEditDialog">编辑</ElButton>
              <ElButton :disabled="!mergeTargets.length" @click="openMergeDialog">合并</ElButton>
              <ElButton type="danger" plain @click="handleArchive">归档</ElButton>
            </div>
          </header>

          <div class="detail-meta">
            <span><strong>{{ detail.items.length }}</strong> 种 SKU</span>
            <span>共 {{ detailTotalQuantity }} 件</span>
            <span>版本 {{ detail.version }}</span>
          </div>

          <div v-if="detail.items.length" class="cart-items">
            <div class="cart-items__header">
              <span>商品信息</span>
              <span>单价</span>
              <span>数量</span>
              <span>小计</span>
              <span>操作</span>
            </div>

            <article
              v-for="item in detail.items"
              :key="item.id"
              v-memo="[item.version, busySkuId === item.productSkuId]"
              class="cart-item"
              :class="{ 'cart-item--unavailable': !item.isAvailable }"
            >
              <div class="cart-item__product">
                <ElCheckbox
                  :model-value="item.isSelected"
                  :disabled="busySkuId === item.productSkuId"
                  :aria-label="`选择 ${item.productName}`"
                  @change="(value: boolean | string | number) => handleSelectionChange(item, Boolean(value))"
                />
                <div class="cart-item__image">
                  <img
                    v-if="item.mainImage"
                    :src="item.mainImage"
                    :alt="item.productName"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else aria-hidden="true">GG</span>
                </div>
                <div class="cart-item__name">
                  <strong>{{ item.productName }}</strong>
                  <span>SKU：{{ item.skuCode }}</span>
                  <small :class="{ unavailable: !item.isAvailable }">
                    {{ item.isAvailable ? `可用库存 ${item.availableStock}` : '商品当前不可售' }}
                  </small>
                </div>
              </div>
              <strong class="cart-item__price">{{ formatPrice(item.unitPrice) }}</strong>
              <div class="cart-item__quantity">
                <ElInputNumber
                  :model-value="item.quantity"
                  :min="1"
                  :max="9999"
                  :disabled="busySkuId === item.productSkuId"
                  size="small"
                  @change="(value: number | undefined) => handleQuantityChange(item, value)"
                />
              </div>
              <strong class="cart-item__subtotal">{{ formatPrice(item.unitPrice * item.quantity) }}</strong>
              <button
                type="button"
                :disabled="busySkuId === item.productSkuId"
                @click="handleDeleteItem(item)"
              >
                {{ busySkuId === item.productSkuId ? '处理中…' : '移除' }}
              </button>
            </article>

            <footer class="cart-summary">
              <div>
                已选 <strong>{{ selectedQuantity }}</strong> 件
                <span v-if="hasUnavailableSelection">已失效商品不计入结算金额</span>
              </div>
              <div class="cart-summary__amount">
                <span>商品合计</span>
                <strong>{{ formatPrice(selectedAmount) }}</strong>
                <small>不含运费，结算时重新校验价格与库存</small>
              </div>
              <button type="button" @click="handleCheckout">去结算</button>
            </footer>
          </div>

          <div v-else class="detail-empty">
            <span aria-hidden="true">车</span>
            <h3>购物车还是空的</h3>
            <p>商品页选择具体规格后，可以加入当前购物车。</p>
            <NuxtLink to="/">去商城选购</NuxtLink>
          </div>
        </template>

        <div v-else class="detail-empty detail-empty--page">
          <span aria-hidden="true">＋</span>
          <h3>还没有购物车分类</h3>
          <p>创建购物车后即可分类管理准备购买的商品 SKU。</p>
          <ElButton type="primary" @click="openCreateDialog">创建购物车</ElButton>
        </div>
      </article>
    </div>

    <ElDialog
      v-model="collectionDialogVisible"
      :title="collectionDialogMode === 'create' ? '新建购物车' : '编辑购物车'"
      width="min(480px, calc(100% - 28px))"
    >
      <ElForm label-position="top" @submit.prevent="submitCollection">
        <ElFormItem label="购物车名称" required>
          <ElInput v-model="collectionForm.name" maxlength="64" show-word-limit placeholder="例如：研发打样" />
        </ElFormItem>
        <ElFormItem label="购物车说明">
          <ElInput
            v-model="collectionForm.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="可选，说明这个购物车的用途"
          />
        </ElFormItem>
        <div class="form-row">
          <ElFormItem label="显示顺序">
            <ElInputNumber v-model="collectionForm.sortOrder" :min="0" :max="9999" />
          </ElFormItem>
          <ElFormItem label="默认购物车">
            <ElSwitch v-model="collectionForm.isDefault" :disabled="collectionDialogMode === 'edit' && detail?.isDefault" />
          </ElFormItem>
        </div>
      </ElForm>
      <template #footer>
        <ElButton @click="collectionDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="isSubmitting" @click="submitCollection">
          {{ collectionDialogMode === 'create' ? '创建' : '保存' }}
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="mergeDialogVisible"
      title="合并购物车"
      width="min(440px, calc(100% - 28px))"
    >
      <p class="merge-tip">
        合并后，当前购物车会归入目标购物车；相同 SKU 会累加数量并合并选中状态，此操作不可撤销。
      </p>
      <ElSelect v-model="mergeTargetId" class="merge-select" placeholder="选择目标购物车">
        <ElOption
          v-for="item in mergeTargets"
          :key="item.id"
          :label="`${item.name}（${item.itemCount} 种 / ${item.totalQuantity} 件）`"
          :value="item.id"
        />
      </ElSelect>
      <template #footer>
        <ElButton @click="mergeDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="isSubmitting" :disabled="!mergeTargetId" @click="submitMerge">确认合并</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style lang="scss" scoped>
.cart-page {
  display: grid;
  gap: 16px;
}

.page-heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  min-height: 116px;
  padding: 24px 28px;
  background: linear-gradient(110deg, #fff, #f5f9ff);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);

  h1 {
    margin: 5px 0 6px;
    color: var(--mall-color-text);
    font-size: 26px;
  }

  p {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 13px;
  }

  > div > span {
    color: var(--mall-color-primary);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
  }
}

.cart-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.cart-list,
.cart-detail {
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);
}

.cart-list {
  overflow: hidden;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding: 0 16px;
    border-bottom: 1px solid var(--mall-color-border);

    strong {
      font-size: 14px;
    }

    span {
      color: var(--mall-color-muted);
      font-size: 11px;
    }
  }
}

.cart-list__loading {
  padding: 18px;
}

.cart-list__items {
  display: grid;
  gap: 4px;
  padding: 8px;

  button {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 9px;
    align-items: center;
    min-height: 58px;
    padding: 7px 9px;
    color: #536074;
    text-align: left;
    background: none;
    border: 0;
    border-radius: 7px;
    cursor: pointer;

    &:hover,
    &.active {
      color: var(--mall-color-primary);
      background: var(--mall-color-primary-light);
    }

    > i {
      padding: 2px 5px;
      color: var(--mall-color-primary);
      font-size: 9px;
      font-style: normal;
      background: #fff;
      border: 1px solid #b9d2f4;
      border-radius: 3px;
    }
  }
}

.cart-list__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: #5f7fa9;
  font-size: 10px;
  font-weight: 800;
  background: #edf3fa;
  border-radius: 7px;
}

.cart-list__name {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #98a2af;
    font-size: 10px;
  }
}

.cart-list__empty {
  display: grid;
  gap: 7px;
  justify-items: center;
  width: 100%;
  padding: 32px 12px;
  color: var(--mall-color-muted);
  font-size: 12px;
  background: none;
  border: 0;
  cursor: pointer;

  span {
    color: var(--mall-color-primary);
    font-size: 25px;
  }
}

.cart-detail {
  min-height: 500px;
}

.detail-loading {
  padding: 34px;
}

.detail-heading {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding: 22px 24px 17px;

  h2 {
    margin: 0;
    color: var(--mall-color-text);
    font-size: 20px;
  }

  p {
    margin: 7px 0 0;
    color: var(--mall-color-muted);
    font-size: 11px;
  }
}

.detail-heading__title {
  display: flex;
  gap: 9px;
  align-items: center;

  span {
    padding: 3px 7px;
    color: var(--mall-color-primary);
    font-size: 9px;
    background: var(--mall-color-primary-light);
    border-radius: 3px;
  }
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  justify-content: flex-end;
}

.detail-meta {
  display: flex;
  gap: 24px;
  padding: 11px 24px;
  color: var(--mall-color-muted);
  font-size: 10px;
  background: #fafbfd;
  border-top: 1px solid #edf0f4;
  border-bottom: 1px solid #edf0f4;

  strong {
    color: var(--mall-color-primary);
  }
}

.cart-items__header,
.cart-item {
  display: grid;
  grid-template-columns: minmax(300px, 1fr) 105px 140px 115px 58px;
  gap: 14px;
  align-items: center;
}

.cart-items__header {
  min-height: 42px;
  padding: 0 20px;
  color: #8a94a3;
  font-size: 10px;
  text-align: center;
  border-bottom: 1px solid #edf0f4;

  span:first-child {
    text-align: left;
  }
}

.cart-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 116px;
  min-height: 116px;
  padding: 15px 20px;
  border-bottom: 1px solid #edf0f4;

  > button {
    padding: 0;
    color: var(--mall-color-muted);
    font-size: 11px;
    background: none;
    border: 0;
    cursor: pointer;

    &:hover {
      color: var(--mall-color-danger);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.55;
    }
  }
}

.cart-item--unavailable {
  background: #fbfbfc;

  .cart-item__image,
  .cart-item__name strong,
  .cart-item__price,
  .cart-item__subtotal {
    opacity: 0.52;
  }
}

.cart-item__product {
  display: grid;
  grid-template-columns: auto 76px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.cart-item__image {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  overflow: hidden;
  color: #7f92ad;
  font-size: 16px;
  font-weight: 900;
  background: #f3f5f8;
  border: 1px solid #eaedf1;
  border-radius: 6px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    mix-blend-mode: multiply;
  }
}

.cart-item__name {
  display: grid;
  gap: 5px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: var(--mall-color-text);
    font-size: 12px;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--mall-color-muted);
    font-size: 10px;
  }

  small {
    justify-self: start;
    padding: 2px 6px;
    color: #287653;
    font-size: 9px;
    background: #edf9f3;
    border-radius: 3px;

    &.unavailable {
      color: #975760;
      background: #fff0f1;
    }
  }
}

.cart-item__price,
.cart-item__subtotal {
  color: var(--mall-color-text);
  font-size: 12px;
  text-align: center;
}

.cart-item__subtotal {
  color: #e2543f;
}

.cart-item__quantity {
  display: flex;
  justify-content: center;

  :deep(.el-input-number) {
    width: 112px;
  }
}

.cart-summary {
  position: sticky;
  z-index: 3;
  bottom: 0;
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto 118px;
  gap: 22px;
  align-items: center;
  min-height: 82px;
  padding-left: 22px;
  overflow: hidden;
  background: #fff;
  border-top: 1px solid var(--mall-color-border);
  box-shadow: 0 -8px 25px rgb(37 50 73 / 6%);

  > div:first-child {
    color: var(--mall-color-muted);
    font-size: 12px;

    strong {
      color: var(--mall-color-primary);
    }

    span {
      display: block;
      margin-top: 5px;
      color: var(--mall-color-danger);
      font-size: 9px;
    }
  }

  > button {
    align-self: stretch;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    background: var(--mall-color-primary);
    border: 0;
    cursor: pointer;

    &:hover {
      background: var(--mall-color-primary-dark);
    }
  }
}

.cart-summary__amount {
  display: grid;
  grid-template-columns: auto auto;
  gap: 3px 12px;
  align-items: baseline;
  text-align: right;

  span {
    color: var(--mall-color-muted);
    font-size: 11px;
  }

  strong {
    color: #e2543f;
    font-size: 20px;
  }

  small {
    grid-column: 1 / -1;
    color: #9aa3af;
    font-size: 9px;
  }
}

.detail-empty {
  display: grid;
  justify-items: center;
  padding: 80px 20px;
  text-align: center;

  > span {
    display: grid;
    place-items: center;
    width: 62px;
    height: 62px;
    color: var(--mall-color-primary);
    font-size: 19px;
    font-weight: 800;
    background: var(--mall-color-primary-light);
    border-radius: 50%;
  }

  h3 {
    margin: 18px 0 8px;
    color: var(--mall-color-text);
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 12px;
  }

  a {
    margin-top: 20px;
    color: var(--mall-color-primary);
    font-size: 12px;
  }
}

.detail-empty--page {
  min-height: 500px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.merge-tip {
  margin: 0 0 18px;
  color: var(--mall-color-muted);
  font-size: 12px;
  line-height: 1.7;
}

.merge-select {
  width: 100%;
}

@media (max-width: 1320px) {
  .cart-items__header {
    display: none;
  }

  .cart-item {
    grid-template-columns: minmax(270px, 1fr) 90px 120px;

    > button {
      grid-column: 3;
    }
  }

  .cart-item__subtotal {
    grid-column: 2;
    grid-row: 2;
  }
}

@media (max-width: 760px) {
  .page-heading {
    align-items: flex-start;
    padding: 20px;
  }

  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-list__items {
    display: flex;
    overflow-x: auto;
  }

  .cart-list__items button {
    flex: 0 0 190px;
  }

  .detail-heading {
    align-items: flex-start;
    padding: 18px;
    flex-direction: column;
  }

  .detail-actions {
    justify-content: flex-start;
  }

  .detail-meta {
    gap: 12px;
    padding: 10px 18px;
    overflow-x: auto;
    white-space: nowrap;
  }

  .cart-item {
    grid-template-columns: 1fr auto;
    gap: 10px;
    padding: 14px;

    > button {
      grid-column: 2;
      grid-row: 3;
    }
  }

  .cart-item__product {
    grid-column: 1 / -1;
  }

  .cart-item__price {
    justify-self: start;
  }

  .cart-item__quantity {
    justify-content: flex-end;
  }

  .cart-item__subtotal {
    grid-column: 1;
    grid-row: 3;
    justify-self: start;
  }

  .cart-summary {
    grid-template-columns: 1fr 100px;
    gap: 12px;
    min-height: 96px;
    padding-left: 14px;

    > div:first-child {
      display: none;
    }

    > button {
      grid-column: 2;
      grid-row: 1;
    }
  }

  .cart-summary__amount {
    grid-column: 1;
  }
}

@media (max-width: 440px) {
  .cart-item__product {
    grid-template-columns: auto 58px minmax(0, 1fr);
    gap: 8px;
  }

  .cart-item__image {
    width: 58px;
    height: 58px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
