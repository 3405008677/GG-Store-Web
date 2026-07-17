<script setup lang="ts">
/** 显式组件名便于 Vue DevTools 在页面较复杂时快速定位公共页头。 */
defineOptions({ name: 'MallHeader' })

/** 页头快捷操作类型；具体跳转或业务提示由使用页头的页面决定。 */
type HeaderAction = 'bom' | 'cart'

/** 公共页头允许页面传入的轻量展示状态。 */
interface HeaderProps {
  /** 已登录时展示会员名称，空字符串表示游客状态。 */
  userName?: string
  /** 购物车角标数量，真实购物车模块接入后由页面或布局传入。 */
  cartCount?: number
  /** 退出请求进行中时禁用按钮，避免用户重复提交同一撤销请求。 */
  logoutPending?: boolean
}

/** 公共页头只接收展示数据，不直接依赖具体业务 Store。 */
const props = withDefaults(defineProps<HeaderProps>(), {
  userName: '',
  cartCount: 0,
  logoutPending: false,
})

/** 搜索、快捷入口和退出均通过事件交给上层处理，保持组件可复用。 */
const emit = defineEmits<{
  search: [keyword: string]
  action: [name: HeaderAction]
  logout: []
}>()

/** 公共认证按钮只读取翻译文案，实际语言状态仍由全局国际化模块管理。 */
const { t } = useI18n()

/** 搜索词只保存在当前输入框内，不在公共组件中发起接口请求。 */
const searchKeyword = ref('')

/** 顶部工具栏入口目前用于搭建视觉结构，后续可逐项替换为真实路由。 */
const utilityLinks = ['我的订单', '我的收藏', '消息中心', '联系客服', '帮助中心', '供应商合作'] as const

/** 搜索框下方的热门词沿用电子元器件商城常见的快速找料场景。 */
const hotKeywords = ['STM32', '贴片电阻', '连接器', '电源芯片', '传感器', '开发板'] as const

/** 主导航使用首页锚点，后续独立频道上线后可直接替换为对应路由。 */
const navigationLinks = [
  { label: '首页', to: '/' },
  { label: '领券中心', to: '/#activities' },
  { label: '备货找料', to: '/#services' },
  { label: '爆款推荐', to: '/#products' },
  { label: '品牌专区', to: '/#brands' },
  { label: '新品推荐', to: '/#new-products' },
  { label: 'BOM 配单', to: '/#bom-service' },
  { label: '工业品', to: '/#activities' },
] as const

/** 清理首尾空格后再抛出搜索事件，空内容不会触发无意义操作。 */
function handleSearch(): void {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  emit('search', keyword)
}
</script>

<template>
  <header class="mall-header">
    <div class="utility-bar">
      <div class="header-container utility-bar__inner">
        <div class="welcome">
          <span>Hi，欢迎来到管管商城！</span>
          <template v-if="props.userName">
            <span class="welcome__member">{{ props.userName }}</span>
            <button
              class="utility-link utility-button"
              type="button"
              :disabled="props.logoutPending"
              @click="emit('logout')"
            >
              {{ t('communal.logout.text') }}
            </button>
          </template>
          <template v-else>
            <NuxtLink class="utility-link utility-link--primary" to="/login">登录</NuxtLink>
            <NuxtLink class="utility-link" to="/login">免费注册</NuxtLink>
          </template>
        </div>

        <nav class="utility-nav" aria-label="会员快捷导航">
          <a v-for="item in utilityLinks" :key="item" class="utility-link" href="#footer-contact">{{ item }}</a>
        </nav>
      </div>
    </div>

    <div class="main-header">
      <div class="header-container main-header__inner">
        <NuxtLink class="brand" to="/" aria-label="管管商城首页">
          <span class="brand__symbol" aria-hidden="true">GG</span>
          <span class="brand__text">
            <strong>管管商城</strong>
            <small>正品现货 · 一站式采购</small>
          </span>
        </NuxtLink>

        <div class="search-area">
          <form class="search-box" role="search" @submit.prevent="handleSearch">
            <label class="sr-only" for="mall-search">搜索商品</label>
            <select class="search-box__scope" aria-label="搜索范围">
              <option value="all">全部商品</option>
              <option value="brand">品牌</option>
              <option value="category">分类</option>
            </select>
            <input
              id="mall-search"
              v-model="searchKeyword"
              class="search-box__input"
              type="search"
              autocomplete="off"
              placeholder="请输入型号、品牌、参数或商品名称"
            />
            <button class="search-box__button" type="submit" aria-label="搜索">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <span>搜索</span>
            </button>
          </form>

          <div class="hot-keywords" aria-label="热门搜索">
            <span>热门：</span>
            <button v-for="keyword in hotKeywords" :key="keyword" type="button" @click="searchKeyword = keyword">{{ keyword }}</button>
          </div>
        </div>

        <div class="header-actions">
          <button class="header-action" type="button" @click="emit('action', 'bom')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3.5h9l3 3V20H6z" />
              <path d="M15 3.5V7h3M9 11h6M9 15h6" />
            </svg>
            <span>BOM 配单</span>
          </button>
          <button class="header-action header-action--cart" type="button" @click="emit('action', 'cart')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.1 10.2h10.8l2-7.2H6" />
              <circle cx="9" cy="19" r="1.4" />
              <circle cx="17" cy="19" r="1.4" />
            </svg>
            <span>购物车</span>
            <strong>{{ props.cartCount }}</strong>
          </button>
        </div>
      </div>
    </div>

    <div class="category-navigation">
      <div class="header-container category-navigation__inner">
        <div class="all-category">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>全部商品分类</span>
        </div>
        <nav class="main-navigation" aria-label="商城主导航">
          <NuxtLink v-for="item in navigationLinks" :key="item.label" :to="item.to">{{ item.label }}</NuxtLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.mall-header {
  --header-primary: #1768d7;
  --header-primary-dark: #0f54b7;

  position: relative;
  z-index: 20;
  color: #2f3540;
  background: #fff;
}

