import { envVar } from "@/util/env"

export const MEMGRAPH_HOST = envVar("MEMGRAPH_HOST")
export const MEMGRAPH_BOLT_PORT = envVar("MEMGRAPH_BOLT_PORT")
export const MEMGRAPH_ROOT_USER = envVar("MEMGRAPH_ROOT_USER")
export const MEMGRAPH_ROOT_PASSWORD = envVar("MEMGRAPH_ROOT_PASSWORD")
export const MEMGRAPH_ROOT_DB = envVar("MEMGRAPH_ROOT_DB")
