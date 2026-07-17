<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import type {
  FavoriteItem,
  FavoriteListDetail,
  FavoriteListSummary,
} from '@/api/cart/types'
import {
  archiveFavoriteList,
  createFavoriteList,
  deleteFavoriteItem,
  getFavoriteList,
  listFavoriteLists,
  mergeFavoriteLists,
  updateFavoriteList,
} from '@/api/cart'
import { isApiRequestError } from '@/types/api'

/** 收藏夹属于受保护会员页面，数据访问始终携带当前会员 Bearer Token。 */
definePageMeta({
  name: 'member-favorites',
  path: '/member/favorites',
  layout: 'member',
  requiresAuth: true,
})

useHead({ title: '我的收藏 - 管管商城' })

/** 创建与编辑收藏夹弹窗共用的本地表单结构。 */
interface CollectionForm {
  name: string
  description: string
  isDefault: boolean
  sortOrder: number
}

/** 收藏夹摘要、当前详情与页面交互状态。 */
const lists = ref<FavoriteListSummary[]>([])
const selectedId = ref<number>()
const detail = ref<FavoriteListDetail>()
const isListLoading = ref(true)
const isDetailLoading = ref(false)
const isSubmitting = ref(false)
const busyProductId = ref<number>()
const collectionDialogVisible = ref(false)
const collectionDialogMode = ref<'create' | 'edit'>('create')
const mergeDialogVisible = ref(false)
const mergeTargetId = ref<number>()

/** 递增序号用于丢弃快速切换收藏夹时较晚返回的旧详情响应。 */
let detailLoadSequence = 0

/** 弹窗表单与接口详情隔离，取消编辑不会修改页面快照。 */
const collectionForm = reactive<CollectionForm>({
  name: '',
  description: '',
  isDefault: false,
  sortOrder: 0,
})

/** 合并目标列表排除当前收藏夹。 */
const mergeTargets = computed(() =>
  lists.value.filter((item) => item.id !== selectedId.value),
)

/** 请求层已经展示的错误不再由页面重复弹出。 */
function showError(error: unknown): void {
  if (!isApiRequestError(error) || !error.isShown) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败，请稍后重试')
  }
}

/** 加载指定收藏夹详情，并忽略用户快速切换产生的过期响应。 */
async function loadDetail(favoriteListId: number): Promise<void> {
  const requestSequence = ++detailLoadSequence
  selectedId.value = favoriteListId
  isDetailLoading.value = true
  try {
    const result = await getFavoriteList(favoriteListId)
    if (requestSequence !== detailLoadSequence) return
    detail.value = result
  } catch (error) {
    if (requestSequence !== detailLoadSequence) return
    detail.value = undefined
    showError(error)
  } finally {
    if (requestSequence === detailLoadSequence) isDetailLoading.value = false
  }
}

/** 刷新收藏夹摘要，并尽量保持用户当前选中的分类。 */
async function loadLists(preferredId?: number): Promise<void> {
  isListLoading.value = true
  try {
    lists.value = await listFavoriteLists()
    const targetId =
      lists.value.find((item) => item.id === preferredId)?.id ??
      lists.value.find((item) => item.id === selectedId.value)?.id ??
      lists.value[0]?.id

    if (targetId) await loadDetail(targetId)
    else {
      detailLoadSequence += 1
      selectedId.value = undefined
      detail.value = undefined
      isDetailLoading.value = false
    }
  } catch (error) {
    lists.value = []
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
    isDefault: lists.value.length === 0,
    sortOrder: lists.value.length * 10,
  })
  collectionDialogVisible.value = true
}

/** 将当前收藏夹快照复制到编辑表单。 */
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

/** 创建或按乐观并发版本更新收藏夹。 */
async function submitCollection(): Promise<void> {
  const name = collectionForm.name.normalize('NFKC').trim()
  const description = collectionForm.description.normalize('NFKC').trim()
  if (!name) {
    ElMessage.warning('请输入收藏夹名称')
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
        ? await createFavoriteList(request)
        : await updateFavoriteList(detail.value!.id, {
            ...request,
            expectedVersion: detail.value!.version,
          })
    collectionDialogVisible.value = false
    ElMessage.success(collectionDialogMode.value === 'create' ? '收藏夹创建成功' : '收藏夹更新成功')
    await loadLists(result.id)
  } catch (error) {
    showError(error)
    if (isApiRequestError(error) && error.code === 'FAVORITE_VERSION_CONFLICT') {
      await loadLists(selectedId.value)
    }
  } finally {
    isSubmitting.value = false
  }
}

/** 二次确认后归档当前收藏夹，并处理并发版本冲突。 */
async function handleArchive(): Promise<void> {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `归档“${detail.value.name}”后将不再出现在收藏夹列表中，此操作目前不能恢复。`,
      '确认归档收藏夹',
      {
        confirmButtonText: '确认归档',
        cancelButtonText: '暂不归档',
        type: 'warning',
      },
    )
    await archiveFavoriteList(detail.value.id, detail.value.version)
    ElMessage.success('收藏夹已归档')
    selectedId.value = undefined
    await loadLists()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showError(error)
    if (isApiRequestError(error) && error.code === 'FAVORITE_VERSION_CONFLICT') {
      await loadLists(selectedId.value)
    }
  }
}

