<script setup lang="ts">
/** 登录与注册页共享的标题和宽度配置，保证两个认证入口使用同一套视觉语言。 */
interface AuthShellProps {
  title: string
  description: string
  /** 注册表单字段更多，启用后适当放宽内容区。 */
  wide?: boolean
}

/** 为 Vue DevTools 提供稳定组件名称，便于定位认证页公共外壳。 */
defineOptions({ name: 'AuthShell' })

const props = withDefaults(defineProps<AuthShellProps>(), {
  wide: false,
})

/** 品牌文案继续复用全站国际化资源，切换语言时无需重建页面。 */
const { t } = useI18n()
</script>

<template>
  <main class="auth-shell">
    <section class="brand-panel" aria-labelledby="auth-brand-title">
      <div class="brand-panel__content">
        <NuxtLink class="brand-mark" to="/" :aria-label="t('communal.appName.text')">
          <span aria-hidden="true">GG</span>
        </NuxtLink>
        <p class="brand-kicker">{{ t('communal.brandKicker.text') }}</p>
        <h1 id="auth-brand-title">{{ t('communal.appName.text') }}</h1>
        <p class="brand-subtitle">{{ t('communal.brandSubtitle.text') }}</p>
        <div class="brand-benefits" aria-label="平台特点">
          <span>实时商品目录</span>
          <span>分类购物车</span>
          <span>安全会话管理</span>
        </div>
      </div>
      <div class="brand-panel__shape brand-panel__shape--one" aria-hidden="true" />
      <div class="brand-panel__shape brand-panel__shape--two" aria-hidden="true" />
    </section>

    <section class="form-panel">
      <div class="auth-card" :class="{ 'auth-card--wide': props.wide }">
        <header class="auth-card__header">
          <p class="auth-card__eyebrow">GG STORE</p>
          <h2>{{ props.title }}</h2>
          <p>{{ props.description }}</p>
        </header>
        <slot />
      </div>
      <p class="copyright">Copyright © 2026 GG Store</p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.auth-shell {
  display: grid;
  grid-template-columns: minmax(390px, 1.06fr) minmax(480px, 0.94fr);
  min-height: 100dvh;
  background: var(--mall-color-page);
}

.brand-panel {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: clamp(48px, 5vw, 88px);
  overflow: hidden;
  color: #f6faff;
  background:
    linear-gradient(145deg, rgb(7 45 102 / 96%), rgb(23 104 215 / 91%)),
    radial-gradient(circle at 30% 20%, #4eb4ec 0, transparent 38%);

  &::before {
    position: absolute;
    inset: clamp(16px, 2vw, 28px);
    content: '';
    border: 1px solid rgb(255 255 255 / 13%);
    border-radius: var(--mall-radius-xlarge);
  }
}

.brand-panel__content {
  position: relative;
  z-index: 2;
  width: min(560px, 100%);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  margin-bottom: 36px;
  color: var(--mall-color-primary-dark);
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -2px;
  text-decoration: none;
  background: #e7f2ff;
  border-radius: 22px 22px 22px 7px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 20%);
  transition: transform 180ms ease, box-shadow 180ms ease;

  &:hover {
    box-shadow: 0 24px 68px rgb(0 0 0 / 24%);
    transform: translateY(-2px);
  }
}

.brand-kicker {
  margin: 0 0 16px;
  color: #bedcff;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.12em;
}