.header-container {
  width: min(1280px, calc(100% - 40px));
  margin: 0 auto;
}

.utility-bar {
  color: #69717d;
  font-size: 12px;
  background: #f5f6f8;
  border-bottom: 1px solid #eceff3;
}

.utility-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
}

.welcome,
.utility-nav {
  display: flex;
  gap: 14px;
  align-items: center;
}

.welcome__member {
  color: var(--header-primary);
  font-weight: 600;
}

.utility-link {
  color: inherit;
  text-decoration: none;
  transition: color 160ms ease;

  &:hover {
    color: var(--header-primary);
  }
}

.utility-button {
  padding: 0;
  font: inherit;
  background: none;
  border: 0;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
}

.utility-link--primary {
  color: var(--header-primary);
}

.main-header__inner {
  display: grid;
  grid-template-columns: 250px minmax(360px, 1fr) auto;
  gap: 36px;
  align-items: center;
  min-height: 116px;
}

.brand {
  display: inline-flex;
  gap: 13px;
  align-items: center;
  color: #15213a;
  text-decoration: none;
}

.brand__symbol {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  color: #fff;
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -1px;
  background: linear-gradient(145deg, #3188ef, #0d58c5);
  border-radius: 7px 18px 7px 18px;
  box-shadow: 0 10px 24px rgb(23 104 215 / 24%);
}

.brand__text {
  display: grid;
  gap: 3px;

  strong {
    font-size: 25px;
    letter-spacing: 0.04em;
  }

  small {
    color: #8290a3;
    font-size: 11px;
    letter-spacing: 0.08em;
  }
}

.search-area {
  min-width: 0;
}

.search-box {
  display: grid;
  grid-template-columns: 106px minmax(0, 1fr) 112px;
  height: 46px;
  overflow: hidden;
  border: 2px solid var(--header-primary);
  border-radius: 4px;
}

.search-box__scope,
.search-box__input,
.search-box__button {
  min-width: 0;
  border: 0;
  outline: 0;
}

.search-box__scope {
  padding: 0 13px;
  color: #596579;
  background: #fff;
  border-right: 1px solid #e6eaf0;
  cursor: pointer;
}

.search-box__input {
  padding: 0 17px;
  color: #26334a;
  background: #fff;

  &::placeholder {
    color: #a2aab5;
  }
}

.search-box__button {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  background: var(--header-primary);
  cursor: pointer;
  transition: background 160ms ease;

  &:hover {
    background: var(--header-primary-dark);
  }

  svg {
    width: 19px;
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-width: 2;
  }
}

.hot-keywords {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 27px;
  overflow: hidden;
  color: #9aa2ae;
  font-size: 12px;
  white-space: nowrap;

  button {
    padding: 0;
    color: #778292;
    background: none;
    border: 0;
    cursor: pointer;

    &:hover {
      color: var(--header-primary);
    }
  }
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-action {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  color: #4f5c70;
  white-space: nowrap;
  background: #fff;
  border: 1px solid #dfe4eb;
  border-radius: 4px;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;

  &:hover {
    color: var(--header-primary);
    background: #f7fbff;
    border-color: #9fc3f0;
  }

  svg {
    width: 20px;
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
  }

  strong {
    display: grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    color: #fff;
    font-size: 10px;
    background: #ff5b45;
    border-radius: 999px;
  }
}

.header-action--cart {
  color: var(--header-primary);
}

.category-navigation {
  border-bottom: 2px solid var(--header-primary);
}

.category-navigation__inner {
  display: flex;
  align-items: stretch;
  height: 46px;
}

.all-category {
  display: flex;
  gap: 11px;
  align-items: center;
  width: 234px;
  padding: 0 20px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  background: var(--header-primary);

  svg {
    width: 20px;
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-width: 1.8;
  }
}

.main-navigation {
  display: flex;
  flex: 1;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  a {
    display: grid;
    place-items: center;
    min-width: max-content;
    height: 100%;
    padding: 0 clamp(14px, 2vw, 25px);
    color: #29364b;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: color 160ms ease, background 160ms ease;

    &:hover {
      color: var(--header-primary);
      background: #f5f9ff;
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

@media (max-width: 1080px) {
  .main-header__inner {
    grid-template-columns: 220px minmax(300px, 1fr);
  }

  .header-actions {
    display: none;
  }

  .utility-nav a:nth-child(-n + 2) {
    display: none;
  }
}

@media (max-width: 760px) {
  .header-container {
    width: min(1280px, calc(100% - 24px));
  }

  .utility-bar__inner {
    justify-content: center;
  }

  .utility-nav {
    display: none;
  }

  .main-header__inner {
    grid-template-columns: 1fr;
    gap: 17px;
    min-height: auto;
    padding: 20px 0 16px;
  }

  .brand {
    justify-self: center;
  }

  .search-box {
    grid-template-columns: minmax(0, 1fr) 88px;
  }

  .search-box__scope {
    display: none;
  }

  .hot-keywords {
    gap: 10px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .all-category {
    width: 154px;
    padding: 0 13px;
    font-size: 13px;
  }

  .main-navigation a {
    padding: 0 16px;
    font-size: 13px;
  }
}
</style>
