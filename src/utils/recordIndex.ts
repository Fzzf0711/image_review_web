/**
 * 记录索引工具 - 使用 Map 快速查找
 * 解决双重循环性能问题（O(n²) -> O(n)）
 */

export class RecordIndex<T extends { pose_code: string }> {
  private index = new Map<string, T>()

  /**
   * 构建索引
   */
  build(records: T[]) {
    this.index.clear()
    records.forEach((record) => {
      this.index.set(record.pose_code, record)
    })
  }

  /**
   * 快速查找记录
   */
  get(poseCode: string): T | undefined {
    return this.index.get(poseCode)
  }

  /**
   * 获取索引大小
   */
  size(): number {
    return this.index.size
  }

  /**
   * 更新单条记录
   */
  update(record: T) {
    this.index.set(record.pose_code, record)
  }

  /**
   * 删除记录
   */
  delete(poseCode: string) {
    this.index.delete(poseCode)
  }
}
