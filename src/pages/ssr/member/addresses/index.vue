<script setup lang="ts">
import { ElMessage, ElMessageBox, ElPagination } from 'element-plus'
import type {
  AddShippingAddressRequest,
  ShippingAddressDetail,
} from '@/api/profile/types'
import {
  addShippingAddress,
  deleteShippingAddresses,
  editShippingAddress,
  pageShippingAddresses,
  setDefaultShippingAddress,
} from '@/api/profile'
import { isApiRequestError } from '@/types/api'
import { parseApiDateTime } from '@/utils/apiDateTime'

definePageMeta({
  name: 'member-addresses',
  path: '/member/addresses',
  layout: 'member',
  requiresAuth: true,
})

useHead({ title: '收货地址 - 管管商城' })

type DefaultFilter = 'all' | 'default' | 'other'
type AddressDialogMode = 'create' | 'edit'
type AddressField =
  | 'receiverName'
  | 'phoneNumber'
  | 'countryCode'
  | 'province'
  | 'city'
  | 'district'
  | 'detailAddress'
  | 'postalCode'
  | 'label'

interface AddressForm {
  receiverName: string
  phoneNumber: string
  countryCode: string
  province: string
  city: string
  district: string
  detailAddress: string
  postalCode: string
  label: string
  isDefault: boolean
}

const addresses = ref<ShippingAddressDetail[]>([])
const total = ref(0)
const pageIndex = ref(1)
const pageSize = ref(10)
const keywordInput = ref('')
const appliedKeyword = ref('')
const defaultFilter = ref<DefaultFilter>('all')
const selectedIds = ref<number[]>([])
const isLoading = ref(true)
const loadFailed = ref(false)
const isSubmitting = ref(false)
const busyAddressId = ref<number>()
const dialogVisible = ref(false)
const dialogMode = ref<AddressDialogMode>('create')
const editingAddress = ref<ShippingAddressDetail>()

let loadSequence = 0

const form = reactive<AddressForm>({
  receiverName: '',
  phoneNumber: '',
  countryCode: 'CN',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  postalCode: '',
  label: '',
  isDefault: false,
})

const fieldErrors = reactive<Record<AddressField, string>>({
  receiverName: '',
  phoneNumber: '',
  countryCode: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  postalCode: '',
  label: '',
})

const selectedAddresses = computed(() =>
  addresses.value.filter((item) => selectedIds.value.includes(item.id)),
)

const allCurrentSelected = computed(
  () =>
    addresses.value.length > 0 &&
    addresses.value.every((item) => selectedIds.value.includes(item.id)),
)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim()
}

function unicodeLength(value: string): number {
  return Array.from(value).length
}

function containsControlCharacter(value: string): boolean {
  return /[\u0000-\u001f\u007f-\u009f]/u.test(value)
}

function clearErrors(): void {
  for (const key of Object.keys(fieldErrors) as AddressField[]) fieldErrors[key] = ''
}

function validateRequired(
  field: AddressField,
  label: string,
  value: string,
  maximumLength: number,
): string {
  const normalized = normalizeText(value)
  if (
    !normalized ||
    unicodeLength(normalized) > maximumLength ||
    containsControlCharacter(normalized)
  ) {
    fieldErrors[field] = `${label}须为 1 至 ${maximumLength} 个有效字符`
  }
  return normalized
}

function validateOptional(
  field: AddressField,
  label: string,
  value: string,
  maximumLength: number,
): string {
  const normalized = normalizeText(value)
  if (
    unicodeLength(normalized) > maximumLength ||
    containsControlCharacter(normalized)
  ) {
    fieldErrors[field] = `${label}不能超过 ${maximumLength} 个有效字符`
  }
  return normalized
}

