const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'invite',
	usage: '',
	description: 'Get invite links for adding the bot and support server.',
	category: 'invite',
	aliases: ['invite', 'i'],
	examples: [],
	async execute(message) {

		const embed = new MessageEmbed();

		embed.setColor(0x59acef);
		embed.setAuthor({ name: 'Invite', iconURL: 'https://cdn.discordapp.com/avatars/535203406592344067/1473d566732ea6ffd24d02be45af8b21.png' });
		embed.setDescription('Here are some helpful links:');
		embed.addFields(
			{ name: 'Add to Server', value: '[Invite nhl-discord-bot to Your Server](https://bot.hockey/invite)' },
			{ name: 'Join', value: '[Join the Support Server](https://bot.hockey/join)' },
			{ name: 'Contribute', value: '[Contribute to nhl-discord-bot on GitHub](https://git.io/nhl-discord-bot)' },
		);

		return message.channel.send({ embeds: [embed] });
	},
};