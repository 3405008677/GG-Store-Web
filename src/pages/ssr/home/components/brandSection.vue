<script setup lang="ts">
import type { ProductBrandSelectItemResponse } from '@/api/catalog/types'

const props = withDefaults(
  defineProps<{
    brands?: readonly ProductBrandSelectItemResponse[]
  }>(),
  {
    brands: () => [],
  },
)

const visibleBrands = computed(() => props.brands.slice(0, 12))
</script>

<template>
  <section id="brands" class="content-section content-section--white">
    <div class="page-container">
      <header class="section-heading">
        <div>
          <span>AVAILABLE BRANDS</span>
          <h2>品牌专区</h2>
        </div>
        <NuxtLink to="/products">查看更多品牌 <span>→</span></NuxtLink>
      </header>

      <div v-if="visibleBrands.length" class="brand-grid">
        <NuxtLink
          v-for="(brand, index) in visibleBrands"
          :key="brand.value"
          :to="{ path: '/products', query: { brandId: brand.value } }"
          class="brand-card"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <img
            v-if="brand.logoUrl"
            :src="brand.logoUrl"
            :alt="brand.label"
            loading="lazy"
            decoding="async"
          />
          <strong v-else>{{ brand.label }}</strong>
          <small>浏览品牌商品</small>
        </NuxtLink>
      </div>
      <div v-else class="brand-empty">品牌数据暂不可用，请稍后刷新。</div>
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
    background: var(--mall-color-primary-light);
    box-shadow: 0 10px 24px rgb(43 67 99 / 8%);
    transform: translateY(-2px);
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

  img {
    width: min(110px, 68%);
    height: 34px;
    margin-top: 8px;
    object-fit: contain;
  }

  small {
    margin-top: -12px;
    color: #a2a9b3;
    font-size: 9px;
  }
}

.brand-empty {
  display: grid;
  place-items: center;
  min-height: 104px;
  color: var(--mall-muted);
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--mall-border);
}

@media (max-width: 1120px) {
  .brand-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 780px) {
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
