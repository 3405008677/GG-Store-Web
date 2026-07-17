/** 购物车与收藏夹分类共用的创建字段。 */
export interface CreateCollectionRequest {
  /** 用户可见的分类名称。 */
  name: string
  /** 可选的分类用途说明。 */
  description?: string
  /** 是否作为新商品默认写入的分类。 */
  isDefault: boolean
  /** 数字越小越靠前，用于用户自定义排序。 */
  sortOrder: number
}

/** 购物车与收藏夹分类共用的更新字段。 */
export interface UpdateCollectionRequest extends CreateCollectionRequest {
  /** 乐观并发版本，防止覆盖其他页面刚完成的更新。 */
  expectedVersion: number
}

/** 购物车侧边栏使用的轻量摘要。 */
export interface CartSummary {
  id: number
  name: string
  description?: string | null
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
  description?: string | null
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
  description?: string | null
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
  description?: string | null
  isDefault: boolean
  sortOrder: number
  version: number
  createdAt: string
  updatedAt: string
  items: FavoriteItem[]
}
