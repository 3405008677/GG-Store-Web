/**
 * 解析后端返回的 UTC DateTime。
 *
 * MySQL 读取出的 DateTime 可能没有 Kind，System.Text.Json 因而不会附加 `Z`。
 * 对没有时区后缀的值按后端统一的 UTC 存储约定处理，避免浏览器误当成本地时间。
 */
export function parseApiDateTime(value: string): Date {
  const normalized = /(?:z|[+-]\d{2}:\d{2})$/iu.test(value)
    ? value
    : `${value}Z`
  return new Date(normalized)
}
