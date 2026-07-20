import type {
  AddCartItemRequest,
  CartDetail,
  CartSummary,
  ClassifiedContainerSelectData,
  CreateCartRequest,
  CreateFavoriteListRequest,
  FavoriteListDetail,
  FavoriteListSummary,
  MergeCartRequest,
  MergeFavoriteListRequest,
  UpdateCartRequest,
  UpdateCartItemRequest,
  UpdateFavoriteListRequest,
} from './types'
import type { ApiCallOptions } from '@/api/request'
import { useApi } from '@/api/request'

/** 获取当前会员的全部有效购物车摘要。 */
export function listCarts(options: ApiCallOptions = {}): Promise<CartSummary[]> {
  return useApi().get<CartSummary[]>('/Cart/Carts/List', undefined, options)
}

/** 获取当前会员购物车分类的轻量下拉数据。 */
export function listCartSelectData(): Promise<ClassifiedContainerSelectData[]> {
  return useApi().get<ClassifiedContainerSelectData[]>('/Cart/Carts/SelectData')
}

/** 获取指定购物车及商品明细。 */
export function getCart(cartId: number): Promise<CartDetail> {
  return useApi().get<CartDetail>(`/Cart/Carts/Detail/${cartId}`)
}

/** 创建一个新的购物车分类。 */
export function createCart(request: CreateCartRequest): Promise<CartDetail> {
  return useApi().post<CartDetail, CreateCartRequest>('/Cart/Carts/Add', request)
}

/** 更新购物车名称、说明、默认状态和排序。 */
export function updateCart(cartId: number, request: UpdateCartRequest): Promise<CartDetail> {
  return useApi().put<CartDetail, UpdateCartRequest>(`/Cart/Carts/Edit/${cartId}`, request)
}

/** 按乐观并发版本归档购物车。 */
export function archiveCart(cartId: number, expectedVersion: number): Promise<void> {
  return useApi().delete<void>(
    `/Cart/Carts/Archive/${cartId}`,
    { expectedVersion },
    { responseMode: 'raw' },
  )
}

/**
 * 向指定购物车增量加入一个 SKU。
 *
 * operationId 让同一请求可以在 401 刷新后安全重放，不会重复增加数量。
 */
export function addCartItem(cartId: number, request: AddCartItemRequest): Promise<CartDetail> {
  return useApi().post<CartDetail, AddCartItemRequest>(
    `/Cart/Carts/AddItem/${cartId}`,
    request,
    { retryOnUnauthorized: true },
  )
}

/** 同时更新购物车商品的数量与选中状态。 */
export function updateCartItem(
  cartId: number,
  productSkuId: number,
  request: UpdateCartItemRequest,
): Promise<CartDetail> {
  return useApi().put<CartDetail, UpdateCartItemRequest>(
    `/Cart/Carts/UpdateItem/${cartId}/${productSkuId}`,
    request,
  )
}

/** 从指定购物车中永久移除一个 SKU。 */
export function deleteCartItem(cartId: number, productSkuId: number): Promise<void> {
  return useApi().delete<void>(
    `/Cart/Carts/DeleteItem/${cartId}/${productSkuId}`,
    undefined,
    { responseMode: 'raw' },
  )
}

/** 将源购物车全部商品合并到目标购物车。 */
export function mergeCarts(sourceCartId: number, targetCartId: number): Promise<CartDetail> {
  return useApi().post<CartDetail, MergeCartRequest>(
    `/Cart/Carts/Merge/${sourceCartId}`,
    { targetCartId },
  )
}

/** 获取当前会员的全部有效收藏夹摘要。 */
export function listFavoriteLists(): Promise<FavoriteListSummary[]> {
  return useApi().get<FavoriteListSummary[]>('/Cart/FavoriteLists/List')
}

/** 获取当前会员收藏夹分类的轻量下拉数据。 */
export function listFavoriteListSelectData(): Promise<ClassifiedContainerSelectData[]> {
  return useApi().get<ClassifiedContainerSelectData[]>('/Cart/FavoriteLists/SelectData')
}

/** 获取指定收藏夹及商品明细。 */
export function getFavoriteList(favoriteListId: number): Promise<FavoriteListDetail> {
  return useApi().get<FavoriteListDetail>(`/Cart/FavoriteLists/Detail/${favoriteListId}`)
}

/** 创建新的收藏夹分类。 */
export function createFavoriteList(request: CreateFavoriteListRequest): Promise<FavoriteListDetail> {
  return useApi().post<FavoriteListDetail, CreateFavoriteListRequest>(
    '/Cart/FavoriteLists/Add',
    request,
  )
}

/** 更新收藏夹名称、说明、默认状态和排序。 */
export function updateFavoriteList(
  favoriteListId: number,
  request: UpdateFavoriteListRequest,
): Promise<FavoriteListDetail> {
  return useApi().put<FavoriteListDetail, UpdateFavoriteListRequest>(
    `/Cart/FavoriteLists/Edit/${favoriteListId}`,
    request,
  )
}

/** 按乐观并发版本归档收藏夹。 */
export function archiveFavoriteList(
  favoriteListId: number,
  expectedVersion: number,
): Promise<void> {
  return useApi().delete<void>(
    `/Cart/FavoriteLists/Archive/${favoriteListId}`,
    { expectedVersion },
    { responseMode: 'raw' },
  )
}

/** 将一个商品 SPU 加入指定收藏夹；后端保证重复调用幂等。 */
export function addFavoriteItem(
  favoriteListId: number,
  productId: number,
): Promise<FavoriteListDetail> {
  return useApi().put<FavoriteListDetail>(
    `/Cart/FavoriteLists/AddItem/${favoriteListId}/${productId}`,
    undefined,
    { retryOnUnauthorized: true },
  )
}

/** 从指定收藏夹中永久移除一个商品。 */
export function deleteFavoriteItem(
  favoriteListId: number,
  productId: number,
): Promise<void> {
  return useApi().delete<void>(
    `/Cart/FavoriteLists/DeleteItem/${favoriteListId}/${productId}`,
    undefined,
    { responseMode: 'raw' },
  )
}

/** 将源收藏夹全部商品合并到目标收藏夹。 */
export function mergeFavoriteLists(
  sourceFavoriteListId: number,
  targetFavoriteListId: number,
): Promise<FavoriteListDetail> {
  return useApi().post<FavoriteListDetail, MergeFavoriteListRequest>(
    `/Cart/FavoriteLists/Merge/${sourceFavoriteListId}`,
    { targetFavoriteListId },
  )
}
