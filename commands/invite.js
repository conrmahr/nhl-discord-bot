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
		embed.addFields({ name: 'Add to Server', value: '[Invite nhl-discord-bot](https://discord.com/api/oauth2/authorize?client_id=535203406592344067&permissions=0&scope=bot)' }, { name: 'Get Support', value: '[Join Support Server](https://discord.gg/92UtjGs)' });

		return message.channel.send({ embeds: [embed] });
	},
};