// Pengganti next/headers: cookie store di memori, dibagi lewat globalThis.
const jar = (globalThis.__cookieJar ??= new Map());
export async function cookies() {
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name, value) => { jar.set(name, value); },
    delete: (name) => { jar.delete(name); },
  };
}
