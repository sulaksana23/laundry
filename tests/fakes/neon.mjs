// Pengganti @/server/db/neon untuk test: setiap query diteruskan ke
// globalThis.__fakeSql(text, params) yang diatur oleh masing-masing test.
export function getNeonSql() {
  return {
    query: async (text, params = []) => {
      if (typeof globalThis.__fakeSql !== "function") throw new Error("fake sql belum diatur");
      return globalThis.__fakeSql(text, params);
    },
  };
}
