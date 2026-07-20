import type { OrderModuleStatus } from './types'
import { useApi } from '@/api/request'

/** 订单模块尚未使用 ApiResult 外壳，因此显式按原始响应解析。 */
export function getOrderModuleStatus(): Promise<OrderModuleStatus> {
  return useApi().get<OrderModuleStatus>(
    '/Order/OrderModule/Module',
    undefined,
    { auth: false, responseMode: 'raw', silent: true },
  )
}
