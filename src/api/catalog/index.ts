import type {
  ProductBrandSelectItemResponse,
  ProductCategorySelectItemResponse,
  ProductCategoryTreeItemResponse,
  ProductDetailTemplateResponse,
  ProductSearchRankingQuery,
  ProductSearchRankingResponse,
  ProductSearchRequest,
  ProductSearchResponse,
  ProductSearchSelectionRequest,
  ProductSearchSelectionResponse,
  PublicProductDetailResponse,
  PublicProductPageRequest,
  PublicProductPageResponse,
} from './types'
import { useApi } from '@/api/request'

const PRODUCTS_API_BASE = '/Catalog/Products'
const PRODUCT_CATEGORIES_API_BASE = '/Catalog/ProductCategories'
const PRODUCT_BRANDS_API_BASE = '/Catalog/ProductBrands'
const PRODUCT_SEARCH_API_BASE = '/Catalog/ProductSearch'
const PRODUCT_DETAIL_TEMPLATE_API_BASE = '/Catalog/ProductDetailTemplate'

/** 分页查询当前公开可售商品。 */
export function pageProducts(
  request: PublicProductPageRequest = {},
): Promise<PublicProductPageResponse> {
  return useApi().post<PublicProductPageResponse, PublicProductPageRequest>(
    `${PRODUCTS_API_BASE}/PageList`,
    request,
    { auth: false },
  )
}

/** 获取一个公开可售商品的详情与 SKU。 */
export function getProductDetail(productId: number): Promise<PublicProductDetailResponse> {
  return useApi().get<PublicProductDetailResponse>(
    `${PRODUCTS_API_BASE}/Detail/${productId}`,
    undefined,
    { auth: false },
  )
}

/** 获取启用商品类目的扁平下拉数据。 */
export function listProductCategories(): Promise<ProductCategorySelectItemResponse[]> {
  return useApi().get<ProductCategorySelectItemResponse[]>(
    `${PRODUCT_CATEGORIES_API_BASE}/SelectData`,
    undefined,
    { auth: false },
  )
}

/** 获取启用商品类目的递归树。 */
export function getProductCategoryTree(): Promise<ProductCategoryTreeItemResponse[]> {
  return useApi().get<ProductCategoryTreeItemResponse[]>(
    `${PRODUCT_CATEGORIES_API_BASE}/TreeData`,
    undefined,
    { auth: false },
  )
}

/** 获取启用品牌下拉数据。 */
export function listProductBrands(): Promise<ProductBrandSelectItemResponse[]> {
  return useApi().get<ProductBrandSelectItemResponse[]>(
    `${PRODUCT_BRANDS_API_BASE}/SelectData`,
    undefined,
    { auth: false },
  )
}

/** 按关键词和可选类目搜索当前可售商品。 */
export function searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse> {
  return useApi().post<ProductSearchResponse, ProductSearchRequest>(
    `${PRODUCT_SEARCH_API_BASE}/Products`,
    request,
    { auth: false },
  )
}

/** 幂等记录用户从某次搜索结果中选中的商品；后台归因失败不主动打扰用户。 */
export function recordProductSearchSelection(
  request: ProductSearchSelectionRequest,
): Promise<ProductSearchSelectionResponse> {
  return useApi().post<ProductSearchSelectionResponse, ProductSearchSelectionRequest>(
    `${PRODUCT_SEARCH_API_BASE}/Selections`,
    request,
    { auth: false, silent: true },
  )
}

/** 获取全局或指定类目范围内的商品搜索排行榜。 */
export function getProductSearchRankings(
  query: ProductSearchRankingQuery = {},
): Promise<ProductSearchRankingResponse> {
  return useApi().get<ProductSearchRankingResponse>(
    `${PRODUCT_SEARCH_API_BASE}/Rankings`,
    {
      categoryId: query.categoryId,
      limit: query.limit,
    },
    { auth: false },
  )
}

/**
 * 获取类目与可选品牌当前生效的详情模板。
 *
 * 该历史接口直接返回 DTO，不使用商城 ApiResult 外壳。
 */
export function getActiveProductDetailTemplate(
  categoryId: number,
  brandId?: number | null,
): Promise<ProductDetailTemplateResponse> {
  return useApi().get<ProductDetailTemplateResponse>(
    `${PRODUCT_DETAIL_TEMPLATE_API_BASE}/GetActive/${categoryId}`,
    brandId == null ? undefined : { brandId },
    { auth: false, responseMode: 'raw' },
  )
}
