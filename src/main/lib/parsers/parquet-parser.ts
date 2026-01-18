import type { ParsedData, ParsedColumn, ColumnType } from "./types"
import duckdb from "duckdb"

/**
 * Map DuckDB types to our column types
 */
function mapDuckDBType(duckdbType: string): ColumnType {
  const type = duckdbType?.toUpperCase() || ""

  // Integer types
  if (
    type.includes("INT") ||
    type.includes("BIGINT") ||
    type.includes("SMALLINT") ||
    type.includes("TINYINT") ||
    type.includes("HUGEINT")
  ) {
    return "number"
  }

  // Float types
  if (
    type.includes("FLOAT") ||
    type.includes("DOUBLE") ||
    type.includes("DECIMAL") ||
    type.includes("REAL")
  ) {
    return "number"
  }

  // Boolean
  if (type.includes("BOOL")) {
    return "boolean"
  }

  // Date/Time types
  if (
    type.includes("DATE") ||
    type.includes("TIME") ||
    type.includes("TIMESTAMP")
  ) {
    return "date"
  }

  // Default to string for everything else
  return "string"
}

/**
 * Process a row to handle BigInt and Date values for JSON serialization
 */
function processRow(row: Record<string, unknown>): Record<string, unknown> {
  const processed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "bigint") {
      processed[key] = Number(value)
    } else if (value instanceof Date) {
      processed[key] = value.toISOString()
    } else if (Buffer.isBuffer(value)) {
      processed[key] = value.toString("utf-8")
    } else {
      processed[key] = value
    }
  }
  return processed
}

/**
 * Execute a DuckDB query and return results as a promise
 */
function queryDuckDB(
  db: duckdb.Database,
  sql: string
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows as Record<string, unknown>[])
      }
    })
  })
}

/**
 * Parse a Parquet file and return structured data using DuckDB
 */
export async function parseParquetFile(
  filePath: string,
  options: { limit?: number; offset?: number } = {}
): Promise<ParsedData> {
  const { limit = 1000, offset = 0 } = options

  // Escape single quotes in file path for SQL
  const escapedPath = filePath.replace(/'/g, "''")

  const db = new duckdb.Database(":memory:")

  try {
    // Get column info using DESCRIBE
    const describeResult = await queryDuckDB(
      db,
      `DESCRIBE SELECT * FROM read_parquet('${escapedPath}')`
    )

    const columns: ParsedColumn[] = describeResult.map((row) => ({
      name: String(row.column_name || row.name || ""),
      type: mapDuckDBType(String(row.column_type || row.type || "")),
    }))

    // Get total row count
    const countResult = await queryDuckDB(
      db,
      `SELECT COUNT(*) as cnt FROM read_parquet('${escapedPath}')`
    )
    const totalRows = Number(countResult[0]?.cnt || 0)

    // Get rows with pagination
    const dataResult = await queryDuckDB(
      db,
      `SELECT * FROM read_parquet('${escapedPath}') LIMIT ${limit} OFFSET ${offset}`
    )

    const rows = dataResult.map(processRow)

    db.close()

    return {
      columns,
      rows,
      totalRows,
      truncated: offset + rows.length < totalRows,
    }
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Get row count from a Parquet file without reading all data
 */
export async function getParquetRowCount(filePath: string): Promise<number> {
  const escapedPath = filePath.replace(/'/g, "''")
  const db = new duckdb.Database(":memory:")

  try {
    const result = await queryDuckDB(
      db,
      `SELECT COUNT(*) as cnt FROM read_parquet('${escapedPath}')`
    )
    const count = Number(result[0]?.cnt || 0)
    db.close()
    return count
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Get column info from a Parquet file without reading data
 */
export async function getParquetColumns(
  filePath: string
): Promise<ParsedColumn[]> {
  const escapedPath = filePath.replace(/'/g, "''")
  const db = new duckdb.Database(":memory:")

  try {
    const result = await queryDuckDB(
      db,
      `DESCRIBE SELECT * FROM read_parquet('${escapedPath}')`
    )

    const columns: ParsedColumn[] = result.map((row) => ({
      name: String(row.column_name || row.name || ""),
      type: mapDuckDBType(String(row.column_type || row.type || "")),
    }))

    db.close()
    return columns
  } catch (error) {
    db.close()
    throw error
  }
}
