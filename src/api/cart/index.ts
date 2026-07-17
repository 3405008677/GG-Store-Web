import type {
  CartDetail,
  CartSummary,
  CreateCollectionRequest,
  FavoriteListDetail,
  FavoriteListSummary,
  UpdateCartItemRequest,
  UpdateCollectionRequest,
} from './types'
import { useApi } from '@/api/request'

/** 获取当前会员的全部有效购物车摘要。 */
export function listCarts(): Promise<CartSummary[]> {
  return useApi().get<CartSummary[]>('/Cart/Carts/List')
}

/** 获取指定购物车及商品明细。 */
export function getCart(cartId: number): Promise<CartDetail> {
  return useApi().get<CartDetail>(`/Cart/Carts/Get/${cartId}`)
}

/** 创建一个新的购物车分类。 */
export function createCart(request: CreateCollectionRequest): Promise<CartDetail> {
  return useApi().post<CartDetail, CreateCollectionRequest>('/Cart/Carts/Create', request)
}

/** 更新购物车名称、说明、默认状态和排序。 */
export function updateCart(cartId: number, request: UpdateCollectionRequest): Promise<CartDetail> {
  return useApi().put<CartDetail, UpdateCollectionRequest>(`/Cart/Carts/Update/${cartId}`, request)
}

/** 按乐观并发版本归档购物车。 */
export function archiveCart(cartId: number, expectedVersion: number): Promise<void> {
  return useApi().delete<void>(
    `/Cart/Carts/Archive/${cartId}`,
    { expectedVersion },
    { responseMode: 'raw' },
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
  return useApi().post<CartDetail, { targetCartId: number }>(
    `/Cart/Carts/Merge/${sourceCartId}`,
    { targetCartId },
  )
}

/** 获取当前会员的全部有效收藏夹摘要。 */
export function listFavoriteLists(): Promise<FavoriteListSummary[]> {
  return useApi().get<FavoriteListSummary[]>('/Cart/FavoriteLists/List')
}

/** 获取指定收藏夹及商品明细。 */
export function getFavoriteList(favoriteListId: number): Promise<FavoriteListDetail> {
  return useApi().get<FavoriteListDetail>(`/Cart/FavoriteLists/Get/${favoriteListId}`)
}

/** 创建新的收藏夹分类。 */
export function createFavoriteList(request: CreateCollectionRequest): Promise<FavoriteListDetail> {
  return useApi().post<FavoriteListDetail, CreateCollectionRequest>(
    '/Cart/FavoriteLists/Create',
    request,
  )
}

/** 更新收藏夹名称、说明、默认状态和排序。 */
export function updateFavoriteList(
  favoriteListId: number,
  request: UpdateCollectionRequest,
): Promise<FavoriteListDetail> {
  return useApi().put<FavoriteListDetail, UpdateCollectionRequest>(
    `/Cart/FavoriteLists/Update/${favoriteListId}`,
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
  return useApi().post<FavoriteListDetail, { targetFavoriteListId: number }>(
    `/Cart/FavoriteLists/Merge/${sourceFavoriteListId}`,
    { targetFavoriteListId },
  )
}
