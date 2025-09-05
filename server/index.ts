import dotenv from "dotenv";
import {
  BaseQueryBuilder,
  createCollection,
  createLiveQueryCollection,
  eq,
  count,
  type Ref as _Ref,
  length,
  liveQueryCollectionOptions,
  lt,
  Query,
  type QueryBuilder,
  type Context,
  type Collection,
  and,
  lte,
  type Source,
  not,
} from "@tanstack/db";

import { randomUUID, type UUID } from "crypto";
import { type AST, type QueryIR } from "./parser.ts";
import { isRefProxy, toExpression } from "@tanstack/db/ref-proxy";
import { createRefProxy } from "./createRefProxy.ts";
import { coolerQueryBuilder, QueryBodyOptions } from "./coolquery.ts";
// Load environment variables
dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:5173",
//     credentials: true,
//   })
// );
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true }));

// // Health check endpoint
// app.get("/health", (req, res) => {
//   res.json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//   });
// });

// app.get("/api/status", (req, res) => {
//   res.json({
//     message: "AdamChat Server is running!",
//     version: "1.0.0",
//   });
// });

// // Error handling middleware
// app.use(
//   (
//     err: Error,
//     req: express.Request,
//     res: express.Response,
//     next: express.NextFunction
//   ) => {
//     console.error(err.stack);
//     res.status(500).json({
//       error: "Something went wrong!",
//       message:
//         process.env.NODE_ENV === "development"
//           ? err.message
//           : "Internal server error",
//     });
//   }
// );

// // 404 handler
// app.use("*", (req, res) => {
//   res.status(404).json({ error: "Route not found" });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`�� Health check: http://localhost:${PORT}/health`);
//   console.log(`🔗 API status: http://localhost:${PORT}/api/status`);
// });

// export default app;

const fooCollection = createCollection<{ value: string }>({
  id: `foo`,
  getKey: (item) => item.value,
  startSync: true,
  sync: {
    sync: ({ begin, write, commit }) => {
      // Immediately execute the sync cycle
      begin();
      write({
        type: `insert`,
        value: { value: `initial value` },
      });
      commit();
    },
  },
});

fooCollection.subscribeChanges((changes) => {
  changes.forEach((change) => {
    change.type == "update";
  });
});

const completedTodoCollection = createLiveQueryCollection({
  startSync: true,
  query: (q) =>
    q
      .from({ todo: fooCollection })
      .where(({ todo }) => eq(todo.value, "owo"))
      .fn.where(({ todo }) => todo.value == "owo"),
});

const whatevercollectiondefaults = {
  id: "User",
  getKey: (u) => u.id,
  sync: {
    sync: () => {},
  },
};

const User = createCollection<{ username: string; id: string }>(
  whatevercollectiondefaults
);

const UsernameUniquenessRule = () => {};

const UsernameLengthRule = new Query()
  .from({ user: User })
  .where(({ user }) => lt(length(user.username), 3));
type ERefProxy<T> = {
  readonly __refProxy: true;
  readonly __path: Array<string>;
  readonly __type: T;
};

type Ref<T> = T extends {
  readonly __type: infer U;
}
  ? T
  : T extends {
        readonly __returnType: infer U;
      }
    ? ERefProxy<U>
    : T extends Record<string, any>
      ? {
          [p in keyof T]: Ref<T[p]>;
        }
      : ERefProxy<T>;
// T extends ExprOrRef<infer U>
//   ? ERefProxy<U>
//   : T extends Record<string, any>
//     ? _Ref<T>
//     : ERefProxy<T>;
function from<T extends { kind: string }, TKey extends string | number>(
  source: Collection<T, TKey>,
  where?:
    | true
    | {
        [p in keyof T]?: T[p] | ERefProxy<T[p]>;
      }
  // select?: <args extends any[]>(c: Collection<T, TKey>) => ReturnType<>
): Ref<T>;

// T extends { id: infer U; kind: "entity" }
//   ? U
//   : T extends { value: infer U; kind: "attribute" }
//     ? U
//     : T
function from<C extends Context>(source: QueryBuilder<C>): Ref<C["result"]>;

function from<E>(source: () => E): Ref<E>;

function from(o: any, on?: any): any {
  if (typeof o == "function") return o();
  else return createRefProxy(o, on);
}

function select(
  selection: AST | Ref<any> | Record<string, AST | Ref<any>>,
  options: Partial<QueryIR> = {}
) {
  for (const [key, value] of Object.entries(selection)) {
    if (isRefProxy(value)) {
      selection[key] = toExpression(value);
    } else if (
      typeof value === `object` &&
      `type` in value &&
      (value.type === `agg` || value.type === `func`)
    ) {
      selection[key] = value;
    } else {
      selection[key] = toExpression(value);
    }
  }
  return {
    __type: "selection",
    selection,
    ...options,
  } as const;
}

type ExprOrRef<T> =
  | {
      readonly __returnType: T;
    }
  | {
      readonly __type: T;
    };

