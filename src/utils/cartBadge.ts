import { listCarts } from '@/api/cart'

/**
 * 跨页面共享的购物车数量角标。
 *
 * 这里只缓存展示数量，不把购物车明细当作客户端权威状态；每次会员会话恢复或
 * 购物车写入成功后都可重新从 Cart 服务汇总。
 */
export function useCartBadge() {
  const count = useState<number>('member-cart-badge-count', () => 0)
  const isRefreshing = useState<boolean>('member-cart-badge-refreshing', () => false)

  async function refresh(silent = true): Promise<number> {
    if (isRefreshing.value) return count.value

    isRefreshing.value = true
    try {
      const carts = await listCarts({ silent })
      count.value = carts.reduce((total, cart) => total + cart.totalQuantity, 0)
      return count.value
    } finally {
      isRefreshing.value = false
    }
  }

  function clear(): void {
    count.value = 0
  }

  function setCount(value: number): void {
    count.value = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
  }

  return {
    count: readonly(count),
    refresh,
    clear,
    setCount,
  }
}
