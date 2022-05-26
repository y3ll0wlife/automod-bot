import { Database } from "sqlite3";

export async function get(db: Database, sql: string, params: any[] = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err: Error, result: any) => {
			if (err) {
				console.error("Error running sql: " + sql);
				console.error(err);
				reject(err);
			} else resolve(result);
		});
	});
}

export async function createDB(db: Database) {
	db.serialize(() => {
		db.run("CREATE TABLE if not exists strikes (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT, userId TEXT, strikes INTEGER)");
		db.run("CREATE TABLE if not exists config (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT, timeout INTEGER, kick INTEGER, ban INTEGER)");
		console.log("[DATABASE] Database is up and running");
	});
}
