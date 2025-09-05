import isDeepEqual from "fast-deep-equal";
import { useRef } from "react";

export function useMemoValue<T>(
  value: T,
  isEqual: (prev: T, next: T) => unknown = isDeepEqual
): T {
  const ref = useRef(value);
  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }
  return ref.current;
}
import { useConvex } from "convex/react";
import {
  getFunctionName,
  type FunctionReference,
  type FunctionReturnType,
  type OptionalRestArgs,
} from "convex/server";
import { LRUCache } from "lru-cache";
import { useEffect, useState } from "react";

// LRU means "last recently used"
// this is basically a fancy Map with a limited capacity of 100 items (or however many you want)
// for the sake of saving memory
const cache = new LRUCache<string, NonNullable<unknown>>({
  max: 100,
});

function getCacheKey(
  query: FunctionReference<"query">,
  args: [args?: Record<string, unknown>]
) {
  // JSON.stringify is basic and misses some edge cases,
  // but is more than good enough for simple cases
  // you might consider a stable stringifier or something like superjson instead
  return JSON.stringify([getFunctionName(query), args]);
}

function getQueryCacheData<Query extends FunctionReference<"query">>(
  query: Query,
  args: OptionalRestArgs<Query>
) {
  return cache.get(getCacheKey(query, args)) as
    | FunctionReturnType<Query>
    | undefined;
}

function setQueryCacheData<Query extends FunctionReference<"query">>(
  query: Query,
  args: OptionalRestArgs<Query>,
  data: FunctionReturnType<Query>
) {
  cache.set(getCacheKey(query, args), data);
}

export function useSuspenseQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
) {
  const convex = useConvex();
  const cacheData = getQueryCacheData(query, args);

  if (cacheData === undefined) {
    throw new Promise<void>((resolve) => {
      const watch = convex.watchQuery(query, ...args);

      const result = watch.localQueryResult();
      if (result !== undefined) {
        setQueryCacheData(query, args, result);
        resolve();
        return;
      }

      const unsubscribe = watch.onUpdate(() => {
        const result = watch.localQueryResult();
        if (result === undefined) {
          throw new Error("No query result");
        }

        setQueryCacheData(query, args, result);
        resolve();
        unsubscribe();
      });
    });
  }

  const [data, setData] = useState(cacheData);

  // useMemoValue makes these arguments stable for useEffect
  const memoQuery = useMemoValue(
    query,
    (a, b) => getFunctionName(a) === getFunctionName(b)
  );
  const memoArgs = useMemoValue(args);

  useEffect(() => {
    const watch = convex.watchQuery(memoQuery, ...memoArgs);
    return watch.onUpdate(() => {
      const result = watch.localQueryResult();
      if (result === undefined) {
        throw new Error("No query result");
      }
      setData(result);
      setQueryCacheData(memoQuery, memoArgs, result);
    });
  }, [convex, memoQuery, memoArgs]);

  return data;
}
