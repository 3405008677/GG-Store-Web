<script setup lang="ts">
/** 显式组件名便于 Vue DevTools 区分全站共用页尾与页面私有区块。 */
defineOptions({ name: 'MallFooter' })

/** 页尾服务保障项。 */
interface ServicePromise {
  icon: string
  title: string
  description: string
}

/** 页尾帮助导航分组。 */
interface FooterLinkGroup {
  title: string
  links: readonly { label: string; to: string }[]
}

/** 只描述当前后端已经提供的能力，不展示尚未兑现的履约承诺。 */
const servicePromises: readonly ServicePromise[] = [
  { icon: '录', title: '实时目录', description: '仅展示公开可售商品' },
  { icon: '价', title: '价格库存', description: '读取当前 SKU 快照' },
  { icon: '分', title: '分类管理', description: '购物车与收藏夹' },
  { icon: '安', title: '会话安全', description: '短效令牌与安全 Cookie' },
]

/** 页尾导航全部对应当前存在的真实页面。 */
const linkGroups: readonly FooterLinkGroup[] = [
  {
    title: '商品目录',
    links: [
      { label: '全部商品', to: '/products' },
      { label: '最新上架', to: '/products?sort=3' },
      { label: '品牌专区', to: '/#brands' },
      { label: '搜索热榜', to: '/products' },
    ],
  },
  {
    title: '会员中心',
    links: [
      { label: '个人资料', to: '/member/profile' },
      { label: '收货地址', to: '/member/addresses' },
      { label: '账户安全', to: '/member/security' },
      { label: '订单状态', to: '/member/orders' },
    ],
  },
  {
    title: '采购管理',
    links: [
      { label: '购物车', to: '/cart' },
      { label: '我的收藏', to: '/member/favorites' },
      { label: '会员登录', to: '/login' },
      { label: '免费注册', to: '/register' },
    ],
  },
]
</script>

<template>
  <footer id="footer-contact" class="mall-footer">
    <section class="promise-strip" aria-label="商城服务保障">
      <div class="footer-container promise-strip__inner">
        <article v-for="item in servicePromises" :key="item.title" class="promise-item">
          <span class="promise-item__icon" aria-hidden="true">{{ item.icon }}</span>
          <span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.description }}</small>
          </span>
        </article>
      </div>
    </section>

    <section class="footer-main">
      <div class="footer-container footer-main__inner">
        <nav class="footer-links" aria-label="商城帮助导航">
          <section v-for="group in linkGroups" :key="group.title" class="footer-group">
            <h2>{{ group.title }}</h2>
            <NuxtLink v-for="item in group.links" :key="item.to" :to="item.to">
              {{ item.label }}
            </NuxtLink>
          </section>
        </nav>

        <aside class="contact-card">
          <div>
            <p class="contact-card__label">当前服务范围</p>
            <strong class="contact-card__phone">真实接口驱动</strong>
            <p>商品、会员、购物车与收藏夹已接入</p>
            <p>订单、支付和售后业务接口尚未开放</p>
          </div>
        </aside>
      </div>
    </section>

    <section class="copyright">
      <div class="footer-container copyright__inner">
        <p>© 2026 管管商城 版权所有</p>
        <p>页面能力以后端当前公开控制器和响应契约为准</p>
      </div>
    </section>
  </footer>
</template>

<style lang="scss" scoped>
.mall-footer {
  color: #596579;
  background: #fff;
  border-top: 1px solid #e9edf3;
}

.footer-container {
  width: min(var(--mall-content-max, 1800px), calc(100% - var(--mall-page-gutter, 64px)));
  margin: 0 auto;
}

.promise-strip {
  border-bottom: 1px solid #e9edf3;
}

.promise-strip__inner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 30px 0;
}

.promise-item {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border-right: 1px solid #e8ebf0;

  &:last-child {
    border-right: 0;
  }

  > span:last-child {
    display: grid;
    gap: 4px;
  }

  strong {
    color: #28364b;
    font-size: 17px;
  }

  small {
    color: #8b95a4;
    font-size: 12px;
  }
}

.promise-item__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  color: #1768d7;
  font-size: 17px;
  font-weight: 800;
  background: #eef6ff;
  border: 1px solid #cfe3fb;
  border-radius: 50%;
}

.footer-main {
  background: #fafbfc;
}

.footer-main__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 282px;
  gap: 52px;
  padding: 42px 0 38px;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 28px;
}

.footer-group {
  display: flex;
  flex-direction: column;
  gap: 11px;

  h2 {
    margin: 0 0 6px;
    color: #28364b;
    font-size: 15px;
  }

  a {
    color: #788393;
    font-size: 12px;
    text-decoration: none;
    transition: color 160ms ease;

    &:hover {
      color: #1768d7;
    }
  }
}

.contact-card {
  display: flex;
  align-items: center;
  padding-left: 34px;
  border-left: 1px solid #e3e7ed;

  p {
    margin: 4px 0;
    color: #8b95a4;
    font-size: 12px;
  }

}

.contact-card__label {
  color: #606c7c !important;
}

.contact-card__phone {
  display: block;
  margin: 7px 0 10px;
  color: #1768d7;
  font-size: 22px;
  letter-spacing: 0.01em;
}

.copyright {
  color: #9aa2ae;
  font-size: 12px;
  text-align: center;
  background: #f5f6f8;
}

.copyright__inner {
  padding: 18px 0 26px;

  p {
    margin: 5px 0;
  }
}

@media (max-width: 980px) {
  .promise-strip__inner {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 24px;
  }

  .promise-item:nth-child(2) {
    border-right: 0;
  }

  .footer-main__inner {
    grid-template-columns: 1fr;
  }

  .contact-card {
    max-width: 360px;
    padding: 24px 0 0;
    border-top: 1px solid #e3e7ed;
    border-left: 0;
  }
}

@media (max-width: 680px) {
  .promise-strip__inner {
    gap: 20px 0;
  }

  .promise-item {
    justify-content: flex-start;
    padding: 0 12px;

    strong {
      font-size: 14px;
    }

    small {
      display: none;
    }
  }

  .promise-item__icon {
    width: 38px;
    height: 38px;
    font-size: 14px;
  }

  .footer-links {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-group:last-child {
    display: none;
  }

}
</style>