.brand-panel h1 {
  margin: 0;
  font-size: clamp(48px, 5.4vw, 82px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.055em;
}

.brand-subtitle {
  margin: 24px 0 0;
  color: rgb(234 246 255 / 78%);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.brand-benefits {
  display: flex;
  gap: 14px;
  margin-top: 44px;
  color: rgb(240 248 255 / 76%);
  font-size: 12px;

  span {
    display: inline-flex;
    gap: 7px;
    align-items: center;

    &::before {
      width: 5px;
      height: 5px;
      content: '';
      background: #83d2ff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgb(131 210 255 / 13%);
    }
  }
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
  padding: clamp(56px, 6vw, 96px) clamp(32px, 6vw, 108px) 76px;
  background:
    radial-gradient(circle at 100% 0, rgb(23 104 215 / 5%), transparent 28%),
    var(--mall-color-page);
}

.auth-card {
  width: min(440px, 100%);
  padding: clamp(24px, 2.5vw, 34px);
  background: rgb(255 255 255 / 76%);
  border: 1px solid rgb(228 233 240 / 82%);
  border-radius: var(--mall-radius-xlarge);
  box-shadow: var(--mall-shadow-elevated);
  backdrop-filter: blur(14px);
}

.auth-card--wide {
  width: min(540px, 100%);
}

.auth-card__header {
  margin-bottom: 30px;

  h2 {
    margin: 8px 0 12px;
    color: var(--mall-color-text);
    font-size: clamp(32px, 3vw, 38px);
    line-height: 1.15;
    letter-spacing: -0.035em;
  }

  p:last-child {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 15px;
    line-height: 1.7;
  }
}

.auth-card__eyebrow {
  margin: 0;
  color: var(--mall-color-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

:deep(.auth-form) {
  .el-form-item {
    margin-bottom: 20px;
  }

  .el-form-item__label {
    color: #34435a;
    font-weight: 650;
  }

  .el-input__wrapper,
  .el-select__wrapper {
    min-height: 48px;
    background: #fff;
    border-radius: var(--mall-radius-medium);
    box-shadow: 0 0 0 1px var(--mall-color-border) inset;
    transition: box-shadow 160ms ease;
  }

  .el-input__wrapper.is-focus,
  .el-select__wrapper.is-focused {
    box-shadow: 0 0 0 1px var(--mall-color-primary) inset, 0 0 0 4px rgb(23 104 215 / 10%);
  }
}

:deep(.auth-submit) {
  width: 100%;
  height: 50px;
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 13px;
  box-shadow: 0 14px 30px rgb(23 104 215 / 22%);
}

:deep(.auth-switch) {
  margin: 22px 0 0;
  color: var(--mall-color-muted);
  font-size: 14px;
  text-align: center;

  a {
    margin-left: 6px;
    color: var(--mall-color-primary);
    font-weight: 700;
    text-decoration: none;

    &:hover {
      color: var(--mall-color-primary-dark);
    }
  }
}

.copyright {
  position: absolute;
  bottom: 22px;
  margin: 0;
  color: #98a2b1;
  font-size: 12px;
}

@media (min-width: 1920px) {
  .auth-shell {
    grid-template-columns: minmax(720px, 1.12fr) minmax(620px, 0.88fr);
  }
}

@media (max-width: 1024px) {
  .auth-shell {
    grid-template-columns: minmax(340px, 0.9fr) minmax(460px, 1.1fr);
  }

  .brand-benefits {
    flex-direction: column;
  }
}

@media (max-width: 860px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 245px;
    padding: 48px 36px;
  }

  .brand-mark {
    width: 58px;
    height: 58px;
    margin-bottom: 22px;
  }

  .brand-panel h1 {
    font-size: 46px;
  }

  .brand-benefits {
    display: none;
  }

  .form-panel {
    min-height: calc(100dvh - 245px);
    padding: 48px 28px 76px;
  }
}

@media (max-width: 520px) {
  .brand-panel {
    min-height: 190px;
    padding: 34px 24px;

    &::before {
      inset: 10px;
      border-radius: 20px;
    }
  }

  .brand-mark,
  .brand-subtitle {
    display: none;
  }

  .brand-panel h1 {
    font-size: 38px;
  }

  .brand-kicker {
    margin-bottom: 12px;
    font-size: 13px;
  }

  .form-panel {
    min-height: calc(100dvh - 190px);
    padding: 28px 14px 68px;
  }

  .auth-card {
    padding: 24px 20px;
    border-radius: var(--mall-radius-large);
  }

  .auth-card__header {
    margin-bottom: 24px;

    h2 {
      font-size: 30px;
    }
  }
}
</style>
