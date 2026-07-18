<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { changePassword } from '@/api/login'
import { useStores } from '@/stores'
import type { ChangePasswordFormData } from '@/types/auth'
import { isApiRequestError } from '@/types/api'

definePageMeta({
  name: 'member-security',
  path: '/member/security',
  layout: 'member',
  requiresAuth: true,
})

useHead({ title: '账号安全 - 管管商城' })

const { userStore } = useStores()
const formRef = ref<FormInstance>()
const isSubmitting = ref(false)
const form = reactive<ChangePasswordFormData>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateCurrentPassword: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  const password = typeof value === 'string' ? value : ''
  const length = [...password].length
  if (length < 1 || length > 128) {
    callback(new Error('当前密码须为 1–128 个字符'))
    return
  }
  callback()
}

/** 与注册接口保持一致：8–128 个 Unicode 字符，至少包含字母和数字。 */
const validateNewPassword: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  const password = typeof value === 'string' ? value : ''
  const length = [...password].length
  if (length < 8 || length > 128) {
    callback(new Error('新密码长度应为 8–128 个字符'))
    return
  }
  if (
    !/\p{L}/u.test(password) ||
    !/\p{Decimal_Number}/u.test(password) ||
    /\p{Cc}/u.test(password)
  ) {
    callback(new Error('新密码至少包含一个字母和一个数字，且不能含控制字符'))
    return
  }
  if (password === form.currentPassword) {
    callback(new Error('新密码不能与当前密码相同'))
    return
  }
  callback()
}

const validateConfirmPassword: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  if (value !== form.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }
  callback()
}

const rules: FormRules<ChangePasswordFormData> = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
    { validator: validateCurrentPassword, trigger: ['blur', 'change'] },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { validator: validateNewPassword, trigger: ['blur', 'change'] },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: ['blur', 'change'] },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value || isSubmitting.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  isSubmitting.value = true
  try {
    const result = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    if (!result.requiresLogin) {
      throw new Error('修改密码响应缺少重新登录标记')
    }

    // 后端已撤销所有设备会话并删除 Refresh Cookie，本地必须同步熔断恢复链路。
    userStore.expireSession()
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    ElMessage.success('密码修改成功，请使用新密码重新登录')
    await navigateTo(
      {
        path: '/login',
        query: { reason: 'password-changed' },
      },
      { replace: true },
    )
  } catch (error) {
    if (!isApiRequestError(error) || !error.isShown) {
      ElMessage.error(error instanceof Error ? error.message : '密码修改失败，请稍后重试')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="security-page">
    <header class="page-heading">
      <div>
        <span>ACCOUNT SECURITY</span>
        <h1>账号安全</h1>
        <p>修改登录密码后，当前设备和其他设备上的会话都会立即失效</p>
      </div>
    </header>

    <article class="security-card">
      <div class="security-card__intro">
        <span aria-hidden="true">密</span>
        <div>
          <h2>修改登录密码</h2>
          <p>密码会在浏览器中使用一次性 RSA + AES 密文提交，不会以明文发送或持久化。</p>
        </div>
      </div>

      <ElAlert
        title="保存成功后需要重新登录"
        description="后端会撤销全部设备的 Refresh Token，并立即使现有 Access Token 失效。"
        type="warning"
        :closable="false"
        show-icon
      />

      <ElForm
        ref="formRef"
        class="security-form"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        @submit.prevent="handleSubmit"
      >
        <ElFormItem prop="currentPassword" label="当前密码">
          <ElInput
            v-model="form.currentPassword"
            type="password"
            autocomplete="current-password"
            show-password
            maxlength="256"
          />
        </ElFormItem>
        <ElFormItem prop="newPassword" label="新密码">
          <ElInput
            v-model="form.newPassword"
            type="password"
            autocomplete="new-password"
            show-password
            maxlength="256"
            placeholder="8–128 个字符，至少包含字母和数字"
          />
        </ElFormItem>
        <ElFormItem prop="confirmPassword" label="确认新密码">
          <ElInput
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            show-password
            maxlength="256"
          />
        </ElFormItem>
        <ElButton
          type="primary"
          native-type="submit"
          :loading="isSubmitting"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? '正在安全提交…' : '保存新密码' }}
        </ElButton>
      </ElForm>
    </article>
  </section>
</template>

<style lang="scss" scoped>
.security-page {
  display: grid;
  gap: 16px;
}

.page-heading,
.security-card {
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);
}

.page-heading {
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
    font-size: 26px;
  }

  p {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 13px;
  }
}

.security-card {
  width: min(720px, 100%);
  padding: 28px;
}

.security-card__intro {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 22px;

  > span {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 48px;
    height: 48px;
    color: #fff;
    font-weight: 800;
    background: var(--mall-color-primary);
    border-radius: 12px;
  }

  h2 {
    margin: 0 0 5px;
    font-size: 19px;
  }

  p {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 12px;
    line-height: 1.7;
  }
}

.security-form {
  display: grid;
  max-width: 520px;
  margin-top: 24px;
}

@media (max-width: 640px) {
  .page-heading,
  .security-card {
    padding: 20px;
  }
}
</style>
