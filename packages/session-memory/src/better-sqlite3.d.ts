declare module 'better-sqlite3' {
  class Statement<T = any> {
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint }
    get(...params: any[]): T | undefined
    all(...params: any[]): T[]
  }

  class Database {
    exec(sql: string): this
    prepare(sql: string): Statement
    pragma(pragma: string): any
    close(): void
    constructor(filename: string, options?: any)
  }

  export default Database
}
