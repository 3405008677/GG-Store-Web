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
  links: readonly string[]
}

/** 商城核心履约能力，用于所有页面共用的页尾信任背书。 */
const servicePromises: readonly ServicePromise[] = [
  { icon: '现', title: '海量现货', description: '自营库存，品类持续扩充' },
  { icon: '快', title: '闪电发货', description: '智能仓储，高效履约' },
  { icon: '真', title: '严控渠道', description: '正品保障，物料可追溯' },
  { icon: '省', title: '降低成本', description: '明码标价，一站式采购' },
]

/** 参考元器件商城常见的信息架构组织帮助入口。 */
const linkGroups: readonly FooterLinkGroup[] = [
  { title: '购物指南', links: ['顾客必读', '购物流程', '商品搜索', '会员权益', '优惠券规则'] },
  { title: '支付配送', links: ['在线支付', '对公转账', '发票须知', '快递运输', '上门自提'] },
  { title: '特色服务', links: ['BOM 配单', '免费备货', '订单跟踪', '样品申请', '企业采购'] },
  { title: '售后服务', links: ['验货与售后', '质量保证', '退换货说明', '服务投诉', '意见反馈'] },
  { title: '关于我们', links: ['关于管管', '联系我们', '供应商合作', '人才招聘', '隐私政策'] },
]

/** 产业服务入口当前用于展示页尾结构，后续可替换为真实外部链接。 */
const partnerSites = ['电子元器件', '工业品商城', 'PCB 智造', 'SMT 贴片', 'EDA 设计', '开放平台'] as const
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
            <a v-for="item in group.links" :key="item" href="#footer-contact">{{ item }}</a>
          </section>
        </nav>

        <aside class="contact-card">
          <div>
            <p class="contact-card__label">采购服务热线</p>
            <strong class="contact-card__phone">400-080-0709</strong>
            <p>工作日 8:30–18:30</p>
            <p>节假日 9:00–18:00</p>
          </div>
          <div class="qr-code" aria-label="管管商城公众号二维码占位图">
            <span>GG</span>
          </div>
          <small>关注管管商城公众号</small>
        </aside>
      </div>
    </section>

    <section class="partner-bar">
      <div class="footer-container partner-bar__inner">
        <span>产业服务：</span>
        <a v-for="item in partnerSites" :key="item" href="#footer-contact">{{ item }}</a>
      </div>
    </section>

    <section class="copyright">
      <div class="footer-container copyright__inner">
        <p>© 2026 管管商城 版权所有</p>
        <p>互联网信息服务备案号：粤ICP备00000000号 · 粤公网安备 00000000000000号</p>
        <p>页面为商城前端模板，备案与服务信息上线前请替换为真实内容</p>
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
  width: min(1280px, calc(100% - 40px));
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
  grid-template-columns: repeat(5, minmax(90px, 1fr));
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 7px 18px;
  align-items: center;
  padding-left: 34px;
  border-left: 1px solid #e3e7ed;

  p {
    margin: 4px 0;
    color: #8b95a4;
    font-size: 12px;
  }

  small {
    grid-column: 2;
    color: #778292;
    font-size: 11px;
    text-align: center;
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

.qr-code {
  position: relative;
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  overflow: hidden;
  color: #1768d7;
  font-size: 15px;
  font-weight: 900;
  background:
    linear-gradient(90deg, #26364e 7px, transparent 7px) 0 0 / 17px 17px,
    linear-gradient(#26364e 7px, transparent 7px) 0 0 / 17px 17px,
    #fff;
  border: 6px solid #fff;
  box-shadow: 0 0 0 1px #dfe4eb;

  span {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    background: #fff;
    border: 2px solid #1768d7;
  }
}

.partner-bar {
  color: #8b95a4;
  font-size: 12px;
  background: #f5f6f8;
  border-top: 1px solid #e6e9ee;
  border-bottom: 1px solid #e6e9ee;
}

.partner-bar__inner {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: center;
  min-height: 50px;

  a {
    color: #697586;
    text-decoration: none;

    &:hover {
      color: #1768d7;
    }
  }
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
    grid-template-columns: 1fr 88px;
    max-width: 360px;
    padding: 24px 0 0;
    border-top: 1px solid #e3e7ed;
    border-left: 0;
  }
}

@media (max-width: 680px) {
  .footer-container {
    width: min(1280px, calc(100% - 28px));
  }

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

  .partner-bar__inner {
    padding: 14px 0;
  }
}
</style>
