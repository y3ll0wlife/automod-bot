import { CacheType, Client, CommandInteraction, Interaction } from "discord.js";
import { Database } from "sqlite3";
import { get } from "./utils/database";

export async function handleInteraction(interaction: Interaction, client: Client, db: Database) {
	if (interaction.isCommand()) {
		handleInteractionCommand(interaction, client, db);
		return;
	}
	if (!interaction.isButton()) return;

	const [action, userId, guildId] = interaction.customId.split("|");

	const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
	const member = guild.members.cache.get(userId) ?? (await guild.members.fetch(userId));

	if (action === "timeout") {
		if (!interaction.memberPermissions?.has("KICK_MEMBERS"))
			return await interaction.reply({
				ephemeral: true,
				content: "This maze was not meant for you",
			});

		await member.timeout(30 * 1000 * 60, `Punishment given to ${userId} by ${interaction.user.tag} (${interaction.user.id})`);
		await interaction.reply({ content: `Timeout to <@${userId}> by ${interaction.user.tag} (${interaction.user.id})` });
	} else if (action === "kick") {
		if (!interaction.memberPermissions?.has("KICK_MEMBERS"))
			return await interaction.reply({
				ephemeral: true,
				content: "This maze was not meant for you",
			});

		await member.kick(`Punishment given to ${userId} by ${interaction.user.tag} (${interaction.user.id})`);
		await interaction.reply({ content: `Kicked <@${userId}> by ${interaction.user.tag} (${interaction.user.id})` });
	} else if (action === "ban") {
		if (!interaction.memberPermissions?.has("BAN_MEMBERS"))
			return await interaction.reply({
				ephemeral: true,
				content: "This maze was not meant for you",
			});

		await member.ban({
			days: 0,
			reason: `Punishment given to ${userId} by ${interaction.user.tag} (${interaction.user.id})`,
		});
		await interaction.reply({ content: `Banned <@${userId}> by ${interaction.user.tag} (${interaction.user.id})` });
	}
	const channel = guild.channels.cache.get(interaction.channelId) ?? (await guild.channels.fetch(interaction.channelId));
	if (!channel?.isText()) return;
	const message = channel.messages.cache.get(interaction.message.id) ?? (await channel.messages.fetch(interaction.message.id));
	message.edit({
		content: `Punishment given to <@${userId}> by ${interaction.user.tag} (${interaction.user.id})`,
		embeds: message.embeds,
		components: message.components?.map(c => {
			return {
				type: c.type,
				components: c.components.map((c2: any) => {
					return {
						...c2,
						disabled: true,
					};
				}),
			};
		}),
	});
}
async function handleInteractionCommand(interaction: CommandInteraction<CacheType>, client: Client, db: Database) {
	if (interaction.commandName === "config") {
		if (!interaction.memberPermissions?.has("MANAGE_GUILD"))
			return await interaction.reply({
				ephemeral: true,
				content: "This maze was not meant for you",
			});

		const guildObj: any = await get(db, "SELECT * FROM config WHERE guildId = ?", [interaction.guildId]);
		if (interaction.options.data.length === 0 && !guildObj)
			return await interaction.reply({ content: `You need to configure something first then you can view the config`, ephemeral: true });
		else if (interaction.options.data.length === 0 && guildObj)
			return await interaction.reply({
				content: `**Timeout:** ${guildObj.timeout}\n**Kick:** ${guildObj.kick}\n**Ban:** ${guildObj.ban}`,
				ephemeral: true,
			});

		if (guildObj) {
			const timeout = interaction.options.data.find(v => v.name === "timeout")?.value ?? guildObj.timeout;
			const kick = interaction.options.data.find(v => v.name === "kick")?.value ?? guildObj.kick;
			const ban = interaction.options.data.find(v => v.name === "ban")?.value ?? guildObj.ban;

			db.run("UPDATE config SET timeout = ?, kick = ?, ban = ? WHERE guildId = ? ", [timeout, kick, ban, interaction.guildId]);
		} else {
			const timeout = interaction.options.data.find(v => v.name === "timeout")?.value ?? 100;
			const kick = interaction.options.data.find(v => v.name === "kick")?.value ?? 100;
			const ban = interaction.options.data.find(v => v.name === "ban")?.value ?? 100;

			db.run("INSERT INTO config(guildId, timeout, kick, ban) VALUES (?, ?, ?, ?)", [interaction.guildId, timeout, kick, ban]);
		}
	}

	await interaction.reply({ content: `Updated the configuration for your server` });
}
