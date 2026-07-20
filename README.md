# GG Store Web

商城前端基础工程，使用 Nuxt 4、TypeScript、Pinia、Element Plus 与 Nuxt I18n。

## 开发

```powershell
npm.cmd install
npm.cmd run dev
```

首次运行前复制 `.env.example`，确认 6 个 `NUXT_*_API_PROXY_TARGET` 与本地后端
服务的监听地址一致，然后重启 Nuxt。默认前端开发端口为 `3210`；
`NUXT_PUBLIC_API_BASE` 应保持同源根路径 `/`，不要填写后端的绝对地址。

开发代理按后端控制器的真实路径分流：

- `/Order/**` → Order
- `/Catalog/**` → Catalog
- `/Cart/**` → Cart
- `/Merchant/**` → Merchant
- `/Admin/**` → Admin
- `/UserManage/**` → UserManage

认证实现以 `GG-Store-Server` 为准：Access Token 使用 Bearer 请求头，Refresh Token
由后端通过 HttpOnly Cookie 管理。前端不保存刷新令牌，也不执行参考项目中的
AppId 签名、LoginMac 或 SHA1 密码摘要。当前后端要求登录前获取一次性挑战，并用
RSA-OAEP-SHA256 + AES-256-GCM 加密账号、密码和设备标识；该协议由登录 API 模块
通过浏览器原生 Web Crypto 实现，不能替代 HTTPS。

开发代理只在非生产环境启用。生产环境应由同源网关按上述路径转发到对应服务，并
完整透传 UserManage 返回的 `Set-Cookie`。
同时应将仅服务器可见的 `NUXT_API_BASE` 设置为该网关的绝对 Origin，供公开商品页
SSR 读取 Catalog；浏览器侧的 `NUXT_PUBLIC_API_BASE` 仍保持 `/`。

```powershell
$env:NUXT_API_BASE = 'https://store.example.com'
```
网关还需保留真实客户端 IP；如果使用 `X-Forwarded-For` 等转发头，后端必须先限定
可信代理后再读取，避免认证限流把所有用户误判为同一来源。

后端刷新 Cookie 带有 `Secure` 与 `__Host-` 约束。通过局域网域名或 IP 调试时，
前端也必须使用 HTTPS；普通 HTTP 仅可用于浏览器允许的 localhost 开发场景。
本机代理连接 .NET HTTPS 地址时应信任开发证书，不要通过全局关闭 TLS 校验绕过。

会员页面需要通过 `definePageMeta({ requiresAuth: true })` 显式进入登录守卫。由于
Access Token 只在浏览器内存中保存，这类页面还应在 `routeRules` 中关闭 SSR；
公开商品页不要添加会员标记。当前认证链路是 client-only：不要直接在 SSR 中调用
refresh，否则还需要正确转发入站 Cookie、上游 `Set-Cookie` 并处理令牌轮换并发。
公开 SSR 页面会先按匿名状态完成水合，再由客户端启动流程使用 HttpOnly Refresh
Cookie 恢复 Pinia 中的 Access Token 和会员信息，因此刷新首页后登录展示会自动恢复。

GET 在 401 后可安全刷新并重放一次；POST、PUT、PATCH、DELETE 默认不自动重放。
后续写接口应在发送前保证 Access Token 有效，或在确认接口幂等（最好带幂等键）后
显式开启 `retryOnUnauthorized`。

安装依赖后可执行完整检查：

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## 目录约定

项目沿用 `gg.autofinance` 的 `src/` 分层，同时按页面渲染方式组织 Nuxt 文件路由：

```text
src/
├─ api/                         # 接口定义与统一请求封装
├─ components/                  # 跨页面公共组件
│  └─ common/
│     ├─ MallHeader.vue         # 公共组件使用 PascalCase
│     └─ MallFooter.vue
├─ config/                      # 应用配置
├─ i18n/                        # 国际化配置与领域语言分片
├─ middleware/                  # Nuxt 路由中间件
├─ pages/
│  ├─ ssr/                      # SSR 页面组织目录
│  │  └─ home/
│  │     ├─ index.vue           # 页面入口
│  │     └─ components/         # 仅供首页使用的私有组件
│  │        └─ heroSection.vue  # 页面私有组件使用 lowerCamelCase
│  └─ csr/                      # CSR 页面组织目录
│     └─ login/
│        └─ index.vue
├─ plugins/                     # Nuxt 插件
├─ stores/                      # Pinia，按领域使用目录 + index.ts
├─ styles/                      # 全局样式
├─ types/                       # 应用类型
└─ utils/                       # 通用工具
```

`pages/ssr` 与 `pages/csr` 只表达源码组织方式，不会自行改变 Nuxt 的渲染行为。真实 URL 的渲染模式统一由 `nuxt.config.ts` 中的 `routeRules` 决定，例如首页 `/` 保留 SSR，登录页 `/login` 关闭 SSR。

页面入口统一使用领域目录下的 `index.vue`，并通过 `definePageMeta` 的 `name` 与 `path` 显式映射真实路由，例如 `ssr/home/index.vue` 映射到 `/`、`csr/login/index.vue` 映射到 `/login`，不把 `ssr`、`csr` 暴露到 URL。页面私有组件统一放在同级 `components/` 中；`nuxt.config.ts` 的 `pages.pattern` 必须排除 `**/components/**`，避免这些组件被扫描成页面路由。

业务目录和普通文件使用 lowerCamelCase，页面私有组件也遵循 lowerCamelCase；跨页面公共 Vue 组件使用 PascalCase。`index.vue` 是页面入口约定，允许保留该名称；Nuxt 的 `.global` 与 TypeScript 的 `.d` 属于具有框架语义的后缀，也不按普通业务文件名改写。

全局 Pinia Store 按参考项目采用 Options Store，并在各领域目录的 `index.ts` 默认导出
Store 定义；业务代码统一从 `src/stores/index.ts` 的 `useStores()` 取得
`userStore`、`settingStore`。参考项目是 Vite SPA，可以持有模块级单例；本项目保留
Nuxt SSR，因此统一入口会绑定当前应用的 `$pinia`，不在模块顶层共享会员状态。

当前已接入认证与改密、个人资料、收货地址、公开商品目录/搜索/详情、购物车与
收藏夹等会员侧真实接口。Order 服务目前只提供模块状态与健康检查，尚无订单业务
控制器，因此订单页保留“后端暂未开放”的明确状态，不伪造订单数据。