/** 完整复现后端对地址文本、电话、国家代码与最大长度的业务校验。 */
function validateAddressForm(): boolean {
  clearErrors()

  validateRequired('receiverName', '收货人姓名', form.receiverName, 100)
  const phoneNumber = validateRequired('phoneNumber', '联系电话', form.phoneNumber, 32)
  const countryCode = normalizeText(form.countryCode)
  validateRequired('province', '省或州', form.province, 100)
  validateRequired('city', '城市', form.city, 100)
  validateOptional('district', '区县', form.district, 100)
  validateRequired('detailAddress', '详细地址', form.detailAddress, 500)
  validateOptional('postalCode', '邮政编码', form.postalCode, 20)
  validateOptional('label', '地址标签', form.label, 32)

  // 后端 char.IsDigit 按 UTF-16 char 检查；split('') 保持相同的代码单元语义。
  const phoneCharacters = phoneNumber.split('')
  const isDigit = (character: string): boolean =>
    /\p{Decimal_Number}/u.test(character)
  const digitCount = phoneCharacters.filter(isDigit).length
  const plusCount = phoneCharacters.filter((character) => character === '+').length
  const containsInvalidPhoneCharacter = phoneCharacters.some(
    (character) =>
      !isDigit(character) && !['+', '(', ')', ' ', '-'].includes(character),
  )
  if (
    phoneNumber &&
    (digitCount < 6 ||
      digitCount > 20 ||
      plusCount > 1 ||
      (plusCount === 1 && !phoneNumber.startsWith('+')) ||
      containsInvalidPhoneCharacter)
  ) {
    fieldErrors.phoneNumber = '联系电话须包含 6 至 20 位数字，可使用 +、空格、短横线和括号'
  }

  if (!/^[A-Za-z]{2}$/u.test(countryCode)) {
    fieldErrors.countryCode = '国家或地区代码须为两个英文字母'
  }

  return !Object.values(fieldErrors).some(Boolean)
}

function buildAddressRequest(): AddShippingAddressRequest {
  return {
    receiverName: normalizeText(form.receiverName),
    phoneNumber: normalizeText(form.phoneNumber),
    countryCode: normalizeText(form.countryCode).toUpperCase(),
    province: normalizeText(form.province),
    city: normalizeText(form.city),
    district: normalizeText(form.district) || null,
    detailAddress: normalizeText(form.detailAddress),
    postalCode: normalizeText(form.postalCode) || null,
    label: normalizeText(form.label) || null,
    isDefault: form.isDefault,
  }
}

function resolveDefaultFilter(): boolean | null {
  if (defaultFilter.value === 'default') return true
  if (defaultFilter.value === 'other') return false
  return null
}

function showError(error: unknown, fallback = '操作失败，请稍后重试'): void {
  if (!isApiRequestError(error) || !error.isShown) {
    ElMessage.error(error instanceof Error ? error.message : fallback)
  }
}

/** 版本冲突或地址已被并发删除后，立即丢弃本地快照并重新读取当前页。 */
async function refreshAfterConflict(error: unknown): Promise<boolean> {
  if (
    !isApiRequestError(error) ||
    ![
      'SHIPPING_ADDRESS_VERSION_CONFLICT',
      'SHIPPING_ADDRESS_NOT_FOUND',
    ].includes(error.code)
  ) {
    return false
  }

  const wasDeleted = error.code === 'SHIPPING_ADDRESS_NOT_FOUND'
  dialogVisible.value = false
  editingAddress.value = undefined
  await loadAddresses()
  if (!loadFailed.value) {
    ElMessage.info(
      wasDeleted
        ? '该地址已在其他操作中删除，现已刷新地址列表'
        : '地址已在其他操作中更新，现已载入最新内容',
    )
  }
  return true
}

