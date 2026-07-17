<script setup lang="ts">
/** 首页推荐商品占位数据。 */
interface ProductCard {
  category: string
  title: string
  model: string
  stock: string
  price: string
  mark: string
  tone: string
  shape: 'chip' | 'board' | 'sensor' | 'connector'
}

/** 推荐商品为首页模板数据，接入商品 API 后应替换为服务端响应。 */
const products: readonly ProductCard[] = [
  {
    category: '微控制器',
    title: '32 位高性能微控制器',
    model: 'GG32F103C8T6',
    stock: '现货 12,680',
    price: '¥8.60 起',
    mark: 'MCU',
    tone: '#2677de',
    shape: 'chip',
  },
  {
    category: '电源管理',
    title: '同步降压转换芯片',
    model: 'GGP1584EN',
    stock: '现货 8,240',
    price: '¥1.28 起',
    mark: 'DC',
    tone: '#654fd4',
    shape: 'chip',
  },
  {
    category: '开发板',
    title: '低功耗蓝牙开发板',
    model: 'GG-NRF52840-DEV',
    stock: '现货 1,120',
    price: '¥69.00 起',
    mark: 'BLE',
    tone: '#168d84',
    shape: 'board',
  },
  {
    category: '传感器',
    title: '数字温湿度传感器',
    model: 'GG-SHT40',
    stock: '现货 5,360',
    price: '¥12.80 起',
    mark: 'SEN',
    tone: '#e48b23',
    shape: 'sensor',
  },
  {
    category: '连接器',
    title: 'Type-C 16Pin 母座',
    model: 'GG-TYPEC-16P',
    stock: '现货 26,400',
    price: '¥0.48 起',
    mark: 'USB',
    tone: '#4c647f',
    shape: 'connector',
  },
]
</script>

<template>
  <section id="new-products" class="content-section product-section">
    <div id="products" class="page-container">
      <header class="section-heading">
        <div>
          <span>RECOMMENDED PRODUCTS</span>
          <h2>新品与爆款推荐</h2>
        </div>
        <div class="section-tabs" aria-label="商品推荐分类">
          <button class="is-active" type="button">精选推荐</button>
          <button type="button">新品上架</button>
          <button type="button">开发板</button>
          <button type="button">工业品</button>
        </div>
      </header>

      <div class="product-grid">
        <article v-for="product in products" :key="product.model" class="product-card">
          <div class="product-card__visual" :style="{ '--product-tone': product.tone }">
            <span class="product-card__badge">{{ product.category }}</span>
            <div class="product-shape" :class="`product-shape--${product.shape}`">
              <span>{{ product.mark }}</span>
            </div>
          </div>
          <div class="product-card__content">
            <h3>{{ product.title }}</h3>
            <p>{{ product.model }}</p>
            <div class="product-card__meta">
              <span>{{ product.stock }}</span>
              <strong>{{ product.price }}</strong>
            </div>
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
}

.product-section {
  padding-top: 46px;
}

.section-tabs {
  display: flex;
  gap: 5px;

  button {
    min-height: 32px;
    padding: 0 14px;
    color: #788494;
    font-size: 11px;
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
  min-width: 0;
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
  --product-tone: #1768d7;

  position: relative;
  display: grid;
  place-items: center;
  height: 190px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--product-tone) 11%, transparent), transparent 48%),
    linear-gradient(145deg, #fbfcfe, #f2f5f9);

  &::after {
    position: absolute;
    right: 13px;
    bottom: 12px;
    width: 42px;
    height: 42px;
    border: 1px solid color-mix(in srgb, var(--product-tone) 18%, transparent);
    border-radius: 50%;
    content: '';
  }
}

.product-card__badge {
  position: absolute;
  top: 13px;
  left: 13px;
  padding: 4px 7px;
  color: var(--product-tone);
  font-size: 9px;
  background: color-mix(in srgb, var(--product-tone) 9%, #fff);
  border-radius: 2px;
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
    color: #ee553a;
    font-size: 15px;
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
