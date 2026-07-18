<script setup lang="ts">
import type { PublicProductListItemResponse } from '@/api/catalog/types'

const props = withDefaults(
  defineProps<{
    products?: readonly PublicProductListItemResponse[]
  }>(),
  {
    products: () => [],
  },
)

function formatPriceRange(product: PublicProductListItemResponse): string {
  const minimum = product.minimumPrice.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  })
  if (product.maximumPrice === product.minimumPrice) return minimum
  const maximum = product.maximumPrice.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  })
  return `${minimum} – ${maximum}`
}
</script>

<template>
  <section id="new-products" class="content-section product-section">
    <div id="products" class="page-container">
      <header class="section-heading">
        <div>
          <span>RECOMMENDED PRODUCTS</span>
          <h2>最新可售商品</h2>
        </div>
        <div class="section-tabs" aria-label="商品推荐分类">
          <NuxtLink class="is-active" :to="{ path: '/products', query: { sort: 3 } }">新品上架</NuxtLink>
          <NuxtLink :to="{ path: '/products', query: { sort: 1 } }">价格从低到高</NuxtLink>
          <NuxtLink to="/products">全部商品</NuxtLink>
        </div>
      </header>

      <div v-if="props.products.length" class="product-grid">
        <NuxtLink
          v-for="product in props.products"
          :key="product.productId"
          :to="`/products/${product.productId}`"
          class="product-card"
        >
          <div class="product-card__visual">
            <span class="product-card__badge">{{ product.categoryName }}</span>
            <img
              v-if="product.mainImage"
              :src="product.mainImage"
              :alt="product.name"
              loading="lazy"
              decoding="async"
            />
            <strong v-else aria-hidden="true">GG</strong>
          </div>
          <div class="product-card__content">
            <h3>{{ product.name }}</h3>
            <p>{{ product.subtitle || product.brandName || product.merchantName }}</p>
            <div class="product-card__meta">
              <span>{{ product.availableSkuCount }} 种 SKU</span>
              <strong>{{ formatPriceRange(product) }}</strong>
            </div>
          </div>
        </NuxtLink>
      </div>
      <div v-else class="product-empty">
        <strong>暂无可售商品</strong>
        <span>商品目录没有返回符合公开销售条件的数据。</span>
        <NuxtLink to="/products">重新浏览商品目录</NuxtLink>
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
}

.product-section {
  padding-top: 46px;
}

.section-tabs {
  display: flex;
  gap: 5px;

  a {
    display: grid;
    place-items: center;
    min-height: 32px;
    padding: 0 14px;
    color: #788494;
    font-size: 11px;
    text-decoration: none;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;

    &.is-active {
      color: var(--mall-primary);
      background: #edf5ff;
      border-color: #cfe2f8;
    }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: #fff;
  border-top: 1px solid var(--mall-border);
  border-left: 1px solid var(--mall-border);
}

.product-card {
  display: block;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  background: #fff;
  border-right: 1px solid var(--mall-border);
  border-bottom: 1px solid var(--mall-border);
  transition: box-shadow 180ms ease, transform 180ms ease;

  &:hover {
    z-index: 2;
    box-shadow: 0 14px 34px rgb(42 62 89 / 11%);
    transform: translateY(-3px);
  }
}

.product-card__visual {
  position: relative;
  display: grid;
  place-items: center;
  height: 190px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgb(23 104 215 / 10%), transparent 48%),
    linear-gradient(145deg, #fbfcfe, #f2f5f9);

  &::after {
    position: absolute;
    right: 13px;
    bottom: 12px;
    width: 42px;
    height: 42px;
    border: 1px solid rgb(23 104 215 / 18%);
    border-radius: 50%;
    content: '';
  }
}

.product-card__badge {
  position: absolute;
  top: 13px;
  left: 13px;
  padding: 4px 7px;
  color: var(--mall-primary);
  font-size: 9px;
  background: #edf5ff;
  border-radius: 2px;
}

.product-card__visual img {
  width: 82%;
  height: 82%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.product-card__visual > strong {
  color: #7f96b5;
  font-size: 30px;
}

.product-shape {
  position: relative;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 850;
  background: linear-gradient(145deg, color-mix(in srgb, var(--product-tone) 84%, #111), var(--product-tone));
  box-shadow: 0 17px 27px color-mix(in srgb, var(--product-tone) 24%, transparent);

  span {
    font-size: 12px;
    letter-spacing: 0.08em;
  }
}

.product-shape--chip {
  width: 82px;
  height: 82px;
  border: 8px solid #293544;
  border-radius: 5px;
  box-shadow:
    -18px 0 0 -14px #9ba4ae,
    18px 0 0 -14px #9ba4ae,
    0 -18px 0 -14px #9ba4ae,
    0 18px 0 -14px #9ba4ae,
    0 17px 27px color-mix(in srgb, var(--product-tone) 24%, transparent);
}

.product-shape--board {
  width: 112px;
  height: 76px;
  border: 7px solid color-mix(in srgb, var(--product-tone) 70%, #fff);
  border-radius: 7px;
  transform: rotate(-5deg);

  &::before,
  &::after {
    position: absolute;
    width: 14px;
    height: 14px;
    background: #d9e4eb;
    border: 3px solid #4e5c6a;
    border-radius: 50%;
    content: '';
  }

  &::before {
    top: 7px;
    left: 8px;
  }

  &::after {
    right: 8px;
    bottom: 7px;
  }
}

.product-shape--sensor {
  width: 76px;
  height: 76px;
  color: var(--product-tone);
  background: #e9edf2;
  border: 9px solid #ccd3dc;
  border-radius: 8px;

  &::before {
    position: absolute;
    inset: 18px;
    border: 3px dotted var(--product-tone);
    content: '';
  }
}

.product-shape--connector {
  width: 112px;
  height: 54px;
  background: linear-gradient(#919ca9, #d2d8df 35%, #687786);
  border: 5px solid #536171;
  border-radius: 24px 24px 10px 10px;

  &::before {
    position: absolute;
    inset: 12px 21px;
    background: #263442;
    border-radius: 14px;
    content: '';
  }

  span {
    z-index: 2;
    font-size: 9px;
  }
}

.product-card__content {
  padding: 17px 16px 18px;

  h3 {
    margin: 0 0 7px;
    overflow: hidden;
    color: #354257;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  > p {
    margin: 0 0 14px;
    color: #8c96a4;
    font-size: 10px;
  }
}

.product-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;

  span {
    color: #91a09a;
    font-size: 9px;
  }

  strong {
    max-width: 70%;
    color: #ee553a;
    font-size: 12px;
    text-align: right;
  }
}

.product-empty {
  display: grid;
  gap: 7px;
  place-items: center;
  min-height: 210px;
  color: var(--mall-muted);
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--mall-border);

  strong {
    color: var(--mall-text);
    font-size: 16px;
  }

  a {
    margin-top: 8px;
    color: var(--mall-primary);
  }
}

@media (max-width: 1120px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .product-card:nth-child(n + 4) {
    display: none;
  }
}

@media (max-width: 780px) {
  .section-heading {
    align-items: flex-start;

    .section-tabs {
      display: none;
    }
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .product-card:nth-child(3) {
    display: none;
  }
}

@media (max-width: 560px) {
  .content-section {
    padding-top: 34px;
  }

  .product-grid {
    grid-template-columns: 1fr;
  }

  .product-card:nth-child(2) {
    display: none;
  }

  .product-card {
    display: grid;
    grid-template-columns: 42% 58%;
  }

  .product-card__visual {
    height: 168px;
  }

  .product-card__content {
    align-self: center;
  }
}
</style>
