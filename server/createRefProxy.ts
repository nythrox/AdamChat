import type { RefProxy } from "@tanstack/db/ref-proxy";
import { type AST } from "./parser.ts";

export function createRefProxy<T extends Record<string, any>>(
  ref: AST,
  conditions: any
): RefProxy<T> & T {
  const cache = new Map<string, any>();
  const spreadSentinels = new Set<string>(); // Track which aliases have been spread

  function createProxy(path: Array<string>): any {
    const pathKey = path.join(`.`);
    if (cache.has(pathKey)) {
      return cache.get(pathKey);
    }

    const proxy = new Proxy({} as any, {
      get(target, prop, receiver) {
        if (prop === `__refProxy`) return true;
        if (prop === `__path`) return path;
        if (prop === `__type`) return undefined; // Type is only for TypeScript inference
        if (typeof prop === `symbol`)
          return Reflect.get(target, prop, receiver);

        const newPath = [...path, String(prop)];
        return createProxy(newPath);
      },

      has(target, prop) {
        if (prop === `__refProxy` || prop === `__path` || prop === `__type`)
          return true;
        return Reflect.has(target, prop);
      },

      ownKeys(target) {
        // If this is a table-level proxy (path length 1), mark it as spread
        if (path.length === 1) {
          const aliasName = path[0]!;
          spreadSentinels.add(aliasName);
        }
        return Reflect.ownKeys(target);
      },

      getOwnPropertyDescriptor(target, prop) {
        if (prop === `__refProxy` || prop === `__path` || prop === `__type`) {
          return { enumerable: false, configurable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });

    cache.set(pathKey, proxy);
    return proxy;
  }

  // Create the root proxy with all aliases as top-level properties
  const rootProxy = new Proxy({} as any, {
    get(target, prop, receiver) {
      if (prop === `__refProxy`) return true;
      if (prop === `__path`) return [ref];
      if (prop === `__type`) return undefined; // Type is only for TypeScript inference
      if (prop === `__spreadSentinels`) return spreadSentinels; // Expose spread sentinels
      if (prop === `__conditions`) return conditions; // Expose spread sentinels
      if (typeof prop === `symbol`) return Reflect.get(target, prop, receiver);

      const propStr = String(prop);
      return createProxy([ref, propStr]);
    },
  });

  return rootProxy;
}
