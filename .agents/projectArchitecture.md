# GG Store Web 项目架构与目录规范

本文档是本项目目录设计、文件命名和页面渲染方式的开发约束。新增、移动或拆分代码时必须同步遵守；如果项目架构发生变化，应同时更新本文档。

## 1. 技术架构

- 框架：Nuxt 4、Vue 3、TypeScript。
- UI：Element Plus、SCSS。
- 状态管理：Pinia。
- 国际化：`@nuxtjs/i18n`。
- 源码根目录：`src/`。
- 页面路由：Nuxt 文件路由，但页面的公开 URL 必须通过 `definePageMeta` 显式声明。
- 默认渲染：Nuxt SSR；需要 CSR 的页面必须在 `nuxt.config.ts` 的 `routeRules` 中显式关闭 SSR。
- API：浏览器统一请求同源 `/api`，开发环境由 Nuxt/Nitro 代理到后端服务。

## 2. 当前目录结构

```text
src/
├─ api/
│  ├─ login/
│  │  ├─ index.ts
│  │  └─ types.ts
│  └─ request.ts
├─ components/
│  └─ common/
│     ├─ MallFooter.vue
│     └─ MallHeader.vue
├─ config/
│  └─ app.ts
├─ i18n/
│  ├─ lang/
│  │  ├─ en/
│  │  │  └─ communal.ts
│  │  └─ zhCn/
│  │     └─ communal.ts
│  ├─ i18nConfig.ts
│  └─ index.ts
├─ middleware/
│  └─ auth.global.ts
├─ pages/
│  ├─ csr/
│  │  └─ login/
│  │     └─ index.vue
│  └─ ssr/
│     └─ home/
│        ├─ components/
│        │  ├─ activitySection.vue
│        │  ├─ bomSection.vue
│        │  ├─ brandSection.vue
│        │  ├─ heroSection.vue
│        │  └─ productSection.vue
│        └─ index.vue
├─ plugins/
│  ├─ api.ts
│  └─ elementPlus.ts
├─ stores/
│  ├─ setting/
│  │  └─ index.ts
│  ├─ user/
│  │  └─ index.ts
│  └─ index.ts
├─ styles/
│  ├─ index.scss
│  └─ variables.scss
├─ types/
│  ├─ api.ts
│  ├─ auth.ts
│  └─ nuxt.d.ts
├─ utils/
│  └─ core/
│     ├─ authSession/
│     │  └─ index.ts
│     ├─ loginEncryption/
│     │  └─ index.ts
│     └─ storage/
│        └─ index.ts
└─ app.vue
```

## 3. 目录职责

| 目录 | 职责 |
| --- | --- |
| `api/` | 领域接口、请求 DTO 和统一请求封装。 |
| `components/` | 跨页面复用的公共组件。 |
| `config/` | 应用名称、路由常量等全局配置。 |
| `i18n/` | 国际化初始化和语言资源。 |
| `middleware/` | Nuxt 路由中间件。 |
| `pages/ssr/` | 需要服务端渲染的页面源码。 |
| `pages/csr/` | 只在客户端渲染的页面源码。 |
| `plugins/` | Nuxt 插件。 |
| `stores/` | Pinia Store，按业务领域分目录。 |
| `styles/` | 全局样式和 SCSS 变量。 |
| `types/` | 跨模块共享的 TypeScript 类型。 |
| `utils/` | 与页面无关的通用工具和底层能力。 |

## 4. 页面架构规则

### 4.1 SSR/CSR 目录只负责组织源码

`pages/ssr` 和 `pages/csr` 本身不会改变 Nuxt 的渲染方式，也不应出现在公开 URL 中。

每个页面入口必须通过 `definePageMeta` 显式声明稳定的路由名称和公开路径：

```ts
definePageMeta({
  name: 'home',
  path: '/',
  requiresAuth: false,
})
```

```ts
definePageMeta({
  name: 'login',
  path: '/login',
  layout: false,
})
```

真实渲染方式必须同步配置在 `nuxt.config.ts`：

```ts
routeRules: {
  '/': { ssr: true },
  '/login': { ssr: false },
}
```

禁止仅通过把文件放进 `ssr/` 或 `csr/` 来推断渲染方式。

### 4.2 首页入口

- 首页入口固定为 `src/pages/ssr/home/index.vue`。
- 禁止重新创建 `src/pages/index.vue` 作为首页。
- 首页公开 URL 保持为 `/`。
- 页面入口只负责页面级状态、公共头尾、事件编排和区块组合。
- 首页业务区块放在 `src/pages/ssr/home/components/`。

### 4.3 页面私有组件

- 只被单个页面使用的组件必须放在该页面同级的 `components/` 中。
- 私有组件通过相对路径显式导入。
- 私有组件文件使用 lowerCamelCase，例如 `heroSection.vue`。
- 导入后的 Vue 组件变量使用 PascalCase，例如：

```ts
import HeroSection from './components/heroSection.vue'
```

- 私有组件的模板、数据和 scoped 样式应放在组件自身，不能依赖父页面的 scoped 样式穿透内部 DOM。

