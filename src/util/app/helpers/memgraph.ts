import {
	type Driver,
	type RecordShape,
	type SessionConfig,
	auth,
	driver,
} from "neo4j-driver"

import {
	MEMGRAPH_BOLT_PORT,
	MEMGRAPH_HOST,
	MEMGRAPH_ROOT_DB,
	MEMGRAPH_ROOT_PASSWORD,
	MEMGRAPH_ROOT_USER,
} from "@/util/config/memgraph"
import { LogLevel, log } from "@/util/log"

export type GraphDBCredentials = {
	userName: string
	userPass: string
	dbName: string
}

export const ROOT_DB_CREDENTIALS: GraphDBCredentials = {
	userName: MEMGRAPH_ROOT_USER,
	userPass: MEMGRAPH_ROOT_PASSWORD,
	dbName: MEMGRAPH_ROOT_DB,
}

/** Defaults to root credentials */
export async function getGraphDb(
	dbCredentials: GraphDBCredentials = ROOT_DB_CREDENTIALS,
) {
	const { userName, userPass } = dbCredentials

	const dbDriver = driver(
		`bolt://${MEMGRAPH_HOST}:${MEMGRAPH_BOLT_PORT}`,
		auth.basic(userName, userPass),
	)

	return dbDriver
}

export async function queryGraphDb<
	KeyT extends PropertyKey,
	ValueT,
	T extends RecordShape = RecordShape<KeyT, ValueT>,
>(
	dbDriver: Driver,
	queryString: string,
	queryParams: any = {},
	sessionConfig?: SessionConfig,
) {
	const dbSession = dbDriver.session(sessionConfig)
	log("memgraph.query", LogLevel.Debug, queryString, queryParams)
	const result = await dbSession.run<T>(queryString, queryParams)

	await dbSession.close()

	return result.records
}

export async function createGraphDB(dbCredentials: GraphDBCredentials) {
	const rootDriver = await getGraphDb(ROOT_DB_CREDENTIALS)
	const driverInfo = await rootDriver.getServerInfo()
	log("memgraph.driver", LogLevel.Info, driverInfo)

	// Creates the user
	await queryGraphDb(
		rootDriver,
		`CREATE USER IF NOT EXISTS ${dbCredentials.userName} IDENTIFIED BY '${dbCredentials.userPass}'`,
		dbCredentials,
	)
	if (dbCredentials.dbName !== MEMGRAPH_ROOT_DB) {
		// Creates the database
		await queryGraphDb(
			rootDriver,
			`CREATE DATABASE ${dbCredentials.dbName}`,
			dbCredentials,
		)
		// Grants all privileges
		await queryGraphDb(
			rootDriver,
			`GRANT DATABASE ${dbCredentials.dbName} TO ${dbCredentials.userName}`,
			dbCredentials,
		)
		await queryGraphDb(
			rootDriver,
			`SET MAIN DATABASE ${dbCredentials.dbName} TO ${dbCredentials.userName}`,
			dbCredentials,
		)
	}

	await rootDriver.close()

	const dbDriver = await getGraphDb(dbCredentials)

	// Wipe the graph database of all nodes, detaching relationships
	await queryGraphDb(
		dbDriver,
		"MATCH (n) DETACH DELETE n",
		{},
		{ database: dbCredentials.dbName },
	)

	await dbDriver.close()
}
