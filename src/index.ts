import { Client, Intents } from "discord.js";
import sqlite3 from "sqlite3";
import { createDB } from "./utils/database";
import { handleInteraction } from "./interaction";
import { config } from "dotenv";
import { handleRaw } from "./raw";
import { createCommands } from "./interactionCommands";

const db = new sqlite3.Database("./src/db.db");
config({ path: `${__dirname}/../src/.env` });

const client = new Client({
	intents: new Intents(3145728),
	allowedMentions: {
		parse: [],
		repliedUser: false,
		roles: [],
		users: [],
	},
});

client.once("ready", async () => {
	await createCommands(client);
	await createDB(db);
	console.log(`[CLIENT] ${client.user?.tag} (${client.user?.id}) is up and running`);
});

client.on("interactionCreate", async interaction => {
	await handleInteraction(interaction, client, db);
});

client.on("raw", async e => {
	await handleRaw(e, client, db);
});

client.login(process.env.BOT_TOKEN);
