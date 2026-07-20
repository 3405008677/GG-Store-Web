<script setup lang="ts">
import { useStores } from '@/stores'

/** 显式组件名便于在会员页面调试公共侧栏。 */
defineOptions({ name: 'MemberSidebar' })

/** 侧栏只读取最小会员展示信息。 */
const { userStore } = useStores()

/** 当前已落地的会员中心路由集中维护，避免模板散落路径。 */
const memberLinks = [
  { label: '账户资料', short: '资', to: '/member/profile' },
  { label: '收货地址', short: '址', to: '/member/addresses' },
  { label: '账户安全', short: '安', to: '/member/security' },
  { label: '我的订单', short: '订', to: '/member/orders' },
  { label: '我的收藏', short: '藏', to: '/member/favorites' },
  { label: '购物车', short: '车', to: '/cart' },
] as const
</script>

<template>
  <aside class="member-sidebar" aria-label="会员中心导航">
    <section class="member-profile">
      <div class="member-profile__avatar" aria-hidden="true">
        {{ userStore.displayName ? userStore.displayName.slice(0, 1) : 'GG' }}
      </div>
      <div>
        <span>会员中心</span>
        <strong>{{ userStore.displayName || '管管商城会员' }}</strong>
      </div>
    </section>

    <nav class="member-navigation">
      <NuxtLink v-for="item in memberLinks" :key="item.to" :to="item.to">
        <span aria-hidden="true">{{ item.short }}</span>
        <strong>{{ item.label }}</strong>
        <i aria-hidden="true">›</i>
      </NuxtLink>
    </nav>

    <NuxtLink class="member-sidebar__home" to="/">返回商城首页</NuxtLink>
  </aside>
</template>

<style lang="scss" scoped>
.member-sidebar {
  align-self: start;
  overflow: hidden;
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);
}

.member-profile {
  display: flex;
  gap: 13px;
  align-items: center;
  padding: 22px 18px;
  background: linear-gradient(135deg, #fff, var(--mall-color-primary-light));
  border-bottom: 1px solid var(--mall-color-primary-border);

  > div:last-child {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  span {
    color: var(--mall-color-muted);
    font-size: 11px;
  }

  strong {
    overflow: hidden;
    color: var(--mall-color-text);
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.member-profile__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(145deg, var(--mall-color-accent), var(--mall-color-primary));
  border: 4px solid var(--mall-color-primary-soft);
  border-radius: 50%;
}

.member-navigation {
  display: grid;
  padding: 10px;

  a {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 48px;
    padding: 0 12px;
    color: #526074;
    text-decoration: none;
    border-radius: 7px;
    transition: color 180ms ease, background 180ms ease, transform 180ms ease;

    > span {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      color: #6580a5;
      font-size: 11px;
      font-weight: 800;
      background: #eef3f9;
      border-radius: 7px;
    }

    strong {
      font-size: 13px;
    }

    i {
      color: #a8b1bd;
      font-size: 18px;
      font-style: normal;
    }

    &:hover,
    &.router-link-active {
      color: var(--mall-color-primary);
      background: var(--mall-color-primary-light);
      transform: translateX(2px);

      > span {
        color: #fff;
        background: var(--mall-color-primary);
      }
    }
  }
}

.member-sidebar__home {
  display: block;
  padding: 14px 20px 18px;
  color: var(--mall-color-muted);
  font-size: 12px;
  text-align: center;
  text-decoration: none;
  border-top: 1px solid #edf0f4;

  &:hover {
    color: var(--mall-color-primary);
  }
}

@media (max-width: 920px) {
  .member-sidebar {
    width: 100%;
  }

  .member-profile,
  .member-sidebar__home {
    display: none;
  }

  .member-navigation {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding: 7px;

    a {
      grid-template-columns: 28px auto;
      justify-content: center;
      min-height: 44px;
      padding: 0 8px;

      i {
        display: none;
      }
    }
  }
}

@media (max-width: 480px) {
  .member-navigation a {
    grid-template-columns: 1fr;

    > span {
      display: none;
    }
  }
}
</style>
