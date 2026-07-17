<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { AppLocale, LoginFormData } from '@/types/auth'
import { isApiRequestError } from '@/types/api'
import { DEFAULT_HOME_PATH, LOGIN_PATH, REGISTER_PATH } from '@/config/app'
import { useAppLocale } from '@/i18n'
import { useStores } from '@/stores'

// 登录页使用独立双栏布局，不继承后续商城业务页面的默认布局。
definePageMeta({
  name: 'login',
  path: '/login',
  layout: false,
})

// 路由用于读取登录前目标；Form 引用只负责 Element Plus 校验。
const route = useRoute()
const formRef = ref<FormInstance>()

// 统一入口返回当前 Nuxt 应用的 Store，页面不直接操作 Token 或 Cookie。
const { userStore, settingStore } = useStores()
const { t, locale, setAppLocale } = useAppLocale()

// 提交锁在校验开始前启用，阻止回车和按钮点击造成并发登录。
const isSubmitting = ref(false)

// password 只存在于当前页面内存，提交后不会写入 Store 或浏览器持久化。
const form = reactive<LoginFormData>({
  account: '',
  password: '',
})

// 语言不是商城 LoginRequest 字段，单独维护可避免把前端偏好误发给认证接口。
const selectedLanguage = ref<AppLocale>((locale.value === 'ENG' ? 'ENG' : 'CHS') as AppLocale)

/** 在登录与注册页面之间切换时保留原始受保护页面目标。 */
const registerTarget = computed(() => {
  const redirect = getSafeRedirect()
  return redirect === DEFAULT_HOME_PATH ? REGISTER_PATH : { path: REGISTER_PATH, query: { redirect } }
})

/**
 * 按 Unicode code point 统计密码长度，与后端 EnumerateRunes 的边界保持一致。
 * HTML maxlength 仍限制为 256 个 UTF-16 code unit，对应后端 StringLength 上限。
 */
const validatePasswordLength: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  if (typeof value === 'string' && [...value].length > 128) callback(new Error(t('communal.passwordLengthCheck.text')))
  else callback()
}

// 规则与商城 LoginRequest 对齐：账号最多 256 字符，密码最多 128 个 Unicode 字符。
const rules = computed<FormRules<LoginFormData>>(() => ({
  account: [
    { required: true, message: t('communal.userNameCheck.text'), trigger: 'blur' },
    { max: 256, message: t('communal.accountFormatCheck.text'), trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: t('communal.passwordCheck.text'), trigger: 'blur' },
    { validator: validatePasswordLength, trigger: ['blur', 'change'] },
  ],
}))

/** 返回可信站内跳转目标，过滤协议相对地址和登录页自循环。 */
function getSafeRedirect(): string {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) return DEFAULT_HOME_PATH
  const redirectPath = (redirect.split(/[?#]/)[0] || DEFAULT_HOME_PATH).replace(/\/+$/, '') || DEFAULT_HOME_PATH
  if (redirectPath === LOGIN_PATH) return DEFAULT_HOME_PATH
  return redirect
}

/** 将浏览器本地登录加密异常转换为当前语言文案；服务端异常仍沿用请求层消息。 */
function getLoginErrorMessage(error: unknown): string {
  if (!isApiRequestError(error)) return error instanceof Error ? error.message : t('communal.loginFailed.text')
  if (error.code === 'AUTH_LOGIN_ENCRYPTION_UNAVAILABLE') return t('communal.loginEncryptionUnavailable.text')
  if (error.code === 'AUTH_LOGIN_ENCRYPTION_PROTOCOL_INVALID') return t('communal.loginEncryptionInvalid.text')
  if (error.code === 'AUTH_LOGIN_ENCRYPTION_FAILED') return t('communal.loginEncryptionFailed.text')
  return error.message
}

/** 切换页面和 Element Plus 语言，并清除旧语言下已经显示的校验消息。 */
async function handleLocaleChange(value: AppLocale): Promise<void> {
  selectedLanguage.value = value
  await setAppLocale(value)
  formRef.value?.clearValidate()
}

/**
 * 完成“防重复 → 前端校验 → HTTPS 登录 → 成功后清除密码 → 提示 → 安全跳转”流程。
 *
 * 请求层已经展示过的异常通过 isShown 去重，避免页面再弹一次相同消息。
 */
async function handleSubmit(): Promise<void> {
  if (!formRef.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    await userStore.login(form)
    form.password = ''
    settingStore.setLanguage(selectedLanguage.value)
    ElMessage.success(t('communal.loginSuccess.text'))
    await navigateTo(getSafeRedirect(), { replace: true })
  } catch (error) {
    if (!isApiRequestError(error) || !error.isShown) {
      ElMessage.error(getLoginErrorMessage(error))
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthShell :title="t('communal.loginTitle.text')" :description="t('communal.loginDescription.text')">
    <ElForm ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="handleSubmit">
      <ElFormItem prop="account" :label="t('communal.account.text')">
        <ElInput
          v-model.trim="form.account"
          name="username"
          autocomplete="username"
          :placeholder="t('communal.accountPlaceholder.text')"
          maxlength="256"
        />
      </ElFormItem>

      <ElFormItem prop="password" :label="t('communal.password.text')">
        <ElInput
          v-model="form.password"
          name="password"
          type="password"
          autocomplete="current-password"
          show-password
          :placeholder="t('communal.passwordPlaceholder.text')"
          maxlength="256"
        />
      </ElFormItem>

      <ElFormItem :label="t('communal.Language.text')">
        <ElSelect v-model="selectedLanguage" class="field-control" @change="handleLocaleChange">
          <ElOption v-for="item in settingStore.languageList" :key="item.val" :label="item.txt" :value="item.val" />
        </ElSelect>
      </ElFormItem>

      <ElButton class="auth-submit" type="primary" native-type="submit" :loading="isSubmitting" :disabled="isSubmitting">
        {{ isSubmitting ? t('communal.loggingIn.text') : t('communal.login.text') }}
      </ElButton>
    </ElForm>

    <p class="auth-switch">
      {{ t('communal.noAccount.text') }}
      <NuxtLink :to="registerTarget">{{ t('communal.registerNow.text') }}</NuxtLink>
    </p>
  </AuthShell>
</template>

<style lang="scss" scoped>
.field-control {
  width: 100%;
}
</style>
