<script setup lang="ts">
/** 首页商品分类展示项。 */
interface CategoryItem {
  mark: string
  title: string
  description: string
}

/** 首页快捷服务入口。 */
interface QuickService {
  icon: string
  title: string
  description: string
}

/** Banner 接口接入前使用的展示数据；接口返回后只需传入图片 URL。 */
interface BannerSlide {
  id: string
  eyebrow: string
  title: string
  highlight: string
  description: string
  theme: string
  imageUrl?: string
  alt?: string
}

/** 首页会员卡只接收展示名，认证状态与退出动作统一由页面和 User Store 管理。 */
const props = withDefaults(
  defineProps<{
    /** 空字符串表示游客，非空时展示会员欢迎信息。 */
    userName?: string
    /** Banner 接口一次返回的图片 URL，首页最多展示前 8 张。 */
    bannerUrls?: readonly string[]
  }>(),
  {
    userName: '',
    bannerUrls: () => [],
  },
)

/** 接口未接入时也保持完整的 8 屏轮播结构，后续图片 URL 会无缝替换这些占位内容。 */
const fallbackBanners: readonly BannerSlide[] = [
  {
    id: 'spot-stock',
    eyebrow: 'GG STORE · ONE-STOP PROCUREMENT',
    title: '正品现货',
    highlight: '一站式',
    description: '从电子元器件到工业用品，为研发、打样与量产提供稳定供应。',
    theme: 'blue',
  },
  {
    id: 'bom',
    eyebrow: 'SMART BOM MATCHING',
    title: 'BOM 智能配单',
    highlight: '快速齐套',
    description: '多型号集中询价，缩短找料时间，让批量采购更高效。',
    theme: 'cyan',
  },
  {
    id: 'original',
    eyebrow: 'AUTHORIZED SUPPLY',
    title: '原厂品质保障',
    highlight: '来源可溯',
    description: '严选供应渠道，覆盖常用品牌与核心品类。',
    theme: 'indigo',
  },
  {
    id: 'sample',
    eyebrow: 'R&D SAMPLE SERVICE',
    title: '研发样品专区',
    highlight: '小批量',
    description: '支持研发打样与小批量采购，灵活匹配项目节奏。',
    theme: 'violet',
  },
  {
    id: 'warehouse',
    eyebrow: 'STABLE INVENTORY',
    title: '现货库存直发',
    highlight: '交付更稳',
    description: '重点物料持续备货，提升项目交付确定性。',
    theme: 'teal',
  },
  {
    id: 'alternative',
    eyebrow: 'ALTERNATIVE PARTS',
    title: '替代料快速查询',
    highlight: '降本增效',
    description: '快速发现兼容型号，帮助采购应对缺货与停产风险。',
    theme: 'orange',
  },
  {
    id: 'enterprise',
    eyebrow: 'ENTERPRISE PROCUREMENT',
    title: '企业采购服务',
    highlight: '专属顾问',
    description: '为企业客户提供询报价、合同与对公采购支持。',
    theme: 'navy',
  },
  {
    id: 'industrial',
    eyebrow: 'INDUSTRIAL PRODUCTS',
    title: '工业品精选',
    highlight: '品类齐全',
    description: '工具、仪器与生产耗材，一站满足多场景采购需求。',
    theme: 'green',
  },
]

/** 有接口数据时仅使用接口图片；过滤空值并严格限制为 8 张。 */
const bannerSlides = computed<readonly BannerSlide[]>(() => {
  const urls = props.bannerUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 8)

  if (!urls.length) return fallbackBanners

  return urls.map((imageUrl, index) => ({
    id: `remote-banner-${index}`,
    eyebrow: '',
    title: '',
    highlight: '',
    description: '',
    theme: 'remote',
    imageUrl,
    alt: `管管商城首页 Banner ${index + 1}`,
  }))
})

const activeBannerIndex = ref(0)
const isCarouselPaused = ref(false)
let bannerTimer: ReturnType<typeof setInterval> | undefined

function goToBanner(index: number): void {
  const total = bannerSlides.value.length
  if (!total) return
  activeBannerIndex.value = (index + total) % total
}

function showPreviousBanner(): void {
  goToBanner(activeBannerIndex.value - 1)
}

function showNextBanner(): void {
  goToBanner(activeBannerIndex.value + 1)
}

function handleBannerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') showPreviousBanner()
  if (event.key === 'ArrowRight') showNextBanner()
}

watch(
  () => bannerSlides.value.length,
  () => {
    activeBannerIndex.value = 0
  },
)

onMounted(() => {
  bannerTimer = setInterval(() => {
    if (!isCarouselPaused.value) showNextBanner()
  }, 4500)
})

onBeforeUnmount(() => {
  if (bannerTimer) clearInterval(bannerTimer)
})

/** 左侧商品分类参考电子元器件商城的高频采购目录。 */
const categories: readonly CategoryItem[] = [
  { mark: 'RC', title: '电阻 / 电容 / 电感', description: '被动元件' },
  { mark: 'MC', title: '微控制器 / 处理器', description: 'MCU / MPU' },
  { mark: 'DT', title: '二极管 / 晶体管', description: '分立器件' },
  { mark: 'PM', title: '电源管理 / 电路保护', description: '电源芯片' },
  { mark: 'IC', title: '接口芯片 / 逻辑器件', description: '数字芯片' },
  { mark: 'CN', title: '连接器 / 端子 / 开关', description: '连接器件' },
  { mark: 'RF', title: '射频无线 / 通信模块', description: '无线连接' },
  { mark: 'OP', title: '光电器件 / 显示模块', description: 'LED / LCD' },
  { mark: 'XT', title: '晶体 / 振荡器 / 滤波器', description: '时钟器件' },
  { mark: 'SE', title: '传感器 / 隔离器件', description: '感知控制' },
  { mark: 'MM', title: '继电器 / 蜂鸣器 / 马达', description: '机电元件' },
  { mark: 'DV', title: '开发板 / 功能模块', description: '方案开发' },
  { mark: 'TL', title: '工具 / 仪器 / 耗材', description: '工业用品' },
]

/** Banner 下方的常用工具先以静态入口呈现，后续逐项接入对应模块。 */
const quickServices: readonly QuickService[] = [
  { icon: 'BOM', title: 'BOM 配单', description: '智能匹配物料' },
  { icon: '替', title: '替代料查询', description: '快速查找兼容型号' },
  { icon: '样', title: '样品申请', description: '新品免费申请' },
  { icon: '备', title: '免费备货', description: '降低库存压力' },
  { icon: '企', title: '企业采购', description: '专属采购服务' },
  { icon: 'API', title: '开放平台', description: '商品订单接口' },
]

/** 首页公告用于还原商城信息密度，后续由公告接口按发布时间加载。 */
const announcements = ['管管商城现货采购专区正式上线', '企业采购支持对公转账及专票', '关于暑期仓储发货时效的通知'] as const
</script>

