/**
 * 简单请求序号令牌：快速切换时丢弃过期响应，避免旧请求覆盖新数据。
 */
export function createRequestEpoch() {
  let epoch = 0
  return {
    next(): number {
      epoch += 1
      return epoch
    },
    isCurrent(token: number): boolean {
      return token === epoch
    },
  }
}
