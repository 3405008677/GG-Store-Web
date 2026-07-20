import type {
  AddShippingAddressRequest,
  DeleteShippingAddressesRequest,
  DeleteShippingAddressesResponse,
  EditShippingAddressRequest,
  EditUserProfileRequest,
  SetDefaultShippingAddressRequest,
  ShippingAddressDetail,
  ShippingAddressPageListRequest,
  ShippingAddressSelectData,
  UserProfileDetail,
} from './types'
import { useApi } from '@/api/request'
import type { PagedResult } from '@/types/api'

const PROFILE_API_BASE = '/UserManage/Profile'
const SHIPPING_ADDRESS_API_BASE = '/UserManage/ShippingAddresses'

/** 获取当前登录会员的完整个人资料。 */
export function getUserProfile(): Promise<UserProfileDetail> {
  return useApi().get<UserProfileDetail>(`${PROFILE_API_BASE}/Detail`)
}

/** 使用资料版本执行乐观并发更新。 */
export function editUserProfile(request: EditUserProfileRequest): Promise<UserProfileDetail> {
  return useApi().post<UserProfileDetail, EditUserProfileRequest>(
    `${PROFILE_API_BASE}/Edit`,
    request,
  )
}

/**
 * 分页搜索当前会员地址。
 *
 * 该 POST 只读取数据，可以在 Access Token 刷新后安全重放。
 */
export function pageShippingAddresses(
  request: ShippingAddressPageListRequest,
): Promise<PagedResult<ShippingAddressDetail>> {
  return useApi().post<
    PagedResult<ShippingAddressDetail>,
    ShippingAddressPageListRequest
  >(`${SHIPPING_ADDRESS_API_BASE}/PageList`, request, {
    retryOnUnauthorized: true,
  })
}

/** 获取当前会员的一条收货地址详情。 */
export function getShippingAddress(addressId: number): Promise<ShippingAddressDetail> {
  return useApi().get<ShippingAddressDetail>(
    `${SHIPPING_ADDRESS_API_BASE}/Detail/${addressId}`,
  )
}

/** 获取订单确认等场景使用的精简地址下拉数据。 */
export function getShippingAddressSelectData(): Promise<ShippingAddressSelectData[]> {
  return useApi().get<ShippingAddressSelectData[]>(
    `${SHIPPING_ADDRESS_API_BASE}/SelectData`,
  )
}

/** 新增收货地址；首条地址会由后端自动设为默认。 */
export function addShippingAddress(
  request: AddShippingAddressRequest,
): Promise<ShippingAddressDetail> {
  return useApi().post<ShippingAddressDetail, AddShippingAddressRequest>(
    `${SHIPPING_ADDRESS_API_BASE}/Add`,
    request,
  )
}

/** 按地址版本编辑当前会员自己的地址。 */
export function editShippingAddress(
  addressId: number,
  request: EditShippingAddressRequest,
): Promise<ShippingAddressDetail> {
  return useApi().post<ShippingAddressDetail, EditShippingAddressRequest>(
    `${SHIPPING_ADDRESS_API_BASE}/Edit/${addressId}`,
    request,
  )
}

/** 批量逻辑删除地址；任一版本冲突时后端整批回滚。 */
export function deleteShippingAddresses(
  request: DeleteShippingAddressesRequest,
): Promise<DeleteShippingAddressesResponse> {
  return useApi().post<
    DeleteShippingAddressesResponse,
    DeleteShippingAddressesRequest
  >(`${SHIPPING_ADDRESS_API_BASE}/Del`, request)
}

/** 使用目标地址版本原子切换默认收货地址。 */
export function setDefaultShippingAddress(
  addressId: number,
  request: SetDefaultShippingAddressRequest,
): Promise<ShippingAddressDetail> {
  return useApi().post<ShippingAddressDetail, SetDefaultShippingAddressRequest>(
    `${SHIPPING_ADDRESS_API_BASE}/SetDefault/${addressId}`,
    request,
  )
}