<template>
  <section class="hero-section">
    <div class="page-container hero-grid">
      <aside class="category-panel" aria-label="商品分类">
        <a v-for="item in categories" :key="item.title" href="#products" class="category-item">
          <span class="category-item__mark">{{ item.mark }}</span>
          <span class="category-item__title">{{ item.title }}</span>
          <small>{{ item.description }}</small>
          <span class="category-item__arrow" aria-hidden="true">›</span>
        </a>
      </aside>

      <div class="hero-center">
        <article
          class="hero-banner"
          aria-roledescription="轮播图"
          aria-label="首页活动 Banner"
          tabindex="0"
          @mouseenter="isCarouselPaused = true"
          @mouseleave="isCarouselPaused = false"
          @focusin="isCarouselPaused = true"
          @focusout="isCarouselPaused = false"
          @keydown="handleBannerKeydown"
        >
          <div class="hero-banner__track">
            <section
              v-for="(slide, index) in bannerSlides"
              :key="slide.id"
              class="hero-banner__slide"
              :class="[
                `hero-banner__slide--${slide.theme}`,
                { 'hero-banner__slide--active': index === activeBannerIndex },
              ]"
              :aria-hidden="index !== activeBannerIndex"
            >
              <img
                v-if="slide.imageUrl"
                class="hero-banner__image"
                :src="slide.imageUrl"
                :alt="slide.alt"
                :loading="index === 0 ? 'eager' : 'lazy'"
                draggable="false"
              />

              <template v-else>
                <div class="hero-banner__content">
                  <span class="hero-banner__eyebrow">{{ slide.eyebrow }}</span>
                  <h1>{{ slide.title }}<br /><strong>{{ slide.highlight }}</strong>工业采购</h1>
                  <p>{{ slide.description }}</p>
                  <a href="#products">立即选购 <span>→</span></a>
                </div>

                <div class="chip-visual" aria-hidden="true">
                  <div class="chip-visual__halo" />
                  <div class="chip-visual__board">
                    <span class="chip-visual__trace chip-visual__trace--one" />
                    <span class="chip-visual__trace chip-visual__trace--two" />
                    <span class="chip-visual__trace chip-visual__trace--three" />
                    <div class="chip-visual__body">
                      <strong>GG</strong>
                      <small>INDUSTRIAL</small>
                    </div>
                  </div>
                </div>
              </template>
            </section>
          </div>

          <button class="hero-banner__arrow hero-banner__arrow--previous" type="button" aria-label="上一张 Banner" @click="showPreviousBanner">
            ‹
          </button>
          <button class="hero-banner__arrow hero-banner__arrow--next" type="button" aria-label="下一张 Banner" @click="showNextBanner">
            ›
          </button>

          <div class="hero-banner__pagination" aria-label="选择 Banner">
            <button
              v-for="(slide, index) in bannerSlides"
              :key="`${slide.id}-indicator`"
              type="button"
              :class="{ active: index === activeBannerIndex }"
              :aria-label="`查看第 ${index + 1} 张 Banner`"
              :aria-current="index === activeBannerIndex ? 'true' : undefined"
              @click="goToBanner(index)"
            >
              <span class="sr-only">第 {{ index + 1 }} 张</span>
            </button>
          </div>

          <div class="sr-only" aria-live="polite">
            当前为第 {{ activeBannerIndex + 1 }} 张，共 {{ bannerSlides.length }} 张
          </div>
        </article>

        <div id="services" class="quick-services">
          <a v-for="item in quickServices" :key="item.title" href="#activities" class="quick-service">
            <span>{{ item.icon }}</span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.description }}</small>
          </a>
        </div>
      </div>

      <aside class="member-side">
        <section class="member-card">
          <div class="member-avatar" aria-hidden="true">{{ userName ? userName.slice(0, 1) : 'GG' }}</div>
          <p>Hi~ {{ userName ? `欢迎回来，${userName}` : '欢迎来到管管商城！' }}</p>
          <div v-if="!userName" class="member-card__actions">
            <NuxtLink to="/login">登录</NuxtLink>
            <NuxtLink to="/login">免费注册</NuxtLink>
          </div>
          <div v-else class="member-card__actions">
            <a href="#products">继续采购</a>
            <a href="#footer-contact">联系客服</a>
          </div>
          <div class="member-benefits">
            <span><strong>券</strong>领券中心</span>
            <span><strong>单</strong>我的订单</span>
            <span><strong>藏</strong>我的收藏</span>
          </div>
        </section>

        <section class="notice-card">
          <header>
            <h2>商城公告</h2>
            <a href="#footer-contact">更多</a>
          </header>
          <ul>
            <li v-for="(item, index) in announcements" :key="item">
              <span>{{ index === 0 ? '热门' : '最新' }}</span>
              <a href="#footer-contact">{{ item }}</a>
            </li>
          </ul>
        </section>

        <section class="procurement-card">
          <span>采购顾问</span>
          <strong>为企业提供专属选型服务</strong>
          <a href="#footer-contact">立即咨询 →</a>
        </section>
      </aside>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.page-container {
  width: min(var(--mall-content-max, 1800px), calc(100% - var(--mall-page-gutter, 64px)));
  margin: 0 auto;
}

