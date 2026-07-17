<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { DEFAULT_HOME_PATH, LOGIN_PATH, REGISTER_PATH } from '@/config/app'
import { useStores } from '@/stores'
import type { RegisterFormData } from '@/types/auth'
import { isApiRequestError } from '@/types/api'

/** 注册页使用独立认证外壳，不继承商城业务页面的默认布局。 */
definePageMeta({
  name: 'register',
  path: '/register',
  layout: false,
})

/** 页面路由仅用于保留注册前的受保护页面目标。 */
const route = useRoute()

/** 表单实例负责前端校验和错误提示定位。 */
const formRef = ref<FormInstance>()

/** 会员 Store 统一完成加密请求、会话写入和跨标签页同步。 */
const { userStore } = useStores()

/** 注册提交锁覆盖校验阶段，避免回车与按钮点击产生重复账号。 */
const isSubmitting = ref(false)

/** 密码、确认密码和协议勾选仅保存在当前页面内存中。 */
const form = reactive<RegisterFormData>({
  username: '',
  displayName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  agreed: false,
})

/** 用户名不能伪装成邮箱或手机号，确保后续多账号类型登录没有歧义。 */
const validateUsername: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  const username = typeof value === 'string' ? value.normalize('NFKC').trim() : ''
  const length = [...username].length
  if (length < 4 || length > 64) {
    callback(new Error('用户名长度应为 4–64 个字符'))
    return
  }
  if (username.includes('@') || /^\+?[0-9]{6,20}$/.test(username)) {
    callback(new Error('用户名不能使用邮箱或手机号格式'))
    return
  }
  if (/\p{Cc}/u.test(username)) {
    callback(new Error('用户名包含不可用字符'))
    return
  }
  callback()
}

/** 展示名称按 Unicode code point 计数，并过滤不可见控制字符。 */
const validateDisplayName: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  const displayName = typeof value === 'string' ? value.normalize('NFKC').trim() : ''
  const length = [...displayName].length
  if (length < 1 || length > 100 || /\p{Cc}/u.test(displayName)) {
    callback(new Error('会员名称应为 1–100 个字符，且不能含控制字符'))
    return
  }
  callback()
}

/** 可选手机号使用后端接受的国际号码形式，不在前端猜测国家区号。 */
const validatePhoneNumber: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  const phoneNumber = typeof value === 'string' ? value.trim() : ''
  if (phoneNumber && !/^\+?[0-9]{6,20}$/.test(phoneNumber)) {
    callback(new Error('请输入 6–20 位手机号，可在开头使用 +'))
    return
  }
  callback()
}

/** 密码规则与后端保持一致：8–128 个 Unicode 字符，至少包含一个字母和一个数字。 */
const validatePassword: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  const password = typeof value === 'string' ? value : ''
  const length = [...password].length
  if (length < 8 || length > 128) {
    callback(new Error('密码长度应为 8–128 个字符'))
    return
  }
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password) || /\p{Cc}/u.test(password)) {
    callback(new Error('密码至少包含一个字母和一个数字，且不能含控制字符'))
    return
  }
  callback()
}

/** 二次密码只在浏览器端比对，不会进入注册接口。 */
const validateConfirmPassword: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
    return
  }
  callback()
}

/** 必须由用户主动确认服务协议后才允许创建账号。 */
const validateAgreement: NonNullable<FormItemRule['validator']> = (_rule, value, callback) => {
  if (value !== true) {
    callback(new Error('请先阅读并同意用户服务协议与隐私政策'))
    return
  }
  callback()
}

/** 注册字段规则在页面内集中声明，便于与后端 DTO 约束逐项核对。 */
const rules: FormRules<RegisterFormData> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { validator: validateUsername, trigger: ['blur', 'change'] },
  ],
  displayName: [
    { required: true, message: '请输入会员名称', trigger: 'blur' },
    { validator: validateDisplayName, trigger: ['blur', 'change'] },
  ],
  email: [
    { required: true, message: '请输入电子邮箱', trigger: 'blur' },
    { type: 'email', max: 254, message: '请输入有效的电子邮箱', trigger: ['blur', 'change'] },
  ],
  phoneNumber: [{ validator: validatePhoneNumber, trigger: ['blur', 'change'] }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { validator: validatePassword, trigger: ['blur', 'change'] },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: ['blur', 'change'] },
  ],
  agreed: [{ validator: validateAgreement, trigger: 'change' }],
}

