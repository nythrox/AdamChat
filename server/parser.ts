import {
  type Collection,
  compileQuery,
  type Context,
  eq,
  type QueryBuilder,
} from "@tanstack/db";
import { writeFileSync } from "fs";
import { owo } from "./index.ts";

export const BaseExpressionClass = Object.getPrototypeOf(
  Object.getPrototypeOf(eq(1, 1)).constructor
) as {
  new (): BaseExpr;
};

type SelectResult =
  | Collection
  | QueryBuilder<Context>
  | Record<string, Collection | QueryBuilder<Context>>;

selectToLiveQuery(owo());

export type QueryIR = Parameters<typeof compileQuery>[0];
type Expr = QueryIR["from"] | Exclude<QueryIR["select"], undefined>[string];

type Dependency =
  | CollectionDependency
  | ExprDependency
  | AggregateDependency
  | SelectionDependency;

type CollectionDependency = {
  type: "collection";
  conditions: ExprDependency[];
  collection: Collection;

  dependedUpon: Dependency[];
  dependsOn: Dependency[];
};

type ExprDependency = {
  type: "expr";
  expr: AST;
  dependedUpon: Dependency[];
  dependsOn: Dependency[];
};

type SelectionDependency = {
  type: "select";
  select: SelectAST;

  dependedUpon: Dependency[];
  dependsOn: Dependency[];
};

type AggregateDependency = {
  type: "aggregate";
  agg: AST;
  dependedUpon: Dependency[];
  dependsOn: Dependency[];
};

type BaseExpr = Exclude<QueryIR["select"], undefined>[string] | QueryIR["from"];

type SelectAST = {
  __type: "selection";
  selection: AST | Record<string, AST>;
  groupBy?: QueryIR["groupBy"];
  having?: QueryIR["having"];
  orderBy?: QueryIR["orderBy"];
  limit?: QueryIR["limit"];
  offset?: QueryIR["offset"];
  distinct?: true;
};

export type AST =
  | (BaseExpr & {
      type: "queryRef" | "agg" | "val" | "ref" | "collectionRef" | "func";
    })
  | SelectAST;

function selectToLiveQuery(select: SelectAST) {
  const depmap = new Map<object, Dependency>();
  function walkAST(expr: AST, parent?: Dependency) {
    if ("__type" in expr) {
      const select =
        depmap.get(expr) ??
        ({
          type: "select" as const,
          dependedUpon: [],
          dependsOn: [],
          select: expr,
        } satisfies SelectionDependency);
      parent && select.dependedUpon.push(parent);
      parent && parent.dependsOn.push(select);
      depmap.set(expr, select);
      if (expr.selection instanceof BaseExpressionClass)
        walkAST(expr.selection, select);
      else
        for (const prop in expr.selection)
          walkAST(expr.selection[prop], select);
    } else if (expr.type == "collectionRef") {
      const dep =
        depmap.get(expr) ??
        ({
          type: "collection",
          conditions: [],
          collection: expr.collection,
          dependedUpon: [],
          dependsOn: [],
        } satisfies CollectionDependency);
      parent && dep.dependedUpon.push(parent);
      parent && parent.dependsOn.push(dep);
      depmap.set(expr, dep);
    } else if (expr.type == "agg") {
      const dep =
        depmap.get(expr) ??
        ({
          type: "aggregate",
          agg: expr,
          dependedUpon: [],
          dependsOn: [],
        } satisfies AggregateDependency);
      parent && dep.dependedUpon.push(parent);
      parent && parent.dependsOn.push(dep);
      depmap.set(expr, dep);
      expr.args.forEach((arg) => walkAST(arg, dep));
    } else {
      const dep =
        depmap.get(expr) ??
        ({
          type: "expr",
          expr: expr,
          dependedUpon: [],
          dependsOn: [],
        } satisfies ExprDependency);
      parent && dep.dependedUpon.push(parent);
      parent && parent.dependsOn.push(dep);
      depmap.set(expr, dep);
      if (expr.type == "ref") {
        if (expr.path.length) {
          walkAST(expr.path[0], dep);
        }
      } else if (expr.type == "func") {
        expr.args.forEach((arg) => walkAST(arg, dep));
      } else if (expr.type == "queryRef") {
        walkAST(expr.query, dep);
      } else if (expr.type == "val") {
      }
    }
  }

  walkAST(select, undefined);

  const deps = [...depmap.values()];

  console.log(
    "top-level deps",
    deps.filter((d) => d.dependsOn.length == 0)
  );

  writeFileSync(
    "./ast.json",
    JSON.stringify(
      select,
      (key, obj) => {
        if (obj && typeof obj == "object" && "config" in obj) {
          return { id: obj.id, type: "__collectionRef" };
        } else return obj;
      },
      2
    )
  );
  // console.log(selection.args[0]);
  // console.log(selection.args[0].args[0]);
}
