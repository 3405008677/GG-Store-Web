<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { UserGender, UserProfileDetail } from '@/api/profile/types'
import { editUserProfile, getUserProfile } from '@/api/profile'
import { useStores } from '@/stores'
import { isApiRequestError } from '@/types/api'
import { parseApiDateTime } from '@/utils/apiDateTime'

definePageMeta({
  name: 'member-profile',
  path: '/member/profile',
  layout: 'member',
  requiresAuth: true,
})

useHead({ title: '个人资料 - 管管商城' })

interface ProfileForm {
  displayName: string
  avatarUrl: string
  gender: UserGender
  birthday: string
  bio: string
}

type ProfileField = keyof ProfileForm

const genderOptions: ReadonlyArray<{ label: string; value: UserGender }> = [
  { label: '未设置', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
  { label: '其他', value: 3 },
]

const { userStore } = useStores()
const profile = ref<UserProfileDetail>()
const isLoading = ref(true)
const isSaving = ref(false)
const loadFailed = ref(false)
const avatarLoadFailed = ref(false)
const today = new Date().toISOString().slice(0, 10)
const earliestBirthday = new Date(1900, 0, 1)
const endOfToday = new Date()
endOfToday.setHours(23, 59, 59, 999)

const form = reactive<ProfileForm>({
  displayName: '',
  avatarUrl: '',
  gender: 0,
  birthday: '',
  bio: '',
})

const fieldErrors = reactive<Record<ProfileField, string>>({
  displayName: '',
  avatarUrl: '',
  gender: '',
  birthday: '',
  bio: '',
})

let loadSequence = 0

/** 只在地址本身符合后端协议且图片未加载失败时展示远端头像。 */
const avatarPreview = computed(() => {
  const value = form.avatarUrl.trim()
  if (!value || avatarLoadFailed.value) return ''
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    return new URL(value).protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
})

const avatarFallback = computed(() =>
  (form.displayName || profile.value?.username || 'GG').trim().slice(0, 1).toUpperCase(),
)

/** 精确比较当前表单与最后一次服务端快照，避免无变化重复更新版本。 */
const hasChanges = computed(() => {
  const current = profile.value
  if (!current) return false
  return (
    form.displayName !== current.displayName ||
    form.avatarUrl !== (current.avatarUrl || '') ||
    form.gender !== current.gender ||
    form.birthday !== (current.birthday || '') ||
    form.bio !== (current.bio || '')
  )
})

watch(
  () => form.avatarUrl,
  () => {
    avatarLoadFailed.value = false
    fieldErrors.avatarUrl = ''
  },
)

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim()
}

function unicodeLength(value: string): number {
  return Array.from(value).length
}

function containsControlCharacter(value: string): boolean {
  return /[\u0000-\u001f\u007f-\u009f]/u.test(value)
}

function isSafeAvatarUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function clearErrors(): void {
  for (const key of Object.keys(fieldErrors) as ProfileField[]) fieldErrors[key] = ''
}

/** 日期选择器与后端约束保持一致，避免用户选中无效生日后才收到错误。 */
function isBirthdayDisabled(date: Date): boolean {
  return date < earliestBirthday || date > endOfToday
}

/** 在提交前复现后端的 NFKC、Unicode 长度、日期和安全 URL 约束。 */
function validateForm(): boolean {
  clearErrors()

  const displayName = normalizeText(form.displayName)
  const avatarUrl = normalizeText(form.avatarUrl)
  const bio = normalizeText(form.bio)

  if (!displayName || unicodeLength(displayName) > 100 || containsControlCharacter(displayName)) {
    fieldErrors.displayName = '显示名称须为 1 至 100 个有效字符'
  }

  if (avatarUrl) {
    if (unicodeLength(avatarUrl) > 1000 || containsControlCharacter(avatarUrl)) {
      fieldErrors.avatarUrl = '头像地址不能超过 1000 个有效字符'
    } else if (!isSafeAvatarUrl(avatarUrl)) {
      fieldErrors.avatarUrl = '仅支持 HTTPS 地址或以 / 开头的站内路径'
    }
  }

  if (![0, 1, 2, 3].includes(form.gender)) {
    fieldErrors.gender = '请选择有效的性别选项'
  }

  if (form.birthday && (form.birthday < '1900-01-01' || form.birthday > today)) {
    fieldErrors.birthday = `生日须在 1900-01-01 至 ${today} 之间`
  }

  if (unicodeLength(bio) > 500 || containsControlCharacter(bio)) {
    fieldErrors.bio = '个人简介不能超过 500 个有效字符'
  }

  return !Object.values(fieldErrors).some(Boolean)
}

function applyProfile(value: UserProfileDetail): void {
  profile.value = value
  Object.assign(form, {
    displayName: value.displayName,
    avatarUrl: value.avatarUrl || '',
    gender: value.gender,
    birthday: value.birthday || '',
    bio: value.bio || '',
  })
  avatarLoadFailed.value = false
  clearErrors()
}

