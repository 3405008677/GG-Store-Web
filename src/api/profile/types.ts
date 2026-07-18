/** 后端 UserGender 的数值枚举；当前接口没有启用字符串枚举序列化。 */
export type UserGender = 0 | 1 | 2 | 3

/** 当前登录会员的完整个人资料。 */
export interface UserProfileDetail {
  id: number
  username: string
  displayName: string
  email: string | null
  phoneNumber: string | null
  avatarUrl: string | null
  gender: UserGender
  /** ISO `yyyy-MM-dd`；未设置时为 null。 */
  birthday: string | null
  bio: string | null
  version: number
  createdAt: string
  updatedAt: string
}

/** 编辑个人资料请求；邮箱、账号手机号和用户名均为只读字段。 */
export interface EditUserProfileRequest {
  displayName: string
  avatarUrl: string | null
  gender: UserGender
  birthday: string | null
  bio: string | null
  /** 客户端最后读取到的资料版本。 */
  expectedVersion: number
}

/** 收货地址公共可编辑字段。 */
export interface ShippingAddressFields {
  receiverName: string
  phoneNumber: string
  countryCode: string
  province: string
  city: string
  district: string | null
  detailAddress: string
  postalCode: string | null
  label: string | null
  isDefault: boolean
}

/** 新增收货地址请求。 */
export type AddShippingAddressRequest = ShippingAddressFields

/** 编辑收货地址请求。 */
export interface EditShippingAddressRequest extends ShippingAddressFields {
  /** 客户端最后读取到的地址版本。 */
  expectedVersion: number
}

/** 收货地址分页搜索请求；搜索词放在请求体中，避免敏感数据进入 URL 日志。 */
export interface ShippingAddressPageListRequest {
  keyword?: string | null
  isDefault?: boolean | null
  pageIndex: number
  pageSize: number
}

/** 收货地址完整详情。 */
export interface ShippingAddressDetail {
  id: number
  receiverName: string
  phoneNumber: string
  countryCode: string
  province: string
  city: string
  district: string | null
  detailAddress: string
  postalCode: string | null
  label: string | null
  isDefault: boolean
  version: number
  createdAt: string
  updatedAt: string
}

/** 收货地址下拉选项；Label 是服务端拼接的可展示地址。 */
export interface ShippingAddressSelectData {
  value: number
  label: string
  isDefault: boolean
  version: number
}

/** 带乐观并发版本的地址删除项。 */
export interface VersionedShippingAddressDeleteItem {
  id: number
  expectedVersion: number
}

/** 批量删除收货地址请求。 */
export interface DeleteShippingAddressesRequest {
  items: VersionedShippingAddressDeleteItem[]
}

/** 批量删除收货地址结果。 */
export interface DeleteShippingAddressesResponse {
  deletedCount: number
}

/** 设置默认收货地址请求。 */
export interface SetDefaultShippingAddressRequest {
  expectedVersion: number
}
