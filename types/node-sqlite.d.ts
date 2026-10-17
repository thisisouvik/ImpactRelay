declare module "node:sqlite" {
  export type SqliteRunResult = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  export interface StatementSync {
    all<T extends Record<string, unknown>>(...params: unknown[]): T[];
    get<T extends Record<string, unknown>>(...params: unknown[]): T | undefined;
    run(...params: unknown[]): SqliteRunResult;
  }

  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
