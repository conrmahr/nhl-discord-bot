const { MessageEmbed } = require('discord.js');
const { name, version, description } = require('../package.json');

module.exports = {
	name: 'about',
	usage: '',
	description: `Shows information about ${name}.`,
	category: 'about',
	aliases: ['about', 'a'],
	examples: [],
	async execute(message) {

		const embed = new MessageEmbed();
		embed.setColor('#7289da');
		embed.setAuthor({ name: 'About', iconURL: 'https://cdn.discordapp.com/avatars/535203406592344067/1473d566732ea6ffd24d02be45af8b21.png' });
		embed.setDescription(
			`**${name}** is developed by **[@conrmahr](https://github.com/conrmahr)** using the **[Discord.js](https://discord.js.org)** library.
			Issues and/or feature requests can be submitted through **[GitHub](https://github.com/conrmahr/${name})**.\n
			${description} v${version}.`,
		);

		return message.channel.send({ embeds: [embed] });
	},
};