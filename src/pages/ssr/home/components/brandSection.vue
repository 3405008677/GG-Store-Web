<script setup lang="ts">
/** 品牌名称仅用于首页视觉占位，真实品牌列表后续由商品服务返回。 */
const brands = ['ST', 'NXP', 'TI', 'MPS', 'Nordic', 'ESPRESSIF', 'PANASONIC', 'EPSON', 'BOURNS', 'EVERLIGHT', 'SUNLORD', 'YAGEO'] as const
</script>

<template>
  <section id="brands" class="content-section content-section--white">
    <div class="page-container">
      <header class="section-heading">
        <div>
          <span>AUTHORIZED BRANDS</span>
          <h2>品牌专区</h2>
        </div>
        <a href="#brands">查看更多品牌 <span>→</span></a>
      </header>

      <div class="brand-grid">
        <a v-for="(brand, index) in brands" :key="brand" href="#products" class="brand-card">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ brand }}</strong>
          <small>品牌现货专区</small>
        </a>
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

.content-section--white {
  padding-bottom: 42px;
  margin-top: 44px;
  background: #fff;
  border-top: 1px solid #ebedf2;
  border-bottom: 1px solid #ebedf2;
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

  > a {
    color: #7f8998;
    font-size: 12px;
    text-decoration: none;
  }
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  border-top: 1px solid var(--mall-border);
  border-left: 1px solid var(--mall-border);
}

.brand-card {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 104px;
  color: #36455b;
  text-decoration: none;
  border-right: 1px solid var(--mall-border);
  border-bottom: 1px solid var(--mall-border);
  transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease;

  &:hover {
    z-index: 2;
    color: var(--mall-primary);
    background: #f8fbff;
    box-shadow: 0 10px 24px rgb(43 67 99 / 8%);
  }

  > span {
    position: absolute;
    top: 9px;
    left: 10px;
    color: #d6dbe2;
    font-size: 8px;
  }

  strong {
    margin-top: 10px;
    font-size: clamp(14px, 1.5vw, 20px);
    letter-spacing: 0.02em;
  }

  small {
    margin-top: -12px;
    color: #a2a9b3;
    font-size: 9px;
  }
}

@media (max-width: 1120px) {
  .brand-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 780px) {
  .page-container {
    width: min(1280px, calc(100% - 24px));
  }

  .section-heading {
    align-items: flex-start;
  }

  .brand-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 560px) {
  .content-section {
    padding-top: 34px;
  }

  .content-section--white {
    margin-top: 34px;
  }

  .brand-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