async function loadAddresses(): Promise<void> {
  const sequence = ++loadSequence
  isLoading.value = true
  loadFailed.value = false
  try {
    const result = await pageShippingAddresses({
      keyword: appliedKeyword.value || null,
      isDefault: resolveDefaultFilter(),
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })
    if (sequence !== loadSequence) return

    const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize))
    if (result.pageIndex > lastPage) {
      pageIndex.value = lastPage
      await loadAddresses()
      return
    }

    addresses.value = result.items
    total.value = result.total
    pageIndex.value = result.pageIndex
    pageSize.value = result.pageSize
    selectedIds.value = []
  } catch (error) {
    if (sequence !== loadSequence) return
    addresses.value = []
    total.value = 0
    selectedIds.value = []
    loadFailed.value = true
    showError(error, '收货地址加载失败')
  } finally {
    if (sequence === loadSequence) isLoading.value = false
  }
}

function applyFilters(): void {
  const keyword = normalizeText(keywordInput.value)
  if (unicodeLength(keyword) > 100 || containsControlCharacter(keyword)) {
    ElMessage.warning('搜索词不能超过 100 个有效字符')
    return
  }
  appliedKeyword.value = keyword
  pageIndex.value = 1
  void loadAddresses()
}

function resetFilters(): void {
  keywordInput.value = ''
  appliedKeyword.value = ''
  defaultFilter.value = 'all'
  pageIndex.value = 1
  void loadAddresses()
}

function handleDefaultFilterChange(): void {
  pageIndex.value = 1
  void loadAddresses()
}

function handlePageChange(value: number): void {
  pageIndex.value = value
  void loadAddresses()
}

function resetAddressForm(): void {
  Object.assign(form, {
    receiverName: '',
    phoneNumber: '',
    countryCode: 'CN',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    postalCode: '',
    label: '',
    isDefault:
      !isLoading.value &&
      !loadFailed.value &&
      total.value === 0 &&
      !appliedKeyword.value &&
      defaultFilter.value === 'all',
  })
  clearErrors()
}

function openCreateDialog(): void {
  dialogMode.value = 'create'
  editingAddress.value = undefined
  resetAddressForm()
  dialogVisible.value = true
}

function openEditDialog(address: ShippingAddressDetail): void {
  dialogMode.value = 'edit'
  editingAddress.value = address
  Object.assign(form, {
    receiverName: address.receiverName,
    phoneNumber: address.phoneNumber,
    countryCode: address.countryCode,
    province: address.province,
    city: address.city,
    district: address.district || '',
    detailAddress: address.detailAddress,
    postalCode: address.postalCode || '',
    label: address.label || '',
    isDefault: address.isDefault,
  })
  clearErrors()
  dialogVisible.value = true
}

async function submitAddress(): Promise<void> {
  if (isSubmitting.value || !validateAddressForm()) return

  isSubmitting.value = true
  try {
    const request = buildAddressRequest()
    const result =
      dialogMode.value === 'create'
        ? await addShippingAddress(request)
        : await editShippingAddress(editingAddress.value!.id, {
            ...request,
            expectedVersion: editingAddress.value!.version,
          })

    dialogVisible.value = false
    editingAddress.value = undefined
    ElMessage.success(
      dialogMode.value === 'create' ? '收货地址新增成功' : '收货地址保存成功',
    )

    if (dialogMode.value === 'create') {
      appliedKeyword.value = ''
      keywordInput.value = ''
      defaultFilter.value = 'all'
      pageIndex.value = 1
    }
    await loadAddresses()

    // 新增或编辑结果不一定仍符合当前筛选；服务端快照已通过刷新成为唯一数据源。
    if (!addresses.value.some((item) => item.id === result.id) && total.value > 0) {
      ElMessage.info('地址已保存，但不符合当前筛选条件')
    }
  } catch (error) {
    if (await refreshAfterConflict(error)) return
    showError(error, '收货地址保存失败')
  } finally {
    isSubmitting.value = false
  }
}

function toggleSelection(addressId: number, checkedValue: boolean | string | number): void {
  const selected = new Set(selectedIds.value)
  if (Boolean(checkedValue)) selected.add(addressId)
  else selected.delete(addressId)
  selectedIds.value = Array.from(selected)
}

