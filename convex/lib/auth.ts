import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";

export type DbCtx = GenericQueryCtx<DataModel>