<template>
  <section id="bom-service" class="bom-section">
    <div class="page-container bom-card">
      <div>
        <span>LIVE PRODUCT CATALOG</span>
        <h2>浏览当前真实可售商品</h2>
        <p>目录、SKU 价格和库存均来自 Catalog 服务，结算能力开放前不会创建模拟订单。</p>
      </div>
      <NuxtLink to="/products">进入商品目录</NuxtLink>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.page-container {
  width: min(var(--mall-content-max, 1800px), calc(100% - var(--mall-page-gutter, 64px)));
  margin: 0 auto;
}

.bom-section {
  padding: 48px 0;
}

.bom-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 150px;
  padding: 30px 52px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 82% 50%, rgb(95 207 255 / 24%), transparent 26%),
    linear-gradient(115deg, #103f89, #1768d7 58%, #188ed3);
  border-radius: 6px;

  &::after {
    position: absolute;
    right: 17%;
    width: 120px;
    height: 120px;
    border: 24px solid rgb(255 255 255 / 7%);
    border-radius: 50%;
    content: '';
  }

  > div {
    position: relative;
    z-index: 2;
  }

  span {
    color: #9fdcff;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 7px 0 9px;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: rgb(239 248 255 / 72%);
    font-size: 12px;
  }

  a {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    min-width: 148px;
    height: 44px;
    color: var(--mall-primary-dark);
    font-weight: 700;
    text-decoration: none;
    background: #fff;
    border: 0;
    border-radius: 4px;
    box-shadow: 0 10px 22px rgb(6 47 110 / 18%);
    transition: transform 180ms ease, box-shadow 180ms ease;
    cursor: pointer;

    &:hover {
      box-shadow: 0 14px 28px rgb(6 47 110 / 24%);
      transform: translateY(-2px);
    }
  }
}

@media (max-width: 780px) {
  .bom-card {
    align-items: flex-start;
    padding: 28px;

    p {
      max-width: 72%;
    }

    a {
      position: absolute;
      right: 26px;
      bottom: 26px;
      min-width: 128px;
    }
  }
}

@media (max-width: 560px) {
  .bom-card {
    display: grid;
    gap: 22px;

    h2 {
      font-size: 20px;
    }

    p {
      max-width: none;
      line-height: 1.6;
    }

    a {
      position: relative;
      right: auto;
      bottom: auto;
      justify-self: start;
    }
  }
}
</style>