/** 只接受站内绝对路径，并过滤登录/注册页面自循环。 */
function getSafeRedirect(): string {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) return DEFAULT_HOME_PATH
  const redirectPath = (redirect.split(/[?#]/)[0] || DEFAULT_HOME_PATH).replace(/\/+$/, '') || DEFAULT_HOME_PATH
  if (redirectPath === LOGIN_PATH || redirectPath === REGISTER_PATH) return DEFAULT_HOME_PATH
  return redirect
}

/** 在注册与登录之间切换时继续携带原始业务页面目标。 */
const loginTarget = computed(() => {
  const redirect = getSafeRedirect()
  return redirect === DEFAULT_HOME_PATH ? LOGIN_PATH : { path: LOGIN_PATH, query: { redirect } }
})

/** 对浏览器端加密异常提供可操作提示，其余错误沿用后端的精确业务消息。 */
function getRegisterErrorMessage(error: unknown): string {
  if (!isApiRequestError(error)) return error instanceof Error ? error.message : '注册失败，请稍后重试'
  if (error.code === 'AUTH_LOGIN_ENCRYPTION_UNAVAILABLE') return '当前浏览器无法建立安全注册请求，请使用最新版浏览器并确认已启用 HTTPS'
  if (error.code === 'AUTH_LOGIN_ENCRYPTION_PROTOCOL_INVALID') return '注册安全参数无效或已过期，请重试'
  if (error.code === 'AUTH_LOGIN_ENCRYPTION_FAILED') return '无法加密注册请求，请刷新页面后重试'
  return error.message
}

/** 完成前端校验、安全注册、密码清理与原目标跳转。 */
async function handleSubmit(): Promise<void> {
  if (!formRef.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    await userStore.register(form)
    form.password = ''
    form.confirmPassword = ''
    ElMessage.success('注册成功，已为你自动登录')
    await navigateTo(getSafeRedirect(), { replace: true })
  } catch (error) {
    if (!isApiRequestError(error) || !error.isShown) {
      ElMessage.error(getRegisterErrorMessage(error))
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthShell title="创建会员账号" description="注册后即可使用收藏夹、购物车和会员中心服务" wide>
    <ElForm ref="formRef" class="auth-form register-form" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="handleSubmit">
      <div class="register-form__grid">
        <ElFormItem prop="username" label="用户名">
          <ElInput v-model.trim="form.username" name="username" autocomplete="username" maxlength="128" placeholder="4–64 个字符" />
        </ElFormItem>

        <ElFormItem prop="displayName" label="会员名称">
          <ElInput v-model.trim="form.displayName" name="name" autocomplete="name" maxlength="200" placeholder="用于商城内展示" />
        </ElFormItem>

        <ElFormItem prop="email" label="电子邮箱">
          <ElInput v-model.trim="form.email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="name@example.com" />
        </ElFormItem>

        <ElFormItem prop="phoneNumber" label="手机号（选填）">
          <ElInput v-model.trim="form.phoneNumber" name="tel" type="tel" autocomplete="tel" maxlength="21" placeholder="支持国际区号" />
        </ElFormItem>

        <ElFormItem prop="password" label="登录密码">
          <ElInput
            v-model="form.password"
            name="new-password"
            type="password"
            autocomplete="new-password"
            show-password
            maxlength="256"
            placeholder="至少 8 位，包含字母和数字"
          />
        </ElFormItem>

        <ElFormItem prop="confirmPassword" label="确认密码">
          <ElInput
            v-model="form.confirmPassword"
            name="confirm-password"
            type="password"
            autocomplete="new-password"
            show-password
            maxlength="256"
            placeholder="再次输入登录密码"
          />
        </ElFormItem>
      </div>

      <ElFormItem class="agreement-item" prop="agreed">
        <ElCheckbox v-model="form.agreed">
          我已阅读并同意《用户服务协议》和《隐私政策》
        </ElCheckbox>
      </ElFormItem>

      <ElButton class="auth-submit" type="primary" native-type="submit" :loading="isSubmitting" :disabled="isSubmitting">
        {{ isSubmitting ? '正在创建账号…' : '免费注册' }}
      </ElButton>
    </ElForm>

    <p class="auth-switch">
      已有账号？
      <NuxtLink :to="loginTarget">直接登录</NuxtLink>
    </p>
  </AuthShell>
</template>

<style lang="scss" scoped>
.register-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.agreement-item {
  margin-top: -2px;

  :deep(.el-form-item__content) {
    line-height: 1.5;
  }

  :deep(.el-checkbox) {
    height: auto;
    white-space: normal;
  }
}

@media (max-width: 520px) {
  .register-form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
