/** 购物车与收藏夹分类 DTO 共用的字段。 */
interface CollectionRequestFields {
  /** 用户可见的分类名称。 */
  name: string
  /** 可选的分类用途说明；后端同时接受省略和 null。 */
  description?: string | null
  /** 是否作为新商品默认写入的分类。 */
  isDefault: boolean
  /** 数字越小越靠前，用于用户自定义排序。 */
  sortOrder: number
}

/** `CreateCartRequest` 的前端镜像。 */
export interface CreateCartRequest extends CollectionRequestFields {}

/** `UpdateCartRequest` 的前端镜像。 */
export interface UpdateCartRequest extends CollectionRequestFields {
  /** 乐观并发版本，防止覆盖其他页面刚完成的更新。 */
  expectedVersion: number
}

/** `CreateFavoriteListRequest` 的前端镜像。 */
export interface CreateFavoriteListRequest extends CollectionRequestFields {}

/** `UpdateFavoriteListRequest` 的前端镜像。 */
export interface UpdateFavoriteListRequest extends CollectionRequestFields {
  /** 乐观并发版本，防止覆盖其他页面刚完成的更新。 */
  expectedVersion: number
}

/**
 * 兼容已有分类表单使用的共用名称。
 *
 * 新 API 应优先使用与后端 DTO 同名的 Create/UpdateCartRequest 和
 * Create/UpdateFavoriteListRequest。
 */
export type CreateCollectionRequest = CreateCartRequest
export type UpdateCollectionRequest = UpdateCartRequest

/** 购物车与收藏夹分类下拉接口共用的轻量选项。 */
export interface ClassifiedContainerSelectData {
  /** 分类编号，对应下拉组件的 value。 */
  value: number
  /** 分类名称，对应下拉组件的 label。 */
  label: string
  /** 是否为当前默认分类。 */
  isDefault: boolean
  /** 分类资源版本，批量移动等并发写操作需要原样提交。 */
  version: number
}

/** `AddCartItemRequest` 的前端镜像。 */
export interface AddCartItemRequest {
  /** 非空 GUID；同一加购动作重试时必须复用，后端据此保证幂等。 */
  operationId: string
  /** 需要加入购物车的商品 SKU 编号。 */
  productSkuId: number
  /** 本次增加的数量，允许范围为 1 至 9999。 */
  quantity: number
  /** 加入后是否选中；与已有项合并时后端执行逻辑或。 */
  isSelected: boolean
}

/** `MergeCartRequest` 的前端镜像。 */
export interface MergeCartRequest {
  targetCartId: number
}

/** `MergeFavoriteListRequest` 的前端镜像。 */
export interface MergeFavoriteListRequest {
  targetFavoriteListId: number
}

/** 购物车侧边栏使用的轻量摘要。 */
export interface CartSummary {
  id: number
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
  itemCount: number
  totalQuantity: number
  version: number
  createdAt: string
  updatedAt: string
}

/** 购物车详情中的单个 SKU 快照。 */
export interface CartItem {
  id: number
  tenantId: number
  productId: number
  productSkuId: number
  productName: string
  skuCode: string
  mainImage: string
  unitPrice: number
  availableStock: number
  isAvailable: boolean
  quantity: number
  isSelected: boolean
  version: number
  createdAt: string
  updatedAt: string
}

/** 购物车分类与其全部商品项。 */
export interface CartDetail {
  id: number
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
  version: number
  createdAt: string
  updatedAt: string
  items: CartItem[]
}

/** 修改数量或选中状态时提交的乐观并发参数。 */
export interface UpdateCartItemRequest {
  quantity: number
  isSelected: boolean
  expectedItemVersion: number
}

/** 收藏夹侧边栏使用的轻量摘要。 */
export interface FavoriteListSummary {
  id: number
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
  itemCount: number
  version: number
  createdAt: string
  updatedAt: string
}

/** 收藏夹详情中的单个商品快照。 */
export interface FavoriteItem {
  id: number
  tenantId: number
  productId: number
  productName: string
  mainImage: string
  isAvailable: boolean
  version: number
  createdAt: string
  updatedAt: string
}

/** 收藏夹分类与其全部商品项。 */
export interface FavoriteListDetail {
  id: number
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
  version: number
  createdAt: string
  updatedAt: string
  items: FavoriteItem[]
}