// type AnyExpr = ReturnType<
//   Parameters<QueryBuilder<Context>["select"]>[0]
// >[string];

// declare function select<T extends SelectObject>(): Ref<T>;

function entity() {
  return createCollection<{ id: UUID; kind: "entity" }>({
    id: randomUUID(),
    getKey: (u) => u.id,
    sync: {
      sync: () => {},
    },
  });
}
// declare function relationship<T = UUID>(): Collection<{ id: T }, string>;
function attribute<T>() {
  return createCollection<{
    value: T;
    kind: "attribute";
    entity: UUID;
    id: UUID;
  }>({
    id: randomUUID(),
    getKey: (u) => u.id,
    sync: {
      sync: () => {},
    },
  });
}

type ContextSchema = Record<string, unknown>;

type QueryBuilderWithResult<T> = QueryBuilder<{
  baseSchema: ContextSchema;
  schema: ContextSchema;
  fromSourceName: string;
  result: T;
}>;

const fromMany: BaseQueryBuilder<Context>["from"] = <S extends Source>(
  sources: S
) => {
  let qb = new Query().from({ _mock: User });
  Object.entries(sources).forEach(([key, source]) => {
    qb = qb.innerJoin({ [key]: source }, () => eq(1, 1));
  });
  // console.log("owo", qb.query.join);

  return qb;
};

const Employee = entity();
const PersonName = attribute<string>();
const PersonTitle = attribute<string>();
const Gender = attribute<string>();
const IsCEO = attribute();
const ReportsTo = attribute<UUID>();

const validEmployees = createLiveQueryCollection((q) =>
  q
    .from({
      employee: Employee,
    })
    .select(({ employee }) => {
      const nameCount = q
        .from({ name: PersonName })
        .where(({ name }) => eq(name.entity, employee.id))
        .select(({ name }) => ({ count: count(name) }));
      const genderCount = q
        .from({ gender: Gender })
        .where(({ gender }) => eq(gender.entity, employee.id))
        .select(({ gender }) => ({ count: count(gender) }));
      const titleCount = q
        .from({ title: PersonTitle })
        .where(({ title }) => eq(title.entity, employee.id))
        .select(({ title }) => ({ count: count(title) }));
      const reportsToCount = q
        .from({ reportsTo: ReportsTo })
        .where(({ reportsTo }) => eq(reportsTo.entity, employee.id))
        .select(({ reportsTo }) => ({ count: count(reportsTo) }));
      return fromMany({
        nameCount,
        genderCount,
        titleCount,
        reportsToCount,
      }).select(({ genderCount, nameCount, reportsToCount, titleCount }) => ({
        valid: and(
          eq(nameCount.count, 1),
          eq(genderCount.count, 1),
          eq(titleCount.count, 1),
          lte(reportsToCount.count, 1)
        ),
      }));
    })
);

const postsCollection = attribute<{
  userId: string;
  id: string;
  title: string;
}>();
const usersCollection = attribute<{
  id: string;
  name: string;
  active: boolean;
}>();

const activeUsers = createLiveQueryCollection((q) =>
  q
    .from({ user: usersCollection })
    .where(({ user }) => eq(user.value.active, true))
);

// user = User()
// post = Post()
// eq(user.id, post.userId)
// return { userId: user.id, postsCount: count(post) }
// # get the +1 -1 mechanism to local
const UserPostCount = createLiveQueryCollection((q) =>
  q
    .from({ post: postsCollection })
    .groupBy(({ post }) => post.value.userId)
    .select(({ post }) => ({
      userId: post.value.userId,
      postsCount: count(post),
    }))
);

const topUsers = createCollection(
  liveQueryCollectionOptions({
    query: (q) => {
      // Build the user stats subquery
      const userStats = q
        .from({ user: usersCollection })
        .select(({ user }) => ({
          id: user.value.id,
          name: user.value.name,
          count: q
            .from({ post: postsCollection })
            .where(({ post }) => eq(post.value.userId, user.value.id))
            .select(({ post }) => ({
              count: count(post.value.id),
            })),
        }))
        .orderBy(({ user }) => user.owo, "desc")
        .limit(10);

      // Use the user stats subquery in the main query
      return userStats;
    },
  })
);

/*
owo = name, valid in
  employee = Employee
  name = PersonName where .entity = employee.id
  nameCount = count name
  genderCount = count PersonName where .entity = employee.id
  titleCount = count PersonName where .entity = employee.id
  reportsToCount = count PersonName where .entity = employee.id
  valid = nameCount == 1 and genderCount == 1 and titleCount == 1 and reportsToCount <= 1 


select name, nameCount = 1, genderCount = 1, titleCount = 1, reportsToCount = 1
  from (select name from PersonName where .entity = employee.id), select (count PersonName where .entity = employee.id) ... GROUP BY name
    from employee 

 */