function showError(error: unknown, fallback = '操作失败，请稍后重试'): void {
  if (!isApiRequestError(error) || !error.isShown) {
    ElMessage.error(error instanceof Error ? error.message : fallback)
  }
}

async function loadProfile(): Promise<void> {
  const sequence = ++loadSequence
  isLoading.value = true
  loadFailed.value = false
  try {
    const result = await getUserProfile()
    if (sequence !== loadSequence) return
    applyProfile(result)
  } catch (error) {
    if (sequence !== loadSequence) return
    profile.value = undefined
    loadFailed.value = true
    showError(error, '个人资料加载失败')
  } finally {
    if (sequence === loadSequence) isLoading.value = false
  }
}

async function saveProfile(): Promise<void> {
  if (!profile.value || isSaving.value || !validateForm()) return

  isSaving.value = true
  try {
    const result = await editUserProfile({
      displayName: normalizeText(form.displayName),
      avatarUrl: normalizeText(form.avatarUrl) || null,
      gender: form.gender,
      birthday: form.birthday || null,
      bio: normalizeText(form.bio) || null,
      expectedVersion: profile.value.version,
    })
    applyProfile(result)
    if (userStore.userInfo) userStore.userInfo.displayName = result.displayName
    ElMessage.success('个人资料保存成功')
  } catch (error) {
    if (isApiRequestError(error) && error.code === 'PROFILE_VERSION_CONFLICT') {
      await loadProfile()
      if (!loadFailed.value) {
        ElMessage.info('资料已在其他操作中更新，现已载入最新内容')
      }
      return
    }
    showError(error, '个人资料保存失败')
  } finally {
    isSaving.value = false
  }
}

function resetForm(): void {
  if (profile.value) applyProfile(profile.value)
}

