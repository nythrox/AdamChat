import {
  BaseQueryBuilder,
  Context,
  eq,
  QueryBuilder,
  type Ref as _Ref,
  type Source,
} from "@tanstack/db";

import { createRefProxy as tanstackCreateRefProxy } from "@tanstack/db/ref-proxy";
import { OrderByDirection } from "@tanstack/db/ir";

export type QueryBodyOptions = ReturnType<
  typeof coolerQueryBuilder
>["queryBodyOptions"];

export const coolerQueryBuilder = () => {
  const query = new BaseQueryBuilder({});

  let sourcecount = 0;
  const nextName = () => `source${++sourcecount}`;

  const getProxy = () => {
    const aliases = query._getCurrentAliases();
    const refProxy = tanstackCreateRefProxy(aliases);
    return refProxy;
  };

  const selectOptions = <T>() => {
    const opts = {
      __query: null! as T,
      having: (condition: any) => {
        Object.assign(
          query,
          query.having(() => condition)
        );
        return opts;
      },
      orderBy: (options: OrderByDirection | OrderByOptions) => {
        Object.assign(
          query,
          query.orderBy(() => options)
        );
        return opts;
      },
      groupBy: (options: any) => {
        Object.assign(
          query,
          query.groupBy(() => options)
        );
        return opts;
      },
      limit: (count: number) => {
        Object.assign(query, query.limit(count));
        return opts;
      },
      offset: (count: number) => {
        Object.assign(query, query.offset(count));
        return opts;
      },
      distinct: () => {
        Object.assign(query, query.distinct());
        return opts;
      },
    };
    return opts
  };
  // beautiful ts hack
  let from!: BaseQueryBuilder<Context>["from"];
  let select!: BaseQueryBuilder<Context>["select"];
  type ProxifiedSource<TSource extends Source[string]> =
    ReturnType<typeof from<{ q: TSource }>> extends QueryBuilder<{
      schema: { q: infer U };
      baseSchema: any;
      fromSourceName: any;
    }>
      ? U
      : never;
  const queryBodyOptions = {
    from: <TSource extends Source[string]>(
      source: TSource
    ): ProxifiedSource<TSource> => {
      const name = nextName();
      Object.assign(query, query.from({ [name]: source }));
      return getProxy()[name];
    },
    join<
      TSource extends Source[string],
      TJoinType extends `inner` | `left` | `right` | `full` = "inner",
    >(source: TSource, on: any, type?: TJoinType): ProxifiedSource<TSource> {
      const name = nextName();
      Object.assign(
        query,
        query.join({ [name]: source }, () => eq(1, 1), type ?? "inner")
      );
      return getProxy()[name];
    },
    where: (cond: any) => {
      Object.assign(query, query.where(cond));
    },
    select: <TSelectObject extends SelectObject>(selection: TSelectObject) => {
      Object.assign(
        query,
        query.select(() => selection)
      );
      return selectOptions<ReturnType<typeof select<TSelectObject>>>();
    },
  };

  return {
    selectOptions,
    queryBodyOptions,
  };
};
