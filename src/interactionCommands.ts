import axios from "axios";
import { Client } from "discord.js";
import { config } from "dotenv";
config({ path: `${__dirname}/../src/.env` });

export async function createCommands(client: Client) {
	const isDev = process.env.ENVIRONMENT === "dev";

	try {
		const response = await axios.put(
			`${process.env.DISCORD_API}/applications/${client.user?.id}/${isDev ? `guilds/${process.env.DEVELOPER_GUILD_ID}/` : ""}commands`,
			[...ChatCommands],
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bot ${process.env.BOT_TOKEN}`,
				},
			},
		);
		console.log(`[APPLICATION COMMANDS] Registered all of the slash commands, amount: ${response.data.length}`);
	} catch (err: any) {
		console.log(err);
		console.error(`[APPLICATION COMMANDS] Failed to register slash commands: ${err}`);
	}
}

export const ChatCommands = [
	{
		name: "config",
		description: "Configure the automod punsishmenets",
		options: [
			{
				type: 4,
				name: "timeout",
				description: "Amount of strikes before this will trigger automatically",
				min_value: 1,
				max_value: 1000,
			},
			{
				type: 4,
				name: "kick",
				description: "Amount of strikes before this will trigger automatically",
				min_value: 1,
				max_value: 1000,
			},
			{
				type: 4,
				name: "ban",
				description: "Amount of strikes before this will trigger automatically",
				min_value: 1,
				max_value: 1000,
			},
		],
	},
];