function toggleSelectAll(checkedValue: boolean | string | number): void {
  selectedIds.value = Boolean(checkedValue)
    ? addresses.value.map((item) => item.id)
    : []
}

async function deleteAddresses(items: ShippingAddressDetail[]): Promise<void> {
  if (!items.length || isSubmitting.value) return

  const targetText =
    items.length === 1
      ? `“${items[0]!.receiverName}”的这条地址`
      : `选中的 ${items.length} 条地址`

  try {
    await ElMessageBox.confirm(
      `确定删除${targetText}吗？删除默认地址后，系统会自动选择新的默认地址。`,
      items.length === 1 ? '确认删除地址' : '确认批量删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '暂不删除',
        type: 'warning',
      },
    )

    isSubmitting.value = true
    const result = await deleteShippingAddresses({
      items: items.map((item) => ({
        id: item.id,
        expectedVersion: item.version,
      })),
    })
    ElMessage.success(`已删除 ${result.deletedCount} 条收货地址`)

    const remainingTotal = Math.max(0, total.value - result.deletedCount)
    pageIndex.value = Math.min(
      pageIndex.value,
      Math.max(1, Math.ceil(remainingTotal / pageSize.value)),
    )
    await loadAddresses()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    if (await refreshAfterConflict(error)) return
    showError(error, '收货地址删除失败')
  } finally {
    isSubmitting.value = false
  }
}

async function setAsDefault(address: ShippingAddressDetail): Promise<void> {
  if (address.isDefault || busyAddressId.value || isSubmitting.value) return

  busyAddressId.value = address.id
  try {
    await setDefaultShippingAddress(address.id, {
      expectedVersion: address.version,
    })
    ElMessage.success('默认收货地址设置成功')
    await loadAddresses()
  } catch (error) {
    if (await refreshAfterConflict(error)) return
    showError(error, '默认地址设置失败')
  } finally {
    busyAddressId.value = undefined
  }
}

function addressText(address: ShippingAddressDetail): string {
  return [
    address.province,
    address.city,
    address.district,
    address.detailAddress,
  ]
    .filter(Boolean)
    .join(' ')
}

