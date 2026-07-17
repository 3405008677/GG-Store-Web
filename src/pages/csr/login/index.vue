<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { AppLocale, LoginFormData } from '@/types/auth'
import { isApiRequestError } from '@/types/api'
import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@/config/app'
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
  <main class="login-page">
    <section class="brand-panel" aria-labelledby="brand-title">
      <div class="brand-panel__content">
        <div class="brand-mark" aria-hidden="true"><span>GG</span></div>
        <p class="brand-kicker">{{ t('communal.brandKicker.text') }}</p>
        <h1 id="brand-title">{{ t('communal.appName.text') }}</h1>
        <p class="brand-subtitle">{{ t('communal.brandSubtitle.text') }}</p>
      </div>
      <div class="brand-panel__shape brand-panel__shape--one" />
      <div class="brand-panel__shape brand-panel__shape--two" />
    </section>

    <section class="form-panel">
      <div class="login-card">
        <header class="login-card__header">
          <p class="login-card__eyebrow">GG STORE</p>
          <h2>{{ t('communal.loginTitle.text') }}</h2>
          <p>{{ t('communal.loginDescription.text') }}</p>
        </header>

        <ElForm ref="formRef" class="login-form" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="handleSubmit">
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

          <ElButton class="submit-button" type="primary" native-type="submit" :loading="isSubmitting" :disabled="isSubmitting">
            {{ isSubmitting ? t('communal.loggingIn.text') : t('communal.login.text') }}
          </ElButton>
        </ElForm>
      </div>
      <p class="copyright">Copyright © 2026 GG Store</p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(360px, 1.08fr) minmax(440px, 0.92fr);
  min-height: 100dvh;
  background: #f5f7f3;
}

.brand-panel {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 64px;
  overflow: hidden;
  color: #f5fff9;
  background: linear-gradient(145deg, rgb(8 48 41 / 92%), rgb(24 105 82 / 88%)), radial-gradient(circle at 30% 20%, #6bb396 0, transparent 38%);

  &::before {
    position: absolute;
    inset: 24px;
    content: '';
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 28px;
  }
}

.brand-panel__content {
  position: relative;
  z-index: 2;
  width: min(520px, 100%);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  margin-bottom: 36px;
  color: #164d40;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -2px;
  background: #d9f2df;
  border-radius: 22px 22px 22px 7px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 20%);
}

.brand-kicker {
  margin: 0 0 16px;
  color: #bae0ce;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.brand-panel h1 {
  margin: 0;
  font-size: clamp(48px, 6vw, 84px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.055em;
}

.brand-subtitle {
  margin: 24px 0 0;
  color: rgb(234 255 246 / 72%);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.brand-panel__shape {
  position: absolute;
  border: 1px solid rgb(219 255 235 / 13%);
  border-radius: 999px;
}

.brand-panel__shape--one {
  right: -120px;
  bottom: -160px;
  width: 430px;
  height: 430px;
  box-shadow: 0 0 0 46px rgb(255 255 255 / 2%), 0 0 0 92px rgb(255 255 255 / 2%);
}

.brand-panel__shape--two {
  top: 15%;
  left: -120px;
  width: 250px;
  height: 250px;
}

.form-panel {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 64px clamp(32px, 7vw, 112px);
}

.login-card {
  width: min(440px, 100%);
}

.login-card__header {
  margin-bottom: 36px;

  h2 {
    margin: 8px 0 12px;
    color: #15251f;
    font-size: 38px;
    line-height: 1.15;
    letter-spacing: -0.035em;
  }

  p:last-child {
    margin: 0;
    color: #718079;
    font-size: 15px;
    line-height: 1.7;
  }
}

.login-card__eyebrow {
  margin: 0;
  color: #38866f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 22px;
  }

  :deep(.el-form-item__label) {
    color: #34433d;
    font-weight: 650;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    min-height: 48px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 0 0 1px #dce3de inset;
  }

  :deep(.el-input__wrapper.is-focus),
  :deep(.el-select__wrapper.is-focused) {
    box-shadow: 0 0 0 1px #2f7d68 inset, 0 0 0 4px rgb(47 125 104 / 10%);
  }
}

.field-control {
  width: 100%;
}

.submit-button {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  background: #26745f;
  border-color: #26745f;
  border-radius: 13px;
  box-shadow: 0 14px 30px rgb(38 116 95 / 22%);

  &:hover,
  &:focus-visible {
    background: #1d604f;
    border-color: #1d604f;
  }
}

.copyright {
  position: absolute;
  bottom: 24px;
  margin: 0;
  color: #98a29d;
  font-size: 12px;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 260px;
    padding: 52px 36px;
  }

  .brand-mark {
    width: 58px;
    height: 58px;
    margin-bottom: 24px;
  }

  .brand-panel h1 {
    font-size: 48px;
  }

  .form-panel {
    min-height: calc(100dvh - 260px);
    padding: 56px 28px 80px;
  }
}

@media (max-width: 520px) {
  .brand-panel {
    min-height: 220px;
    padding: 36px 24px;

    &::before {
      inset: 12px;
      border-radius: 20px;
    }
  }

  .brand-mark,
  .brand-subtitle {
    display: none;
  }

  .brand-panel h1 {
    font-size: 40px;
  }

  .form-panel {
    min-height: calc(100dvh - 220px);
    padding: 44px 20px 72px;
  }

  .login-card__header h2 {
    font-size: 32px;
  }
}
</style>