.hero-section {
  padding: 14px 0 0;
  background:
    linear-gradient(180deg, #f0f6ff 0, #f5f7fa 290px, #f4f6f9 100%),
    #f4f6f9;
}

.hero-grid {
  display: grid;
  grid-template-columns: clamp(234px, 14vw, 258px) minmax(0, 1fr) clamp(270px, 16vw, 300px);
  gap: clamp(14px, 1vw, 18px);
  align-items: stretch;
}

.category-panel,
.hero-center,
.member-side {
  min-width: 0;
}

.category-panel {
  padding: 5px 0;
  background: #fff;
  border: 1px solid var(--mall-border);
  box-shadow: 0 5px 20px rgb(46 69 101 / 5%);
}

.category-item {
  position: relative;
  display: grid;
  grid-template-columns: 31px minmax(0, 1fr) auto 11px;
  gap: 7px;
  align-items: center;
  min-height: 36px;
  padding: 0 11px;
  color: #3c485b;
  text-decoration: none;
  transition: color 150ms ease, background 150ms ease;

  &:hover {
    color: var(--mall-primary);
    background: #f1f7ff;
  }

  small {
    color: #a0a8b3;
    font-size: 10px;
  }
}

.category-item__mark {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  color: #4a6f9f;
  font-size: 8px;
  font-weight: 800;
  background: #f0f5fc;
  border-radius: 5px;
}

.category-item__title {
  overflow: hidden;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.category-item__arrow {
  color: #bcc3cc;
  font-size: 17px;
}

.hero-center {
  display: grid;
  grid-template-rows: minmax(300px, 1fr) auto;
  gap: 14px;
}

.hero-banner {
  position: relative;
  height: clamp(300px, 20vw, 390px);
  overflow: hidden;
  color: #fff;
  background: #1768d7;
  border-radius: 3px;
  box-shadow: 0 12px 35px rgb(22 78 159 / 18%);
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 3px rgb(23 104 215 / 24%), 0 12px 35px rgb(22 78 159 / 18%);
  }
}

.hero-banner__track,
.hero-banner__slide {
  position: absolute;
  inset: 0;
}

.hero-banner__slide {
  visibility: hidden;
  overflow: hidden;
  opacity: 0;
  transition: opacity 480ms ease, visibility 480ms ease;

  &::before {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgb(255 255 255 / 5%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 5%) 1px, transparent 1px);
    background-size: 34px 34px;
    content: '';
    mask-image: linear-gradient(90deg, transparent, #000);
  }

  &::after {
    position: absolute;
    top: -145px;
    right: -95px;
    width: 410px;
    height: 410px;
    background: rgb(73 186 255 / 24%);
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 50%;
    box-shadow: 0 0 0 55px rgb(255 255 255 / 3%), 0 0 0 110px rgb(255 255 255 / 2%);
    content: '';
  }
}

.hero-banner__slide--active {
  visibility: visible;
  opacity: 1;
}

.hero-banner__slide--blue {
  background: linear-gradient(118deg, #083886 0%, #166fda 58%, #1d84e2 100%);
}

.hero-banner__slide--cyan {
  background: linear-gradient(118deg, #07536f 0%, #078fb5 58%, #24b9d4 100%);
}

.hero-banner__slide--indigo {
  background: linear-gradient(118deg, #1e2a72 0%, #344fc0 58%, #5d75dc 100%);
}

.hero-banner__slide--violet {
  background: linear-gradient(118deg, #43217a 0%, #7540c2 58%, #a060dc 100%);
}

.hero-banner__slide--teal {
  background: linear-gradient(118deg, #075b5c 0%, #0b8f87 58%, #2fbeb0 100%);
}

.hero-banner__slide--orange {
  background: linear-gradient(118deg, #9c3d16 0%, #df6e24 58%, #f2a23b 100%);
}

.hero-banner__slide--navy {
  background: linear-gradient(118deg, #102d57 0%, #1f568f 58%, #3881b8 100%);
}

.hero-banner__slide--green {
  background: linear-gradient(118deg, #155234 0%, #267e51 58%, #53aa73 100%);
}

.hero-banner__slide--remote {
  background: #e9eef5;

  &::before,
  &::after {
    display: none;
  }
}

.hero-banner__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.hero-banner__content {
  position: relative;
  z-index: 3;
  width: 62%;
  padding: clamp(36px, 3vw, 58px) 0 44px clamp(36px, 3.4vw, 60px);

  h1 {
    margin: 12px 0 14px;
    font-size: clamp(30px, 3.2vw, 46px);
    font-weight: 750;
    line-height: 1.18;
    letter-spacing: -0.025em;

    strong {
      color: #80d7ff;
      font-weight: 850;
    }
  }

  p {
    max-width: 480px;
    margin: 0 0 25px;
    color: rgb(239 249 255 / 78%);
    font-size: 13px;
    line-height: 1.7;
  }

  > a {
    display: inline-flex;
    gap: 12px;
    align-items: center;
    min-height: 38px;
    padding: 0 22px;
    color: #1261c5;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    background: #fff;
    border-radius: 3px;
    box-shadow: 0 8px 22px rgb(4 45 105 / 18%);
  }
}

.hero-banner__arrow {
  position: absolute;
  z-index: 6;
  top: 50%;
  display: grid;
  place-items: center;
  width: 36px;
  height: 54px;
  padding: 0;
  color: #fff;
  font-size: 31px;
  line-height: 1;
  background: rgb(4 29 66 / 30%);
  border: 0;
  border-radius: 3px;
  opacity: 0;
  cursor: pointer;
  transform: translateY(-50%);
  transition: opacity 160ms ease, background 160ms ease;

  &:hover,
  &:focus-visible {
    background: rgb(4 29 66 / 58%);
    opacity: 1;
    outline: 2px solid rgb(255 255 255 / 70%);
    outline-offset: -2px;
  }
}

.hero-banner:hover .hero-banner__arrow,
.hero-banner:focus-within .hero-banner__arrow {
  opacity: 1;
}

.hero-banner__arrow--previous {
  left: 14px;
}

.hero-banner__arrow--next {
  right: 14px;
}

.hero-banner__pagination {
  position: absolute;
  z-index: 7;
  right: 0;
  bottom: 15px;
  left: 0;
  display: flex;
  gap: 7px;
  justify-content: center;

  button {
    width: 8px;
    height: 8px;
    padding: 0;
    background: rgb(255 255 255 / 52%);
    border: 1px solid rgb(255 255 255 / 70%);
    border-radius: 999px;
    cursor: pointer;
    transition: width 180ms ease, background 180ms ease;

    &.active {
      width: 24px;
      background: #fff;
    }

    &:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.hero-banner__eyebrow {
  color: #a9dcff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.chip-visual {
  position: absolute;
  z-index: 2;
  top: 37px;
  right: 43px;
  width: 240px;
  height: 218px;
  transform: perspective(700px) rotateX(58deg) rotateZ(-24deg);
}

.chip-visual__halo {
  position: absolute;
  inset: 5px;
  background: radial-gradient(circle, rgb(111 226 255 / 60%), transparent 66%);
  filter: blur(10px);
}

.chip-visual__board {
  position: absolute;
  inset: 18px;
  background:
    radial-gradient(circle at 16px 16px, rgb(106 238 255 / 70%) 0 2px, transparent 3px) 0 0 / 33px 33px,
    linear-gradient(145deg, #093a80, #1263b7);
  border: 2px solid rgb(120 221 255 / 48%);
  border-radius: 16px;
  box-shadow: 0 30px 60px rgb(0 24 75 / 46%);
}

.chip-visual__body {
  position: absolute;
  inset: 46px;
  display: grid;
  place-items: center;
  color: #aeeaff;
  background: linear-gradient(145deg, #0b1f3d, #132c55);
  border: 3px solid #297fc5;
  border-radius: 10px;
  box-shadow: 0 0 25px rgb(69 201 255 / 32%);

  strong {
    font-size: 34px;
    letter-spacing: -0.08em;
  }

  small {
    margin-top: -25px;
    font-size: 7px;
    letter-spacing: 0.18em;
  }
}

.chip-visual__trace {
  position: absolute;
  height: 2px;
  background: #55d8ff;
  box-shadow: 0 0 9px #55d8ff;
}

.chip-visual__trace--one {
  top: 30px;
  left: 25px;
  width: 85px;
}

.chip-visual__trace--two {
  right: 20px;
  bottom: 34px;
  width: 95px;
}

.chip-visual__trace--three {
  top: 54px;
  right: 20px;
  width: 58px;
}

.quick-services {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  background: #fff;
  border: 1px solid var(--mall-border);
}

.quick-service {
  display: grid;
  justify-items: center;
  min-width: 0;
  padding: 13px 7px 12px;
  color: #4a5669;
  text-align: center;
  text-decoration: none;
  border-right: 1px solid #eef0f4;
  transition: color 150ms ease, background 150ms ease;

  &:last-child {
    border-right: 0;
  }

  &:hover {
    color: var(--mall-primary);
    background: #f7fbff;
  }

  > span {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    margin-bottom: 7px;
    color: var(--mall-primary);
    font-size: 9px;
    font-weight: 850;
    background: #edf5ff;
    border-radius: 9px;
  }

  strong {
    font-size: 11px;
  }

  small {
    margin-top: 3px;
    overflow: hidden;
    color: #a0a8b3;
    font-size: 9px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.member-side {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
}

.member-card,
.notice-card,
.procurement-card {
  background: #fff;
  border: 1px solid var(--mall-border);
}

.member-card {
  padding: 17px 17px 14px;
  text-align: center;

  > p {
    margin: 9px 0 12px;
    overflow: hidden;
    color: #4d596b;
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.member-avatar {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  color: #fff;
  font-size: 15px;
  font-weight: 850;
  background: linear-gradient(145deg, #50a4ef, #1768d7);
  border: 5px solid #eaf4ff;
  border-radius: 50%;
}

.member-card__actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  a {
    display: grid;
    place-items: center;
    height: 30px;
    color: var(--mall-primary);
    font-size: 11px;
    text-decoration: none;
    border: 1px solid #a9c9f1;
    border-radius: 3px;

    &:first-child {
      color: #fff;
      background: var(--mall-primary);
      border-color: var(--mall-primary);
    }
  }
}

.member-benefits {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-top: 15px;

  span {
    display: grid;
    gap: 4px;
    justify-items: center;
    color: #7c8795;
    font-size: 9px;
  }

  strong {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    color: #5c78a2;
    font-size: 10px;
    background: #f1f5fa;
    border-radius: 8px;
  }
}

.notice-card {
  padding: 14px 16px;

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 11px;
    border-bottom: 1px solid #edf0f4;
  }

  h2 {
    margin: 0;
    color: #2e3b50;
    font-size: 14px;
  }

  header a {
    color: #9aa3af;
    font-size: 10px;
    text-decoration: none;
  }

  ul {
    display: grid;
    gap: 12px;
    padding: 13px 0 0;
    margin: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 7px;
    align-items: center;

    span {
      padding: 2px 4px;
      color: #f05e46;
      font-size: 9px;
      background: #fff0ed;
      border-radius: 2px;
    }

    a {
      overflow: hidden;
      color: #667182;
      font-size: 10px;
      text-decoration: none;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.procurement-card {
  display: grid;
  gap: 4px;
  padding: 13px 16px;
  color: #fff;
  background: linear-gradient(120deg, #214d91, #2b7ad4);
  border: 0;

  > span {
    color: #a9d7ff;
    font-size: 9px;
    letter-spacing: 0.12em;
  }

  strong {
    font-size: 12px;
  }

  a {
    justify-self: end;
    color: #fff;
    font-size: 10px;
    text-decoration: none;
  }
}

@media (max-width: 1120px) {
  .hero-grid {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .member-side {
    display: none;
  }
}

@media (max-width: 780px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .category-panel {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    order: 2;
  }

  .category-item {
    grid-template-columns: 31px minmax(0, 1fr) 10px;
    border-bottom: 1px solid #f0f2f5;

    small {
      display: none;
    }
  }

  .hero-center {
    order: 1;
  }

  .hero-banner__content {
    width: 72%;
    padding-left: 27px;
  }

  .chip-visual {
    right: -60px;
    opacity: 0.68;
  }

  .quick-services {
    grid-template-columns: repeat(3, 1fr);
  }

  .quick-service:nth-child(3) {
    border-right: 0;
  }

  .quick-service:nth-child(-n + 3) {
    border-bottom: 1px solid #eef0f4;
  }
}

@media (max-width: 560px) {
  .hero-section {
    padding-top: 8px;
  }

  .hero-banner {
    height: 276px;
  }

  .hero-banner__content {
    width: 88%;
    padding: 28px 24px 48px;

    h1 {
      font-size: 31px;
    }
  }

  .chip-visual {
    top: 89px;
    right: -105px;
    opacity: 0.38;
  }

  .hero-banner__arrow {
    display: none;
  }

  .hero-banner__pagination {
    bottom: 12px;
  }

  .category-panel {
    grid-template-columns: 1fr;
  }

  .category-item:nth-child(n + 9) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-banner__slide,
  .hero-banner__pagination button {
    transition: none;
  }
}
</style>
