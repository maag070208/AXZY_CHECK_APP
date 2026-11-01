/**
 * Base local real para pruebas offline: corre el esquema y el SQL de verdad con el SQLite de Node,
 * con la misma forma mínima que op-sqlite (`execute`, `executeBatch`, `transaction`).
 */
const { DatabaseSync } = (globalThis as any).process.getBuiltinModule('node:sqlite');

export const createTestDb = () => {
  const native = new DatabaseSync(':memory:');
  const execute = async (sql: string, params: any[] = []) => {
    const statement = native.prepare(sql);
    if (/^\s*(SELECT|PRAGMA)/i.test(sql)) {
      return { rows: statement.all(...params) };
    }
    statement.run(...params);
    return { rows: [] };
  };
  return {
    execute,
    executeBatch: async (commands: string[][]) => {
      for (const [sql] of commands) native.exec(sql);
    },
    transaction: async (work: (tx: { execute: typeof execute }) => Promise<void>) => {
      native.exec('BEGIN');
      try {
        await work({ execute });
        native.exec('COMMIT');
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => native.close(),
    delete: () => undefined,
  };
};
