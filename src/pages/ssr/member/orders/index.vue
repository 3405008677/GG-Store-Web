<script setup lang="ts">
import type { OrderModuleStatus } from '@/api/order/types'
import { getOrderModuleStatus } from '@/api/order'

/** 订单中心需要登录，并复用会员中心公共布局。 */
definePageMeta({
  name: 'member-orders',
  path: '/member/orders',
  layout: 'member',
  requiresAuth: true,
})

useHead({ title: '我的订单 - 管管商城' })

/** 状态标签先按需求文档展示，接口开放前保持禁用。 */
const statusTabs = ['全部订单', '待付款', '已付款', '已发货', '已完成', '已取消'] as const

/** 页面筛选占位状态与订单服务能力探测结果。 */
const activeTab = ref<(typeof statusTabs)[number]>('全部订单')
const keyword = ref('')
const isLoading = ref(true)
const moduleStatus = ref<OrderModuleStatus>()
const serviceReachable = ref(false)

/** 只读取公开模块状态，不通过模拟数据或会员编号绕过尚未实现的订单接口。 */
async function loadModuleStatus(): Promise<void> {
  isLoading.value = true
  try {
    moduleStatus.value = await getOrderModuleStatus()
    serviceReachable.value = true
  } catch {
    serviceReachable.value = false
  } finally {
    isLoading.value = false
  }
}

/** 页面挂载时执行一次轻量服务能力探测。 */
onMounted(loadModuleStatus)
</script>

<template>
  <section class="orders-page">
    <header class="page-heading">
      <div>
        <span class="page-heading__eyebrow">ORDER CENTER</span>
        <h1>我的订单</h1>
        <p>查看订单状态、商品快照和配送信息</p>
      </div>
      <span class="service-status" :class="{ 'service-status--online': serviceReachable }">
        <i aria-hidden="true" />
        {{ serviceReachable ? '订单服务在线' : '订单服务未连接' }}
      </span>
    </header>

    <div class="orders-panel">
      <nav class="status-tabs" aria-label="订单状态筛选">
        <button
          v-for="item in statusTabs"
          :key="item"
          type="button"
          :class="{ active: activeTab === item }"
          :disabled="!moduleStatus?.implemented"
          @click="activeTab = item"
        >
          {{ item }}
        </button>
      </nav>

      <div class="orders-toolbar">
        <ElInput
          v-model="keyword"
          class="order-search"
          clearable
          disabled
          placeholder="订单号 / 商品名称"
          aria-label="搜索订单"
        />
        <ElButton disabled>搜索订单</ElButton>
      </div>

      <div v-if="isLoading" class="orders-loading">
        <ElSkeleton :rows="5" animated />
      </div>

      <div v-else class="unavailable-state">
        <div class="unavailable-state__mark" aria-hidden="true">订</div>
        <template v-if="moduleStatus?.implemented">
          <h2>会员订单查询接口尚未接入</h2>
          <p>订单服务已标记为可用，但当前前端尚未取得会员订单列表协议。</p>
        </template>
        <template v-else>
          <h2>订单查询服务正在建设中</h2>
          <p>
            当前后端只提供订单模块状态与健康检查，尚未实现按登录会员隔离的订单列表、详情和状态操作。
            为保护会员数据，本页不会使用模拟订单或客户端传入会员编号。
          </p>
        </template>

        <div class="unavailable-state__facts">
          <span><strong>5</strong>已定义订单状态</span>
          <span><strong>0</strong>可用会员订单接口</span>
          <span><strong>安全</strong>不展示跨会员数据</span>
        </div>

        <NuxtLink to="/">先去商城逛逛</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.orders-page {
  display: grid;
  gap: 16px;
}

.page-heading {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  min-height: 116px;
  padding: 24px 28px;
  background:
    linear-gradient(110deg, rgb(255 255 255 / 100%), rgb(246 250 255 / 94%)),
    var(--mall-color-surface);
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
}

.page-heading__eyebrow {
  color: var(--mall-color-primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.service-status {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  color: #8b6470;
  font-size: 12px;
  background: #fff4f5;
  border-radius: 999px;

  i {
    width: 7px;
    height: 7px;
    background: var(--mall-color-danger);
    border-radius: 50%;
  }
}

.service-status--online {
  color: #287653;
  background: #edf9f3;

  i {
    background: var(--mall-color-success);
  }
}

.orders-panel {
  min-height: 480px;
  background: var(--mall-color-surface);
  border: 1px solid var(--mall-color-border);
  border-radius: var(--mall-radius-large);
  box-shadow: var(--mall-shadow-card);
}

.status-tabs {
  display: flex;
  gap: 30px;
  min-height: 55px;
  padding: 0 26px;
  overflow-x: auto;
  border-bottom: 1px solid var(--mall-color-border);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    position: relative;
    flex: 0 0 auto;
    padding: 0 3px;
    color: #5c687a;
    font-size: 13px;
    background: none;
    border: 0;

    &.active {
      color: var(--mall-color-primary);
      font-weight: 700;

      &::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 3px;
        background: var(--mall-color-primary);
        border-radius: 999px 999px 0 0;
        content: '';
      }
    }
  }
}

.orders-toolbar {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px;
  background: #fbfcfe;
  border-bottom: 1px solid #edf0f4;
}

.order-search {
  width: min(320px, 100%);
}

.orders-loading {
  padding: 36px;
}

.unavailable-state {
  display: grid;
  justify-items: center;
  max-width: 660px;
  padding: 64px 24px 72px;
  margin: 0 auto;
  text-align: center;

  h2 {
    margin: 20px 0 10px;
    color: var(--mall-color-text);
    font-size: 22px;
  }

  > p {
    margin: 0;
    color: var(--mall-color-muted);
    font-size: 13px;
    line-height: 1.9;
  }

  > a {
    display: grid;
    place-items: center;
    min-width: 142px;
    height: 40px;
    margin-top: 28px;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    background: var(--mall-color-primary);
    border-radius: 5px;
  }
}

.unavailable-state__mark {
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  color: var(--mall-color-primary);
  font-size: 24px;
  font-weight: 800;
  background: var(--mall-color-primary-light);
  border: 8px solid #f4f8ff;
  border-radius: 50%;
}

.unavailable-state__facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: min(520px, 100%);
  margin-top: 28px;
  border: 1px solid var(--mall-color-border);
  border-radius: 8px;

  span {
    display: grid;
    gap: 5px;
    padding: 14px 8px;
    color: var(--mall-color-muted);
    font-size: 10px;
    border-right: 1px solid var(--mall-color-border);

    &:last-child {
      border-right: 0;
    }
  }

  strong {
    color: var(--mall-color-text);
    font-size: 15px;
  }
}

@media (max-width: 640px) {
  .page-heading {
    align-items: flex-start;
    padding: 20px;
  }

  .service-status {
    font-size: 0;

    i {
      width: 9px;
      height: 9px;
    }
  }

  .status-tabs {
    gap: 20px;
    padding: 0 18px;
  }

  .orders-toolbar {
    padding: 13px;
  }

  .unavailable-state {
    padding: 44px 18px 54px;
  }

  .unavailable-state__facts {
    grid-template-columns: 1fr;

    span {
      border-right: 0;
      border-bottom: 1px solid var(--mall-color-border);

      &:last-child {
        border-bottom: 0;
      }
    }
  }
}
</style>
