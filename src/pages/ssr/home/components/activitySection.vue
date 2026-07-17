<script setup lang="ts">
/** 首页活动卡片。 */
interface ActivityCard {
  eyebrow: string
  title: string
  description: string
  action: string
  theme: 'blue' | 'orange' | 'cyan' | 'purple'
}

/** 活动专区使用不同色彩区分采购场景。 */
const activityCards: readonly ActivityCard[] = [
  { eyebrow: 'SPOT GOODS', title: '现货特惠专区', description: '精选常用物料，阶梯价格更省', action: '立即选购', theme: 'blue' },
  { eyebrow: 'NEW CUSTOMER', title: '新人采购礼包', description: '注册即领优惠券与免邮权益', action: '领取礼包', theme: 'orange' },
  { eyebrow: 'STOCK SERVICE', title: '长期备货计划', description: '稳定供货，按需分批提货', action: '提交需求', theme: 'cyan' },
  { eyebrow: 'INDUSTRIAL', title: '工业品爆款', description: '工具、仪表、自动化一站购齐', action: '查看专区', theme: 'purple' },
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
        <p>覆盖现货特惠、新客权益、备货与工业品采购场景</p>
      </header>

      <div class="activity-grid">
        <article v-for="item in activityCards" :key="item.title" class="activity-card" :class="`activity-card--${item.theme}`">
          <span>{{ item.eyebrow }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <a href="#products">{{ item.action }} <span>→</span></a>
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
  width: min(1280px, calc(100% - 40px));
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
  .page-container {
    width: min(1280px, calc(100% - 24px));
  }

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