function formatDateTime(value: string): string {
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

onMounted(() => void loadAddresses())
</script>

<template>
  <section class="addresses-page">
    <header class="page-heading">
      <div>
        <span>SHIPPING ADDRESS</span>
        <h1>收货地址</h1>
        <p>管理订单收货信息；每位会员最多保留 50 条有效地址。</p>
      </div>
      <ElButton type="primary" :disabled="isLoading" @click="openCreateDialog">
        新增地址
      </ElButton>
    </header>

    <article class="address-panel">
      <div class="toolbar">
        <ElInput
          v-model="keywordInput"
          class="keyword-input"
          clearable
          maxlength="200"
          placeholder="搜索收货人、电话或地址"
          aria-label="搜索收货地址"
          @keyup.enter="applyFilters"
          @clear="applyFilters"
        />
        <ElSelect
          v-model="defaultFilter"
          class="default-filter"
          aria-label="默认地址筛选"
          @change="handleDefaultFilterChange"
        >
          <ElOption label="全部地址" value="all" />
          <ElOption label="仅默认地址" value="default" />
          <ElOption label="仅非默认地址" value="other" />
        </ElSelect>
        <ElButton @click="applyFilters">搜索</ElButton>
        <ElButton
          v-if="appliedKeyword || defaultFilter !== 'all'"
          text
          @click="resetFilters"
        >
          清除筛选
        </ElButton>
      </div>

      <div v-if="!isLoading && addresses.length" class="batch-bar">
        <ElCheckbox
          :model-value="allCurrentSelected"
          @change="toggleSelectAll"
        >
          选择本页
        </ElCheckbox>
        <span>共 {{ total }} 条，已选 {{ selectedAddresses.length }} 条</span>
        <ElButton
          v-if="selectedAddresses.length"
          type="danger"
          plain
          size="small"
          :loading="isSubmitting"
          @click="deleteAddresses(selectedAddresses)"
        >
          批量删除
        </ElButton>
      </div>

      <div v-if="isLoading" class="address-loading">
        <ElSkeleton :rows="8" animated />
      </div>

      <div v-else-if="loadFailed" class="empty-state">
        <span aria-hidden="true">!</span>
        <h2>地址列表加载失败</h2>
        <p>请检查网络或登录状态后重试。</p>
        <ElButton type="primary" @click="loadAddresses">重新加载</ElButton>
      </div>

      <div v-else-if="addresses.length" class="address-list">
        <article
          v-for="address in addresses"
          :key="address.id"
          class="address-card"
          :class="{ 'address-card--default': address.isDefault }"
        >
          <div class="address-card__select">
            <ElCheckbox
              :model-value="selectedIds.includes(address.id)"
              :aria-label="`选择 ${address.receiverName} 的地址`"
              @change="toggleSelection(address.id, $event)"
            />
          </div>

          <div class="address-card__content">
            <header>
              <div>
                <strong>{{ address.receiverName }}</strong>
                <span>{{ address.phoneNumber }}</span>
              </div>
              <div class="address-badges">
                <i v-if="address.isDefault">默认</i>
                <i v-if="address.label" class="address-badges__label">{{ address.label }}</i>
              </div>
            </header>

            <p>{{ addressText(address) }}</p>
            <small>
              {{ address.countryCode }}
              <template v-if="address.postalCode"> · 邮编 {{ address.postalCode }}</template>
              · 更新于 {{ formatDateTime(address.updatedAt) }}
              · v{{ address.version }}
            </small>
          </div>

          <footer class="address-card__actions">
            <button
              v-if="!address.isDefault"
              type="button"
              :disabled="busyAddressId === address.id"
              @click="setAsDefault(address)"
            >
              {{ busyAddressId === address.id ? '设置中…' : '设为默认' }}
            </button>
            <button type="button" @click="openEditDialog(address)">编辑</button>
            <button
              type="button"
              class="danger"
              :disabled="isSubmitting"
              @click="deleteAddresses([address])"
            >
              删除
            </button>
          </footer>
        </article>
      </div>

      <div v-else class="empty-state">
        <span aria-hidden="true">址</span>
        <template v-if="appliedKeyword || defaultFilter !== 'all'">
          <h2>没有匹配的收货地址</h2>
          <p>换一个关键词或清除筛选条件后再试。</p>
          <ElButton @click="resetFilters">清除筛选</ElButton>
        </template>
        <template v-else>
          <h2>还没有收货地址</h2>
          <p>新增第一条地址后，系统会自动将它设为默认地址。</p>
          <ElButton type="primary" @click="openCreateDialog">新增地址</ElButton>
        </template>
      </div>

      <footer v-if="total > pageSize" class="pagination">
        <ElPagination
          background
          layout="prev, pager, next"
          :current-page="pageIndex"
          :page-size="pageSize"
          :page-count="pageCount"
          @current-change="handlePageChange"
        />
      </footer>
    </article>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增收货地址' : '编辑收货地址'"
      width="min(680px, calc(100% - 24px))"
      destroy-on-close
      :close-on-click-modal="!isSubmitting"
    >
      <ElForm class="address-form" label-position="top" @submit.prevent="submitAddress">
        <div class="form-row">
          <ElFormItem label="收货人姓名" required :error="fieldErrors.receiverName">
            <ElInput
              v-model="form.receiverName"
              maxlength="200"
              autocomplete="name"
              placeholder="请输入收货人姓名"
              @input="fieldErrors.receiverName = ''"
            />
          </ElFormItem>
          <ElFormItem label="联系电话" required :error="fieldErrors.phoneNumber">
            <ElInput
              v-model="form.phoneNumber"
              maxlength="64"
              autocomplete="tel"
              placeholder="支持手机号或包含区号的电话号码"
              @input="fieldErrors.phoneNumber = ''"
            />
          </ElFormItem>
        </div>

        <div class="region-row">
          <ElFormItem label="国家/地区代码" required :error="fieldErrors.countryCode">
            <ElInput
              v-model="form.countryCode"
              maxlength="2"
              placeholder="CN"
              @input="fieldErrors.countryCode = ''"
            />
          </ElFormItem>
          <ElFormItem label="省 / 州" required :error="fieldErrors.province">
            <ElInput
              v-model="form.province"
              maxlength="200"
              placeholder="例如：广东省"
              @input="fieldErrors.province = ''"
            />
          </ElFormItem>
          <ElFormItem label="城市" required :error="fieldErrors.city">
            <ElInput
              v-model="form.city"
              maxlength="200"
              placeholder="例如：深圳市"
              @input="fieldErrors.city = ''"
            />
          </ElFormItem>
          <ElFormItem label="区县" :error="fieldErrors.district">
            <ElInput
              v-model="form.district"
              maxlength="200"
              placeholder="例如：南山区"
              @input="fieldErrors.district = ''"
            />
          </ElFormItem>
        </div>

        <ElFormItem label="详细地址" required :error="fieldErrors.detailAddress">
          <ElInput
            v-model="form.detailAddress"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="街道、门牌号、楼栋及房间号"
            @input="fieldErrors.detailAddress = ''"
          />
        </ElFormItem>

        <div class="form-row form-row--three">
          <ElFormItem label="邮政编码" :error="fieldErrors.postalCode">
            <ElInput
              v-model="form.postalCode"
              maxlength="40"
              autocomplete="postal-code"
              placeholder="可选"
              @input="fieldErrors.postalCode = ''"
            />
          </ElFormItem>
          <ElFormItem label="地址标签" :error="fieldErrors.label">
            <ElInput
              v-model="form.label"
              maxlength="64"
              placeholder="例如：家、公司"
              @input="fieldErrors.label = ''"
            />
          </ElFormItem>
          <ElFormItem label="默认地址">
            <div class="default-setting">
              <ElSwitch
                v-model="form.isDefault"
                :disabled="dialogMode === 'edit' && editingAddress?.isDefault"
              />
              <small v-if="dialogMode === 'edit' && editingAddress?.isDefault">
                当前默认地址不能直接取消
              </small>
              <small v-else>订单确认时优先使用</small>
            </div>
          </ElFormItem>
        </div>
      </ElForm>

      <template #footer>
        <ElButton :disabled="isSubmitting" @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="isSubmitting" @click="submitAddress">
          {{ dialogMode === 'create' ? '新增地址' : '保存地址' }}
        </ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style lang="scss" scoped>
.addresses-page {
  display: grid;
  gap: 16px;
}

.page-heading,
.address-panel {
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);
}