/** 为合并弹窗预选第一个可用目标。 */
function openMergeDialog(): void {
  if (!detail.value || !mergeTargets.value.length) return
  mergeTargetId.value = mergeTargets.value[0]?.id
  mergeDialogVisible.value = true
}

/** 将当前收藏夹合并到用户选择的目标分类。 */
async function submitMerge(): Promise<void> {
  if (!detail.value || !mergeTargetId.value) return
  isSubmitting.value = true
  try {
    const sourceName = detail.value.name
    const target = await mergeFavoriteLists(detail.value.id, mergeTargetId.value)
    mergeDialogVisible.value = false
    ElMessage.success(`“${sourceName}”已合并到“${target.name}”`)
    await loadLists(target.id)
  } catch (error) {
    showError(error)
  } finally {
    isSubmitting.value = false
  }
}

/** 二次确认后从当前收藏夹移除商品。 */
async function handleDeleteItem(item: FavoriteItem): Promise<void> {
  if (!detail.value || busyProductId.value) return
  try {
    await ElMessageBox.confirm(
      `确定取消收藏“${item.productName}”吗？`,
      '取消收藏',
      {
        confirmButtonText: '取消收藏',
        cancelButtonText: '保留',
      },
    )
    busyProductId.value = item.productId
    await deleteFavoriteItem(detail.value.id, item.productId)
    ElMessage.success('已取消收藏')
    await loadLists(detail.value.id)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showError(error)
  } finally {
    busyProductId.value = undefined
  }
}

/** 页面首次挂载后读取会员收藏夹；错误由统一提示逻辑处理。 */
onMounted(() => void loadLists())
</script>

