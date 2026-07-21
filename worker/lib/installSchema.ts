import schemaSql from '../../schema.sql'

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let statement = ''
  let quote: "'" | '"' | '`' | ']' | null = null
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index]
    const next = sql[index + 1]

    if (inLineComment) {
      if (character === '\n') {
        inLineComment = false
        statement += '\n'
      }
      continue
    }

    if (inBlockComment) {
      if (character === '*' && next === '/') {
        inBlockComment = false
        statement += ' '
        index += 1
      }
      continue
    }

    if (quote) {
      statement += character
      if (character === quote) {
        if (quote !== ']' && next === quote) {
          statement += next
          index += 1
        } else {
          quote = null
        }
      }
      continue
    }

    if (character === '-' && next === '-') {
      inLineComment = true
      statement += ' '
      index += 1
      continue
    }
    if (character === '/' && next === '*') {
      inBlockComment = true
      statement += ' '
      index += 1
      continue
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character
      statement += character
      continue
    }
    if (character === '[') {
      quote = ']'
      statement += character
      continue
    }
    if (character === ';') {
      const trimmed = statement.trim()
      if (trimmed) statements.push(trimmed)
      statement = ''
      continue
    }

    statement += character
  }

  const trimmed = statement.trim()
  if (trimmed) statements.push(trimmed)
  return statements
}

export async function initializeSchema(db: D1Database): Promise<void> {
  const statements = splitSqlStatements(schemaSql)
  if (statements.length === 0) throw new Error('installation schema is empty')

  const results = await db.batch(statements.map((statement) => db.prepare(statement)))
  const failed = results.find((result) => !result.success)
  if (failed) throw new Error(failed.error ?? 'installation schema statement failed')
}