.page-heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  min-height: 116px;
  padding: 24px 28px;
  background: linear-gradient(110deg, #fff, #f5f9ff);

  > div > span {
    color: var(--mall-color-primary);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
  }

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
}

.address-panel {
  min-height: 500px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 17px 20px;
  background: #fbfcfe;
  border-bottom: 1px solid var(--mall-color-border);
}

.keyword-input {
  width: min(360px, 100%);
}

.default-filter {
  width: 150px;
}

.batch-bar {
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 48px;
  padding: 8px 20px;
  color: var(--mall-color-muted);
  font-size: 11px;
  background: #f7faff;
  border-bottom: 1px solid #e8eef7;

  button {
    margin-left: auto;
  }
}

.address-loading {
  padding: 34px;
}

.address-list {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
}

.address-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: 18px;
  border: 1px solid var(--mall-color-border);
  border-radius: 9px;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: #bfd3ef;
    box-shadow: 0 8px 20px rgb(42 68 104 / 7%);
  }
}

.address-card--default {
  background: linear-gradient(110deg, #fff, #f7fbff);
  border-color: #b8d3f8;
}

.address-card__select {
  padding-top: 2px;
}

.address-card__content {
  min-width: 0;

  header {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  header > div:first-child {
    display: flex;
    gap: 13px;
    align-items: baseline;
    min-width: 0;
  }

  strong {
    color: var(--mall-color-text);
    font-size: 15px;
  }

  header span {
    color: #4c5c72;
    font-size: 12px;
  }

  p {
    margin: 11px 0 8px;
    color: var(--mall-color-text);
    font-size: 13px;
    line-height: 1.7;
  }

  > small {
    color: var(--mall-color-muted);
    font-size: 10px;
  }
}

.address-badges {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;

  i {
    padding: 3px 7px;
    color: var(--mall-color-primary);
    font-size: 9px;
    font-style: normal;
    background: var(--mall-color-primary-light);
    border-radius: 3px;
  }

  .address-badges__label {
    color: #64748b;
    background: #f0f3f7;
  }
}

.address-card__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 1px;

  button {
    padding: 5px 2px;
    color: var(--mall-color-primary);
    font-size: 11px;
    background: none;
    border: 0;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.55;
    }
  }

  .danger {
    color: var(--mall-color-danger);
  }
}

