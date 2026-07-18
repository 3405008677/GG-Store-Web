<script setup lang="ts">
/** 首页活动卡片。 */
interface ActivityCard {
  eyebrow: string
  title: string
  description: string
  action: string
  to: string
  theme: 'blue' | 'orange' | 'cyan' | 'purple'
}

/** 活动专区使用不同色彩区分采购场景。 */
const activityCards: readonly ActivityCard[] = [
  { eyebrow: 'AVAILABLE NOW', title: '全部可售商品', description: '查看当前已上架且存在可售 SKU 的商品', action: '立即浏览', to: '/products', theme: 'blue' },
  { eyebrow: 'NEW ARRIVALS', title: '最新上架', description: '按 Catalog 服务的上架时间查看新品', action: '查看新品', to: '/products?sort=3', theme: 'orange' },
  { eyebrow: 'BRAND DIRECTORY', title: '品牌专区', description: '使用后端启用品牌快速筛选商品', action: '选择品牌', to: '/#brands', theme: 'cyan' },
  { eyebrow: 'SEARCH RANKING', title: '搜索热榜', description: '查看真实商品选择累计形成的排行榜', action: '查看热榜', to: '/products', theme: 'purple' },
]
</script>

<template>
  <section id="activities" class="content-section">
    <div class="page-container">
      <header class="section-heading">
        <div>
          <span>POPULAR ACTIVITIES</span>
          <h2>热门活动专区</h2>
        </div>
        <p>所有入口均由当前 Catalog、Cart 与会员接口提供数据</p>
      </header>

      <div class="activity-grid">
        <article v-for="item in activityCards" :key="item.title" class="activity-card" :class="`activity-card--${item.theme}`">
          <span>{{ item.eyebrow }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <NuxtLink :to="item.to">{{ item.action }} <span>→</span></NuxtLink>
          <div class="activity-card__decoration" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.page-container {
  width: min(var(--mall-content-max, 1800px), calc(100% - var(--mall-page-gutter, 64px)));
  margin: 0 auto;
}

.content-section {
  padding: 42px 0 0;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;

  > div:first-child {
    display: grid;
    gap: 4px;
  }

  > div:first-child > span {
    color: var(--mall-primary);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 0;
    color: #26344a;
    font-size: 24px;
    letter-spacing: -0.02em;
  }

  > p {
    margin: 0;
    color: #98a1ad;
    font-size: 12px;
  }
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.activity-card {
  --activity-color: #1768d7;
  --activity-light: #ecf5ff;

  position: relative;
  min-height: 168px;
  padding: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #fff, var(--activity-light));
  border: 1px solid color-mix(in srgb, var(--activity-color) 18%, #e6eaf0);
  border-radius: 5px;
  transition: transform 180ms ease, box-shadow 180ms ease;

  &:hover {
    box-shadow: 0 14px 30px rgb(37 58 89 / 9%);
    transform: translateY(-3px);
  }

  > span {
    color: var(--activity-color);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h3 {
    position: relative;
    z-index: 2;
    margin: 9px 0 8px;
    color: #2a374b;
    font-size: 18px;
  }

  p {
    position: relative;
    z-index: 2;
    margin: 0 0 18px;
    color: #84909f;
    font-size: 11px;
  }

  > a {
    position: relative;
    z-index: 2;
    color: var(--activity-color);
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
  }
}

.activity-card--orange {
  --activity-color: #e37a1a;
  --activity-light: #fff5e9;
}

.activity-card--cyan {
  --activity-color: #168e9c;
  --activity-light: #eafafb;
}

.activity-card--purple {
  --activity-color: #7254c8;
  --activity-light: #f4f0ff;
}

.activity-card__decoration {
  position: absolute;
  right: -17px;
  bottom: -23px;
  width: 116px;
  height: 116px;
  border: 18px solid color-mix(in srgb, var(--activity-color) 9%, transparent);
  border-radius: 50%;

  i {
    position: absolute;
    width: 13px;
    height: 13px;
    background: var(--activity-color);
    border-radius: 3px;
    opacity: 0.26;
    transform: rotate(34deg);

    &:first-child {
      top: 11px;
      left: -23px;
    }

    &:nth-child(2) {
      top: -23px;
      left: 32px;
    }

    &:last-child {
      right: 3px;
      bottom: 10px;
    }
  }
}

@media (max-width: 1120px) {
  .activity-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 780px) {
  .section-heading {
    align-items: flex-start;

    > p {
      display: none;
    }
  }
}

@media (max-width: 560px) {
  .activity-grid {
    grid-template-columns: 1fr;
  }

  .content-section {
    padding-top: 34px;
  }
}
</style>
