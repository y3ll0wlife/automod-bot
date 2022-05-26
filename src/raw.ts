import axios, { AxiosResponse } from "axios";
import { Client, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { Database } from "sqlite3";
import { get } from "./utils/database";

export async function handleRaw(e: any, client: Client, db: Database) {
	if (e.t !== "AUTO_MODERATION_ACTION_EXECUTION") return;
	if (e.d.action.type != 2) return;

	const ruleChannel = client.channels.cache.get(e.d.action.metadata.channel_id) ?? (await client.channels.fetch(e.d.action.metadata.channel_id));
	const channel = client.channels.cache.get(e.d.channel_id) ?? (await client.channels.fetch(e.d.channel_id));

	if (!channel?.isText() || !ruleChannel?.isText()) return;
	let message: any = await channel.messages.fetch(e.d.message_id);
	if (message.size > 0) message = message.first();

	const row = new MessageActionRow().addComponents(
		new MessageButton().setCustomId(`timeout|${message.author.id}|${e.d.guild_id}`).setLabel("Timeout").setStyle("SECONDARY"),
		new MessageButton().setCustomId(`kick|${message.author.id}|${e.d.guild_id}`).setLabel("Kick").setStyle("SECONDARY"),
		new MessageButton().setCustomId(`ban|${message.author.id}|${e.d.guild_id}`).setLabel("Ban").setStyle("DANGER"),
	);

	const { data }: AxiosResponse = await axios.get(`${process.env.DISCORD_API}/guilds/${e.d.guild_id}/auto-moderation/rules/${e.d.rule_id}`, {
		headers: {
			authorization: `Bot ${process.env.BOT_TOKEN}`,
		},
	});

	const userObj: any = await get(db, "SELECT * FROM strikes WHERE userId = ? AND guildId = ?", [message.author.id, e.d.guild_id]);
	if (userObj) {
		db.run("UPDATE strikes SET strikes = ? WHERE userId = ? AND guildId = ?", [(userObj.strikes += 1), message.author.id, e.d.guild_id]);
	} else {
		db.run("INSERT INTO strikes(guildId, userId, strikes) VALUES (?, ?, ?)", [e.d.guild_id, message.author.id, 1]);
	}

	const strikeCount = userObj ? userObj.strikes : 1;
	let punishment = "";
	let content: string | undefined = undefined;
	const guildObj: any = await get(db, "SELECT * FROM config WHERE guildId = ?", [e.d.guild_id]);
	if (guildObj) {
		const { timeout, kick, ban } = guildObj;
		const member = message.guild?.members.cache.get(message.author.id) ?? (await message.guild?.members.fetch(message.author.id));

		if (strikeCount >= ban) {
			punishment = "ban";
			await member?.ban({
				days: 0,
				reason: `Automod punishment given to ${member.user.tag} (${member.user.id}), had more than ${ban} strikes`,
			});
		} else if (strikeCount >= kick) {
			punishment = "kick";
			await member?.kick(`Automod punishment given to ${member.user.tag} (${member.user.id}), had more than ${kick} strikes`);
		} else if (strikeCount >= timeout) {
			punishment = "timeout";
			await member?.timeout(30 * 1000 * 60, `Automod punishment given to ${member.user.tag} (${member.user.id}), had more than ${timeout} strikes`);
		}

		if (punishment !== "") {
			row.components?.map(c => (c.disabled = true));
			content = `Punishment given to <@${member?.user?.id}> by **Automod**`;
		}
	}

	const embed = new MessageEmbed()
		.setColor("RED")
		.setAuthor({
			name: `${message.author.tag} (${message.author.id})`,
			iconURL: message.author.avatarURL({ dynamic: true }) ?? undefined,
		})
		.setTitle(`Triggered rule: ${data.name}`)
		.setDescription(
			`**Strike count:** \`${strikeCount}\` ${punishment !== "" ? ` given the punishment **${punishment}**` : ""}\n**Matched keyword:** \`${
				e.d.matched_keyword
			}\`\n**Matched content:** \`${e.d.matched_content}\`\n**Content:** \`${e.d.content}\``,
		);

	ruleChannel.send({
		content,
		embeds: [embed],
		components: [row],
	});
}