Nuxt 页面扫描必须持续排除私有组件：

```ts
pages: {
  pattern: ['**/*.vue', '!**/components/**/*.vue'],
}
```

禁止删除该排除规则，否则 `pages/**/components/*.vue` 会被错误生成页面路由。

### 4.4 新增页面流程

新增页面时必须完成以下事项：

1. 判断页面需要 SSR 还是 CSR。
2. 在 `pages/ssr/<pageName>/index.vue` 或 `pages/csr/<pageName>/index.vue` 创建入口。
3. 在 `definePageMeta` 中声明唯一的 `name` 和真实 `path`。
4. 在 `nuxt.config.ts` 的 `routeRules` 中按真实 URL 配置 `ssr: true/false`。
5. 将页面私有组件放进 `<pageName>/components/`。
6. 确认物理目录路径不能通过浏览器访问。
7. 运行构建和路由验证。

## 5. 命名规则

### 5.1 普通目录和文件

- 业务目录使用 lowerCamelCase。
- 普通业务文件使用 lowerCamelCase。
- 禁止 kebab-case、snake_case、空格和无业务含义的缩写。
- 示例：
  - 正确：`authSession/`、`loginEncryption/`、`elementPlus.ts`。
  - 错误：`auth-session/`、`login_encryption/`、`element-plus.ts`。

### 5.2 Vue 组件

- 跨页面公共组件文件使用 PascalCase，例如 `MallHeader.vue`。
- 页面私有组件文件使用 lowerCamelCase，例如 `productSection.vue`。
- 公共组件禁止使用 `index.vue` 隐藏组件身份。
- 公共组件放在 `src/components/`，页面私有组件放在对应页面的 `components/`。

### 5.3 允许的语义例外

- 页面、Store、API 领域入口允许使用 `index.vue` 或 `index.ts`。
- Nuxt 语义后缀允许使用 `.global.ts`。
- TypeScript 声明文件允许使用 `.d.ts`。
- Nuxt 动态路由将来需要使用 `[id].vue` 等框架规定语法时，属于框架语义例外。

## 6. 模块规则

### 6.1 公共组件

- 公共组件只处理展示和通用交互。
- 公共组件不得直接绑定具体业务 Store。
- 业务动作通过 props 和 emits 交给页面或业务容器处理。

### 6.2 Store

- Store 按领域放在 `stores/<domain>/index.ts`。
- 页面和业务模块统一从 `src/stores/index.ts` 的 `useStores()` 获取 Store。
- SSR 环境下禁止在模块顶层保存跨请求共享的用户状态。

### 6.3 API

- 领域接口放在 `api/<domain>/index.ts`。
- 领域 DTO 可放在同目录 `types.ts`，跨领域类型放在 `src/types/`。
- 页面不得直接处理 Token、Refresh Cookie 或底层请求重试。
- 请求统一通过 `api/request.ts` 和注入的 API Client。

### 6.4 鉴权

- Access Token 只保存在浏览器内存。
- Refresh Token 由后端 HttpOnly Cookie 管理。
- 会员页面必须声明 `requiresAuth: true`。
- 依赖浏览器会话恢复的会员页面应归入 CSR，并在 `routeRules` 中关闭 SSR。
- 不能在 SSR 阶段直接执行当前客户端 Refresh 流程。

### 6.5 国际化

- 业务语言码保持 `CHS`、`ENG`。
- 语言目录使用 lowerCamelCase，例如 `zhCn/`。
- 页面和组件通过统一的 i18n 封装读取文案，不重复创建语言状态。

## 7. 导入规则

- 跨目录模块优先使用 `@/` 别名。
- 页面私有组件使用 `./components/...` 相对导入。
- 禁止引用已废弃的旧目录路径。
- 移动文件后必须全仓搜索并修正 import、配置路径和文档。

## 8. 禁止事项

- 禁止使用 `src/pages/index.vue` 作为首页。
- 禁止让 `ssr`、`csr` 出现在真实业务 URL。
- 禁止认为目录名称可以自动控制 SSR/CSR。
- 禁止把页面私有组件放进全局公共组件目录。
- 禁止把公共组件放进页面私有 `components/`。
- 禁止将页面私有组件扫描成路由。
- 禁止为公共组件使用小写 `index.vue`。
- 禁止在没有同步更新 `routeRules` 的情况下新增或移动页面。

## 9. 验证要求

完成目录或页面调整后至少执行：

```powershell
npm.cmd run typecheck
npm.cmd run build
```

同时验证：

- SSR 页面响应中包含服务端渲染的页面内容。
- CSR 页面服务端响应只包含客户端应用外壳。
- `ssr/`、`csr/` 的物理目录路径返回 404。
- `pages/**/components/` 下的组件路径返回 404。
- 原有公开 URL、鉴权跳转和页面锚点没有变化。

当前项目的 `TypeScript 7.0.2` 与 `vue-tsc 3.3.7` 存在启动兼容问题；如果 `typecheck` 在读取项目源码前报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，应单独处理依赖兼容性，不能把该错误误判为页面代码错误。生产构建仍必须成功。
