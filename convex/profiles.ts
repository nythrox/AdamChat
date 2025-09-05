import { crud } from "convex-helpers/server/crud";
import schema from "./schema";

export const { create, destroy, read, update } = crud(schema, "userProfiles");