const query = <Q extends QueryBuilderWithResult<any>>(
  fn: (q: QueryBodyOptions) => { __query: Q }
): Q => {
  const qb = coolerQueryBuilder();
  const result = fn(qb.queryBodyOptions);
  return qb;
  // return {
  //   query: (isRefProxy(result) ? toExpression(result) : result) as any,
  // } as unknown as QueryBuilderWithResult<T>;
};

export const owo = query((q) => {
  const employee = q.from(Employee);
  const name = q.join(PersonName, { entity: employee.id });
  const nameCount = count(name);
  const genderCount = count(q.join(Gender, { entity: employee.id }));
  const titleCount = count(q.join(PersonTitle, { entity: employee.id }));
  const reportsToCount = count(q.join(ReportsTo, { entity: employee.id }));

  q.where(eq(employee.id, "12345"));

  return q
    .select({
      valid: and(
        eq(nameCount, 1),
        eq(genderCount, 1),
        eq(titleCount, 1),
        lte(reportsToCount, 1)
      ),
      name: name.value,
    })
    .limit(0);
});

// selectToLiveQuery(select(Employee).kind);

// PropRef<T> | Value<T> | Func<T>
// CollectionRef | QueryRef | Aggregate

// BasicExpression, Aggregate, CollectionRef, QueryRef;

const _employee = from(Employee);
const _employee_id = _employee.id;

const _nameCount_name = from(PersonName);
const _nameCount_name_entity = _nameCount_name.entity;
const _nameCount_name_eq = eq(_nameCount_name_entity, _employee_id);
const _nameCount_eq_count = count(_nameCount_name);

const _nameCount = from(() => _nameCount_eq_count);

const _nameCount_eq = eq(_nameCount, 1);

const _ret = from(() => _nameCount_eq);

const UsernameLengthRuleCollection = createCollection(
  liveQueryCollectionOptions({
    query: (q) => UsernameLengthRule,
  })
);

UsernameLengthRuleCollection.subscribeChanges((changes) => {
  changes.forEach((change) => {
    if (change.type == "insert" || change.type == "update") {
      console.log("Violation", change.value);
    }
  });
});

const Conversations = createCollection<{
  name: string;
  isGroup: string;
  id: string;
}>(whatevercollectiondefaults);

const Users = createCollection<{
  id: string;
}>(whatevercollectiondefaults);

const Profiles = createCollection<{
  userId: string;
  displayName: string;
  avatar?: string;
  status?: string;
  lastSeen: number;
  isOnline: boolean;
  preferredLanguage: string;
}>(whatevercollectiondefaults);

const Messages = createCollection<{
  conversationId: string;
  senderId: string;
  id: string;
  content: string;
  messageType: "text" | "image";
  createdAt: string;
  updatedAt: string;
  translations?: Record<string, string>;
}>(whatevercollectiondefaults);

const ConversationUsers = createCollection<{
  userId: string;
  conversationId: string;
  role: string;
}>(whatevercollectiondefaults);

const MessageStatusForUser = createCollection<{
  messageId: string;
  userId: string;
  status: "read" | "delivered" | "undelivered";
}>(whatevercollectiondefaults);

const ConversationLastMessage = createLiveQueryCollection({
  query: query((q) => {
    const c = q.from(Conversations);
    const lastMessageForConversationQuery = query(() => {
      const message = q.from(Messages);
      return q.select(message).orderBy(message.createdAt).limit(1);
    });
    const latestMessage = q.join(lastMessageForConversationQuery, {
      conversationId: c.id,
    });
    return q.select(latestMessage);
  }),
});

const ConversationUnreadCount = createLiveQueryCollection({
  query: query(({ join, from, select, where }) => {
    const { conversationId, userId } = from(ConversationUsers);
    const message = join(Messages, { conversationId, senderId: not(userId) });
    const { status } = join(MessageStatusForUser, {
      messageId: message.id,
      userId,
    });
    where(not(eq(status, "read")));
    const unreadMessageCount = count(status);
    return select({ conversationId, userId, unreadMessageCount }).groupBy([
      conversationId,
      userId,
    ]);
  }),
});

new Query()
  .from({ conversationUser: ConversationUsers })
  .join({ message: Messages }, ({ conversationUser, message }) =>
    eq(conversationUser.conversationId, message.conversationId)
  )
  .join({ status: MessageStatusForUser }, ({ message, status }) =>
    eq(message.id, status.messageId)
  )
  .where(({ status }) => not(eq(status.status, "read")))
  .select(({ conversationUser, status }) => ({
    conversationId: conversationUser.conversationId,
    userId: conversationUser.userId,
    unreadMessageCount: count(status),
  }))
  .groupBy(({ conversationUser }) => [
    conversationUser.conversationId,
    conversationUser.userId,
  ]);

ConversationUnreadCount.preload();

ConversationUnreadCount.subscribeChanges((changes) => {
  changes.forEach((change) => {
    if (change.type == "insert" || change.type == "update") {
      console.log("Unread count", change.value);
    }
  });
});