<template>
  <section class="favorites-page">
    <header class="page-heading">
      <div>
        <span>FAVORITES</span>
        <h1>我的收藏</h1>
        <p>按收藏夹整理关注商品，商品状态以当前商城数据为准</p>
      </div>
      <ElButton type="primary" @click="openCreateDialog">新建收藏夹</ElButton>
    </header>

    <div class="collection-layout">
      <aside class="collection-list" aria-label="收藏夹列表">
        <header>
          <strong>收藏夹</strong>
          <span>{{ lists.length }}/50</span>
        </header>

        <div v-if="isListLoading" class="collection-list__loading">
          <ElSkeleton :rows="4" animated />
        </div>

        <div v-else-if="lists.length" class="collection-list__items">
          <button
            v-for="item in lists"
            :key="item.id"
            type="button"
            :class="{ active: selectedId === item.id }"
            @click="loadDetail(item.id)"
          >
            <span class="collection-list__icon" aria-hidden="true">藏</span>
            <span class="collection-list__name">
              <strong>{{ item.name }}</strong>
              <small>{{ item.itemCount }} 件商品</small>
            </span>
            <i v-if="item.isDefault">默认</i>
          </button>
        </div>

        <button v-else class="collection-list__empty" type="button" @click="openCreateDialog">
          <span>＋</span>
          创建第一个收藏夹
        </button>
      </aside>

      <article class="collection-detail">
        <div v-if="isDetailLoading" class="detail-loading">
          <ElSkeleton :rows="7" animated />
        </div>

        <template v-else-if="detail">
          <header class="detail-heading">
            <div>
              <div class="detail-heading__title">
                <h2>{{ detail.name }}</h2>
                <span v-if="detail.isDefault">默认收藏夹</span>
              </div>
              <p>{{ detail.description || '暂未填写收藏夹说明' }}</p>
            </div>
            <div class="detail-actions">
              <ElButton @click="openEditDialog">编辑</ElButton>
              <ElButton :disabled="!mergeTargets.length" @click="openMergeDialog">合并</ElButton>
              <ElButton type="danger" plain @click="handleArchive">归档</ElButton>
            </div>
          </header>

          <div class="detail-meta">
            <span>共 <strong>{{ detail.items.length }}</strong> 件商品</span>
            <span>版本 {{ detail.version }}</span>
            <span>更新于 {{ new Date(detail.updatedAt).toLocaleString('zh-CN') }}</span>
          </div>

          <div v-if="detail.items.length" class="favorite-grid">
            <article
              v-for="item in detail.items"
              :key="item.id"
              v-memo="[item.version, busyProductId === item.productId]"
              class="favorite-card"
            >
              <div class="favorite-card__image">
                <img
                  v-if="item.mainImage"
                  :src="item.mainImage"
                  :alt="item.productName"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else aria-hidden="true">GG</span>
                <i :class="{ unavailable: !item.isAvailable }">
                  {{ item.isAvailable ? '可售' : '已失效' }}
                </i>
              </div>
              <div class="favorite-card__body">
                <h3>{{ item.productName }}</h3>
                <p>商品编号：{{ item.productId }}</p>
                <small>收藏于 {{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}</small>
              </div>
              <button
                class="favorite-card__remove"
                type="button"
                :disabled="busyProductId === item.productId"
                @click="handleDeleteItem(item)"
              >
                {{ busyProductId === item.productId ? '处理中…' : '取消收藏' }}
              </button>
            </article>
          </div>

          <div v-else class="detail-empty">
            <span aria-hidden="true">藏</span>
            <h3>这个收藏夹还是空的</h3>
            <p>在商品页面选择此收藏夹后，商品会出现在这里。</p>
            <NuxtLink to="/">去商城看看</NuxtLink>
          </div>
        </template>

        <div v-else class="detail-empty detail-empty--page">
          <span aria-hidden="true">＋</span>
          <h3>还没有收藏夹</h3>
          <p>创建收藏夹后即可分类保存感兴趣的商品。</p>
          <ElButton type="primary" @click="openCreateDialog">创建收藏夹</ElButton>
        </div>
      </article>
    </div>

    <ElDialog
      v-model="collectionDialogVisible"
      :title="collectionDialogMode === 'create' ? '新建收藏夹' : '编辑收藏夹'"
      width="min(480px, calc(100% - 28px))"
    >
      <ElForm label-position="top" @submit.prevent="submitCollection">
        <ElFormItem label="收藏夹名称" required>
          <ElInput v-model="collectionForm.name" maxlength="64" show-word-limit placeholder="例如：常用芯片" />
        </ElFormItem>
        <ElFormItem label="收藏夹说明">
          <ElInput
            v-model="collectionForm.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="可选，说明这个收藏夹的用途"
          />
        </ElFormItem>
        <div class="form-row">
          <ElFormItem label="显示顺序">
            <ElInputNumber v-model="collectionForm.sortOrder" :min="0" :max="9999" />
          </ElFormItem>
          <ElFormItem label="默认收藏夹">
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
      title="合并收藏夹"
      width="min(440px, calc(100% - 28px))"
    >
      <p class="merge-tip">合并后，当前收藏夹会归入目标收藏夹；重复商品将自动去重，此操作不可撤销。</p>
      <ElSelect v-model="mergeTargetId" class="merge-select" placeholder="选择目标收藏夹">
        <ElOption
          v-for="item in mergeTargets"
          :key="item.id"
          :label="`${item.name}（${item.itemCount} 件）`"
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
.favorites-page {
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

.collection-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.collection-list,
.collection-detail {
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);
}

.collection-list {
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

.collection-list__loading {
  padding: 18px;
}

.collection-list__items {
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

.collection-list__icon {
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

.collection-list__name {
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

.collection-list__empty {
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
    font-size: 25px;
    color: var(--mall-color-primary);
  }
}

.collection-detail {
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

.favorite-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 20px;
}

.favorite-card {
  position: relative;
  content-visibility: auto;
  contain-intrinsic-size: auto 280px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--mall-color-border);
  border-radius: 8px;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    border-color: #b9d2f4;
    box-shadow: 0 12px 25px rgb(37 50 73 / 10%);
    transform: translateY(-2px);
  }
}

.favorite-card__image {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1.4;
  overflow: hidden;
  color: #7d91ac;
  font-size: 20px;
  font-weight: 900;
  background: #f5f7fa;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    mix-blend-mode: multiply;
  }

  i {
    position: absolute;
    top: 9px;
    right: 9px;
    padding: 3px 7px;
    color: #24734f;
    font-size: 9px;
    font-style: normal;
    background: #e7f8ef;
    border-radius: 999px;

    &.unavailable {
      color: #8c5a61;
      background: #fff0f1;
    }
  }
}

.favorite-card__body {
  padding: 13px 13px 10px;

  h3 {
    min-height: 36px;
    margin: 0 0 8px;
    overflow: hidden;
    color: var(--mall-color-text);
    font-size: 13px;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  p,
  small {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 9px;
  }

  small {
    display: block;
    margin-top: 5px;
  }
}

.favorite-card__remove {
  width: calc(100% - 24px);
  height: 32px;
  margin: 0 12px 12px;
  color: var(--mall-color-primary);
  font-size: 11px;
  background: #fff;
  border: 1px solid #b9d2f4;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    color: #fff;
    background: var(--mall-color-primary);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.6;
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

@media (max-width: 1400px) {
  .favorite-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .favorite-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .page-heading {
    align-items: flex-start;
    padding: 20px;
  }

  .collection-layout {
    grid-template-columns: 1fr;
  }

  .collection-list__items {
    display: flex;
    overflow-x: auto;
  }

  .collection-list__items button {
    flex: 0 0 180px;
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

  .favorite-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 12px;
  }
}

@media (max-width: 440px) {
  .favorite-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