.empty-state {
  display: grid;
  justify-items: center;
  min-height: 410px;
  padding: 64px 24px;
  text-align: center;

  > span {
    display: grid;
    place-items: center;
    width: 62px;
    height: 62px;
    color: var(--mall-color-primary);
    font-size: 20px;
    font-weight: 800;
    background: var(--mall-color-primary-light);
    border-radius: 50%;
  }

  h2 {
    margin: 18px 0 8px;
    color: var(--mall-color-text);
    font-size: 19px;
  }

  p {
    margin: 0 0 22px;
    color: var(--mall-color-muted);
    font-size: 12px;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 8px 20px 22px;
}

.address-form {
  display: grid;
  gap: 2px;
}

.form-row,
.region-row {
  display: grid;
  gap: 14px;
}

.form-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.region-row {
  grid-template-columns: 0.65fr repeat(3, minmax(0, 1fr));
}

.form-row--three {
  grid-template-columns: 1fr 1fr 1.1fr;
}

.default-setting {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  min-height: 32px;

  small {
    color: var(--mall-color-muted);
    font-size: 10px;
    line-height: 1.45;
  }
}

@media (max-width: 760px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .keyword-input {
    flex: 1 1 100%;
    width: 100%;
  }

  .address-card {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .address-card__actions {
    grid-column: 2;
    justify-content: flex-end;
    padding-top: 2px;
  }

  .region-row {
    grid-template-columns: 0.65fr 1.35fr;
  }

  .form-row--three {
    grid-template-columns: 1fr 1fr;

    > :last-child {
      grid-column: 1 / -1;
    }
  }
}

@media (max-width: 560px) {
  .page-heading {
    align-items: flex-start;
    min-height: auto;
    padding: 20px;

    p {
      max-width: 215px;
    }
  }

  .toolbar {
    padding: 13px;
  }

  .default-filter {
    flex: 1 1 140px;
  }

  .batch-bar {
    flex-wrap: wrap;
    padding: 9px 13px;

    button {
      margin-left: 0;
    }
  }

  .address-list {
    gap: 10px;
    padding: 12px;
  }

  .address-card {
    gap: 10px;
    padding: 14px 12px;
  }

  .address-card__content header {
    align-items: flex-start;
    flex-direction: column;
  }

  .address-card__content header > div:first-child {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .address-card__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .form-row,
  .region-row,
  .form-row--three {
    grid-template-columns: 1fr;

    > :last-child {
      grid-column: auto;
    }
  }

  .empty-state {
    min-height: 360px;
    padding: 48px 18px;
  }
}
</style>