function formatDateTime(value: string): string {
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(() => void loadProfile())
</script>

<template>
  <section class="profile-page">
    <header class="page-heading">
      <div>
        <span>MEMBER PROFILE</span>
        <h1>个人资料</h1>
        <p>维护你的公开展示信息，登录账号与绑定联系方式不会在这里修改。</p>
      </div>
      <ElButton :loading="isLoading" :disabled="isSaving" @click="loadProfile">
        刷新资料
      </ElButton>
    </header>

    <div v-if="isLoading" class="profile-loading">
      <ElSkeleton :rows="8" animated />
    </div>

    <div v-else-if="loadFailed" class="load-state">
      <span aria-hidden="true">!</span>
      <h2>暂时无法读取个人资料</h2>
      <p>请检查网络或登录状态后重试。</p>
      <ElButton type="primary" @click="loadProfile">重新加载</ElButton>
    </div>

    <div v-else-if="profile" class="profile-grid">
      <aside class="identity-card">
        <div class="avatar">
          <img
            v-if="avatarPreview"
            :src="avatarPreview"
            alt="会员头像预览"
            @error="avatarLoadFailed = true"
          />
          <span v-else>{{ avatarFallback }}</span>
        </div>
        <h2>{{ form.displayName || profile.username }}</h2>
        <p>@{{ profile.username }}</p>

        <dl>
          <div>
            <dt>电子邮箱</dt>
            <dd>{{ profile.email || '未绑定' }}</dd>
          </div>
          <div>
            <dt>手机号码</dt>
            <dd>{{ profile.phoneNumber || '未绑定' }}</dd>
          </div>
          <div>
            <dt>资料版本</dt>
            <dd>v{{ profile.version }}</dd>
          </div>
          <div>
            <dt>最近更新</dt>
            <dd>{{ formatDateTime(profile.updatedAt) }}</dd>
          </div>
        </dl>

        <p class="identity-card__tip">邮箱和账号手机号属于登录凭据，需通过独立安全流程修改。</p>
      </aside>

      <article class="profile-form-card">
        <div class="section-heading">
          <div>
            <span>PROFILE DETAILS</span>
            <h2>编辑展示资料</h2>
          </div>
          <small>带 * 的字段为必填项</small>
        </div>

        <form class="profile-form" novalidate @submit.prevent="saveProfile">
          <div class="form-field">
            <label for="profile-display-name">显示名称 *</label>
            <ElInput
              id="profile-display-name"
              v-model="form.displayName"
              maxlength="200"
              autocomplete="name"
              placeholder="用于商城内展示"
              @input="fieldErrors.displayName = ''"
            />
            <small v-if="fieldErrors.displayName" class="field-error">{{ fieldErrors.displayName }}</small>
            <small v-else>规范化后最多 100 个 Unicode 字符</small>
          </div>

          <div class="form-field">
            <label for="profile-avatar-url">头像地址</label>
            <ElInput
              id="profile-avatar-url"
              v-model="form.avatarUrl"
              clearable
              placeholder="https://... 或 /images/avatar.png"
            />
            <small v-if="fieldErrors.avatarUrl" class="field-error">{{ fieldErrors.avatarUrl }}</small>
            <small v-else>只接受 HTTPS 绝对地址或站内路径</small>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="profile-gender">性别</label>
              <ElSelect
                id="profile-gender"
                v-model="form.gender"
                class="full-width"
                @change="fieldErrors.gender = ''"
              >
                <ElOption
                  v-for="item in genderOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
              <small v-if="fieldErrors.gender" class="field-error">{{ fieldErrors.gender }}</small>
            </div>

            <div class="form-field">
              <label for="profile-birthday">生日</label>
              <ElDatePicker
                id="profile-birthday"
                v-model="form.birthday"
                class="full-width"
                type="date"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
                placeholder="选择生日"
                clearable
                :disabled-date="isBirthdayDisabled"
                @change="fieldErrors.birthday = ''"
              />
              <small v-if="fieldErrors.birthday" class="field-error">{{ fieldErrors.birthday }}</small>
            </div>
          </div>

          <div class="form-field">
            <label for="profile-bio">个人简介</label>
            <ElInput
              id="profile-bio"
              v-model="form.bio"
              type="textarea"
              :rows="6"
              maxlength="1000"
              show-word-limit
              placeholder="简单介绍一下自己"
              @input="fieldErrors.bio = ''"
            />
            <small v-if="fieldErrors.bio" class="field-error">{{ fieldErrors.bio }}</small>
            <small v-else>规范化后最多 500 个 Unicode 字符</small>
          </div>

          <footer class="form-actions">
            <ElButton :disabled="!hasChanges || isSaving" @click="resetForm">撤销修改</ElButton>
            <ElButton
              native-type="submit"
              type="primary"
              :loading="isSaving"
              :disabled="!hasChanges"
            >
              保存资料
            </ElButton>
          </footer>
        </form>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.profile-page {
  display: grid;
  gap: 16px;
}

.page-heading,
.profile-loading,
.load-state,
.identity-card,
.profile-form-card {
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
  background: linear-gradient(110deg, #fff, var(--mall-color-primary-light));

  span,
  .section-heading span {
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

.profile-loading {
  padding: 34px;
}

.load-state {
  display: grid;
  justify-items: center;
  min-height: 400px;
  padding: 64px 24px;
  text-align: center;

  > span {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    color: var(--mall-color-primary);
    font-size: 24px;
    font-weight: 800;
    background: var(--mall-color-primary-light);
    border-radius: 50%;
  }

  h2 {
    margin: 18px 0 8px;
    color: var(--mall-color-text);
  }

  p {
    margin: 0 0 22px;
    color: var(--mall-color-muted);
    font-size: 13px;
  }
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(230px, 0.34fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.identity-card {
  display: grid;
  justify-items: center;
  padding: 32px 24px 24px;
  text-align: center;

  h2 {
    margin: 15px 0 4px;
    color: var(--mall-color-text);
    font-size: 20px;
  }

  > p {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 12px;
  }

  dl {
    width: 100%;
    margin: 28px 0 0;
    text-align: left;
    border-top: 1px solid var(--mall-color-border);
  }

  dl div {
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    gap: 10px;
    padding: 12px 0;
    border-bottom: 1px solid #edf0f4;
  }

  dt {
    color: var(--mall-color-muted);
    font-size: 11px;
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--mall-color-text);
    font-size: 11px;
    text-align: right;
  }
}

.avatar {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  overflow: hidden;
  color: #fff;
  font-size: 30px;
  font-weight: 800;
  background: linear-gradient(145deg, var(--mall-color-accent), var(--mall-color-primary));
  border: 7px solid var(--mall-color-primary-soft);
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.identity-card__tip {
  padding: 11px 12px;
  margin-top: 18px !important;
  color: #64748b !important;
  line-height: 1.65;
  text-align: left;
  background: var(--mall-color-surface-muted);
  border-radius: 6px;
}

.profile-form-card {
  overflow: hidden;
}

.section-heading {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--mall-color-border);

  span {
    color: var(--mall-color-primary);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 4px 0 0;
    color: var(--mall-color-text);
    font-size: 19px;
  }

  small {
    color: var(--mall-color-muted);
    font-size: 10px;
  }
}

.profile-form {
  display: grid;
  gap: 20px;
  padding: 26px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.form-field {
  display: grid;
  gap: 8px;
  min-width: 0;

  label {
    color: var(--mall-color-text);
    font-size: 12px;
    font-weight: 700;
  }

  > small {
    color: var(--mall-color-muted);
    font-size: 10px;
  }

  .field-error {
    color: var(--mall-color-danger);
  }
}

.full-width {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 4px;
}

@media (max-width: 780px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .identity-card {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0 18px;
    justify-items: start;
    text-align: left;

    .avatar {
      grid-row: span 2;
      width: 68px;
      height: 68px;
      border-width: 5px;
    }

    h2 {
      align-self: end;
      margin-top: 0;
    }

    dl,
    .identity-card__tip {
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
      max-width: 220px;
    }
  }

  .section-heading {
    align-items: flex-start;
    padding: 19px;
    flex-direction: column;
  }

  .profile-form {
    padding: 19px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
