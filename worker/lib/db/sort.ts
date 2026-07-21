// 分类/书签通用批量排序：按 ids 下标写 sort，受 D1 参数上限约束分块提交

// D1 单条预处理语句最多绑定 100 个参数；本 UPDATE 每个 id 用 3 个参数
// （CASE 的 WHEN ? THEN ? 两个 + WHERE IN (?) 一个），故每批最多 33 个 id，取 30 留余量。
export const SORT_UPDATE_CHUNK_SIZE = 30

export type SortTable = 'categories' | 'bookmarks'

export type SortUpdateChunk = {
  sql: string
  params: number[]
}

export function buildSortUpdateChunks(table: SortTable, ids: number[]): SortUpdateChunk[] {
  const chunks: SortUpdateChunk[] = []

  for (let start = 0; start < ids.length; start += SORT_UPDATE_CHUNK_SIZE) {
    const chunk = ids.slice(start, start + SORT_UPDATE_CHUNK_SIZE)
    const cases = chunk.map(() => 'WHEN ? THEN ?').join(' ')
    const where = chunk.map(() => '?').join(', ')
    const params: number[] = []

    chunk.forEach((id, index) => {
      params.push(id, start + index)
    })
    params.push(...chunk)

    chunks.push({
      sql: `UPDATE ${table} SET sort = CASE id ${cases} ELSE sort END WHERE id IN (${where})`,
      params,
    })
  }

  return chunks
}

export async function sortRowsByIds(
  db: D1Database,
  table: SortTable,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return

  const stmts = buildSortUpdateChunks(table, ids).map((chunk) => (
    db.prepare(chunk.sql).bind(...chunk.params)
  ))

  if (stmts.length === 1) {
    await stmts[0].run()
  } else {
    await db.batch(stmts)
  }
}
