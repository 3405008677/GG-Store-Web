<script setup lang="ts">
import type { ProductCategoryTreeItemResponse } from '@/api/catalog/types'

/** 首页商品分类展示项。 */
interface CategoryItem {
  value: number
  mark: string
  title: string
  description: string
}

/** 首页快捷服务入口。 */
interface QuickService {
  icon: string
  title: string
  description: string
  to: string
}

/** 后端暂无 Banner 接口；默认内容只描述已经接入的真实商城能力。 */
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
    /** 可选的首页图片 URL；当前后端未提供 Banner 接口。 */
    bannerUrls?: readonly string[]
    /** Catalog 服务返回的当前启用类目树。 */
    categories?: readonly ProductCategoryTreeItemResponse[]
  }>(),
  {
    userName: '',
    bannerUrls: () => [],
    categories: () => [],
  },
)

/** Catalog、搜索、购物车和收藏夹四项能力对应默认轮播内容。 */
const fallbackBanners: readonly BannerSlide[] = [
  {
    id: 'spot-stock',
    eyebrow: 'GG STORE · ONE-STOP PROCUREMENT',
    title: '实时目录',
    highlight: '可售 SKU',
    description: '商品、价格和库存来自 Catalog 服务当前公开快照。',
    theme: 'blue',
  },
  {
    id: 'search',
    eyebrow: 'PRODUCT SEARCH',
    title: '关键词检索',
    highlight: '快速找商品',
    description: '按关键词和类目搜索，并展示真实搜索选择排行榜。',
    theme: 'cyan',
  },
  {
    id: 'filters',
    eyebrow: 'CATEGORY & BRAND',
    title: '类目品牌',
    highlight: '多维筛选',
    description: '按启用类目、品牌、价格和上架时间逐步缩小范围。',
    theme: 'indigo',
  },
  {
    id: 'collections',
    eyebrow: 'CART & FAVORITES',
    title: '分类管理',
    highlight: '待购与收藏',
    description: '登录后可创建多个购物车和收藏夹，支持编辑、合并与并发保护。',
    theme: 'teal',
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

/** 首页只展示类目树第一层，名称和启用状态完全以 Catalog 服务为准。 */
const categories = computed<readonly CategoryItem[]>(() => {
  const items = props.categories.slice(0, 13).map((item, index) => ({
    value: item.value,
    mark: String(index + 1).padStart(2, '0'),
    title: item.label,
    description: item.isLeaf ? '商品分类' : `${item.children.length} 个子类`,
  }))
  return items.length
    ? items
    : [{ value: 0, mark: 'ALL', title: '浏览全部商品', description: '目录数据待加载' }]
})

/** Banner 下方只提供已有页面和接口支持的快捷入口。 */
const quickServices: readonly QuickService[] = [
  { icon: '商', title: '商品目录', description: '浏览全部可售商品', to: '/products' },
  { icon: '新', title: '最新上架', description: '按时间查看新品', to: '/products?sort=3' },
  { icon: '牌', title: '品牌专区', description: '按启用品牌筛选', to: '/#brands' },
  { icon: '榜', title: '搜索热榜', description: '查看真实搜索排行', to: '/products' },
  { icon: '车', title: '购物车', description: '分类管理待购 SKU', to: '/cart' },
  { icon: '藏', title: '我的收藏', description: '管理关注商品', to: '/member/favorites' },
]

/** 后端未提供公告接口，这里改为不会伪造运营内容的真实功能导航。 */
const memberNavigation = [
  { label: '浏览当前可售商品', to: '/products' },
  { label: '维护个人资料', to: '/member/profile' },
  { label: '管理收货地址', to: '/member/addresses' },
] as const
</script>

<template>
  <section class="hero-section">
    <div class="page-container hero-grid">
      <aside class="category-panel" aria-label="商品分类">
        <NuxtLink
          v-for="item in categories"
          :key="item.value || item.title"
          :to="item.value ? { path: '/products', query: { categoryId: item.value } } : '/products'"
          class="category-item"
        >
          <span class="category-item__mark">{{ item.mark }}</span>
          <span class="category-item__title">{{ item.title }}</span>
          <small>{{ item.description }}</small>
          <span class="category-item__arrow" aria-hidden="true">›</span>
        </NuxtLink>
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
                  <h1>{{ slide.title }}<br /><strong>{{ slide.highlight }}</strong></h1>
                  <p>{{ slide.description }}</p>
                  <NuxtLink to="/products">浏览商品 <span>→</span></NuxtLink>
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
          <NuxtLink v-for="item in quickServices" :key="item.title" :to="item.to" class="quick-service">
            <span>{{ item.icon }}</span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.description }}</small>
          </NuxtLink>
        </div>
      </div>

      <aside class="member-side">
        <section class="member-card">
          <div class="member-avatar" aria-hidden="true">{{ userName ? userName.slice(0, 1) : 'GG' }}</div>
          <p>Hi~ {{ userName ? `欢迎回来，${userName}` : '欢迎来到管管商城！' }}</p>
          <div v-if="!userName" class="member-card__actions">
            <NuxtLink to="/login">登录</NuxtLink>
            <NuxtLink to="/register">免费注册</NuxtLink>
          </div>
          <div v-else class="member-card__actions">
            <NuxtLink to="/products">继续采购</NuxtLink>
            <a href="#footer-contact">联系客服</a>
          </div>
          <div class="member-benefits">
            <NuxtLink to="/member/addresses"><strong>址</strong>收货地址</NuxtLink>
            <NuxtLink to="/member/orders"><strong>单</strong>我的订单</NuxtLink>
            <NuxtLink to="/member/favorites"><strong>藏</strong>我的收藏</NuxtLink>
          </div>
        </section>

        <section class="notice-card">
          <header>
            <h2>会员服务</h2>
            <NuxtLink to="/member/profile">账户中心</NuxtLink>
          </header>
          <ul>
            <li v-for="(item, index) in memberNavigation" :key="item.to">
              <span>{{ index === 0 ? '商品' : '会员' }}</span>
              <NuxtLink :to="item.to">{{ item.label }}</NuxtLink>
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
    linear-gradient(180deg, #f0f6ff 0, #f5f7fa 290px, var(--mall-color-page) 100%),
    var(--mall-color-page);
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
    background: var(--mall-color-primary-light);
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
  background: var(--mall-color-primary);
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
    transition: transform 180ms ease, box-shadow 180ms ease;

    &:hover {
      box-shadow: 0 12px 28px rgb(4 45 105 / 24%);
      transform: translateY(-2px);
    }
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
    background: var(--mall-color-primary-light);
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
    background: var(--mall-color-primary-light);
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
  background: linear-gradient(145deg, var(--mall-color-accent), var(--mall-color-primary));
  border: 5px solid var(--mall-color-primary-soft);
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
    border: 1px solid var(--mall-color-primary-border);
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

  a {
    display: grid;
    gap: 4px;
    justify-items: center;
    color: #7c8795;
    font-size: 9px;
    text-decoration: none;
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
