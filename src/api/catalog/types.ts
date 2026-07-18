import type { PagedResult } from '@/types/api'

/** System.Text.Json 的 JsonElement 在前端对应的 JSON 值。 */
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

/** 公开商品分页排序方式；数值与后端 PublicProductSort 完全一致。 */
export enum PublicProductSort {
  Default = 0,
  PriceAscending = 1,
  PriceDescending = 2,
  Newest = 3,
}

/** 公开商品分页查询条件。 */
export interface PublicProductPageRequest {
  keyword?: string | null
  categoryId?: number | null
  brandId?: number | null
  minimumPrice?: number | null
  maximumPrice?: number | null
  sort?: PublicProductSort
  pageIndex?: number
  pageSize?: number
}

/** 公开商品分页列表项。 */
export interface PublicProductListItemResponse {
  productId: number
  tenantId: number
  merchantName: string
  categoryId: number
  categoryName: string
  brandId: number | null
  brandName: string | null
  name: string
  subtitle: string
  mainImage: string
  minimumPrice: number
  maximumPrice: number
  availableSkuCount: number
  createdAt: string
}

/** 公开商品 SKU。 */
export interface PublicProductSkuResponse {
  skuId: number
  skuCode: string
  specification: JsonValue
  price: number
  originalPrice: number
  availableStock: number
}

/** 商品详情模板字段的数据类型；数值与后端 ProductAttributeDataType 一致。 */
export enum ProductAttributeDataType {
  Text = 0,
  Integer = 1,
  Decimal = 2,
  Boolean = 3,
  DateTime = 4,
  SingleOption = 5,
  MultiOption = 6,
  Json = 7,
}

/** 模板字段写入商品或 SKU 的作用域。 */
export enum ProductAttributeValueScope {
  Product = 0,
  Sku = 1,
}

/** 模板可选项定义。 */
export interface ProductAttributeOptionDefinition {
  value: string
  label: string
  sortOrder: number
}

/** 内部模板定义中的字段描述。 */
export interface ProductDetailTemplateFieldDefinition {
  attributeDefinitionId: number
  code: string
  defaultLabel: string
  displayLabel: string
  dataType: ProductAttributeDataType
  valueScope: ProductAttributeValueScope
  groupCode: string
  groupLabel: string
  groupSortOrder: number
  sortOrder: number
  isRequired: boolean
  isFilterable: boolean
  isSearchable: boolean
  isSkuDimension: boolean
  unitCode: string | null
  helpText: string | null
  placeholder: string | null
  validationJson: string
  defaultValueJson: string | null
  allowedOptionValuesJson: string | null
  options: ProductAttributeOptionDefinition[]
}

/** 后端模板服务使用的完整版本定义。 */
export interface ProductDetailTemplateDefinition {
  templateId: number
  templateVersionId: number
  versionNumber: number
  categoryId: number
  brandId: number | null
  name: string
  schemaJson: string
  uiSchemaJson: string
  fields: ProductDetailTemplateFieldDefinition[]
}

/** 公开商品详情模板字段。 */
export interface ProductDetailFieldResponse {
  code: string
  label: string
  dataType: ProductAttributeDataType
  valueScope: ProductAttributeValueScope
  required: boolean
  filterable: boolean
  searchable: boolean
  skuDimension: boolean
  unit: string | null
  helpText: string | null
  placeholder: string | null
  validation: JsonValue
  defaultValue: JsonValue | null
  options: ProductAttributeOptionDefinition[]
}

/** 公开商品详情模板字段分组。 */
export interface ProductDetailFieldGroupResponse {
  code: string
  label: string
  sortOrder: number
  fields: ProductDetailFieldResponse[]
}

/** 当前生效或商品历史引用的详情模板。 */
export interface ProductDetailTemplateResponse {
  templateId: number
  templateVersionId: number
  version: number
  categoryId: number
  brandId: number | null
  name: string
  schema: JsonValue
  uiSchema: JsonValue
  groups: ProductDetailFieldGroupResponse[]
}

/** 公开商品详情。 */
export interface PublicProductDetailResponse {
  productId: number
  tenantId: number
  merchantName: string
  categoryId: number
  categoryName: string
  brandId: number | null
  brandName: string | null
  name: string
  subtitle: string
  mainImage: string
  description: string
  detail: JsonValue
  detailTemplateVersionId: number | null
  detailTemplate: ProductDetailTemplateResponse | null
  skus: PublicProductSkuResponse[]
  createdAt: string
  updatedAt: string
}

/** 启用商品类目的扁平下拉项。 */
export interface ProductCategorySelectItemResponse {
  value: number
  label: string
  parentId: number | null
  depth: number
  isLeaf: boolean
}

/** 启用商品类目的递归树节点。 */
export interface ProductCategoryTreeItemResponse {
  value: number
  label: string
  depth: number
  isLeaf: boolean
  children: ProductCategoryTreeItemResponse[]
}

/** 启用商品品牌的下拉项。 */
export interface ProductBrandSelectItemResponse {
  value: number
  label: string
  logoUrl: string
}

/** 商品聚合搜索条件。 */
export interface ProductSearchRequest {
  keyword: string
  categoryId?: number | null
  pageIndex?: number
  pageSize?: number
}

/** 搜索结果选中归因请求。 */
export interface ProductSearchSelectionRequest {
  searchRequestId: string
  operationId: string
  productId: number
  keyword: string
}

/** 商品聚合搜索结果项。 */
export interface ProductSearchItemResponse {
  productId: number
  tenantId: number
  merchantName: string
  categoryId: number
  categoryName: string
  name: string
  subtitle: string
  mainImage: string
  minimumPrice: number | null
  relevanceScore: number
  matchedField: string
  globalSearchCount: number
}

/** 商品聚合搜索响应。 */
export interface ProductSearchResponse {
  searchRequestId: string
  expiresAtUtc: string
  keyword: string
  categoryId: number | null
  items: ProductSearchItemResponse[]
  total: number
  pageIndex: number
  pageSize: number
}

/** 搜索结果选中归因响应。 */
export interface ProductSearchSelectionResponse {
  counted: boolean
  isReplay: boolean
  productId: number
  productCategoryId: number
  updatedCategoryIds: number[]
}

/** 商品搜索排行榜项。 */
export interface ProductSearchRankingItemResponse {
  rank: number
  productId: number
  tenantId: number
  merchantName: string
  productCategoryId: number
  productCategoryName: string
  name: string
  subtitle: string
  mainImage: string
  minimumPrice: number | null
  searchCount: number
  lastSearchedAtUtc: string
}

/** 商品搜索排行榜响应。 */
export interface ProductSearchRankingResponse {
  categoryId: number | null
  scopeName: string
  items: ProductSearchRankingItemResponse[]
}

/** 商品搜索排行榜查询参数。 */
export interface ProductSearchRankingQuery {
  categoryId?: number | null
  limit?: number
}

/** 详情模板字段校验结果。 */
export interface ProductDetailValidationResult {
  isValid: boolean
  errors: ProductDetailValidationError[]
}

/** 单个详情模板字段校验错误。 */
export interface ProductDetailValidationError {
  field: string
  code: string
  message: string
}

/** 公开商品分页响应。 */
export type PublicProductPageResponse = PagedResult<PublicProductListItemResponse>
