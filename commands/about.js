const Discord = require('discord.js');
const { name, version, description } = require('../package.json');

module.exports = {
	name: 'about',
	usage: '',
	description: `Shows information about ${name}.`,
	category: 'about',
	aliases: ['about', 'a'],
	examples: [],
	async execute(message) {

		const embed = new Discord.RichEmbed();
		embed.setColor(0xa1cdff);
		embed.setAuthor('About', 'https://cdn.discordapp.com/avatars/535203406592344067/1473d566732ea6ffd24d02be45af8b21.png');
		embed.setDescription([
			`**${name}** is developed by **[@conrmahr](https://github.com/conrmahr)** and uses the **[Discord.js](https://discord.js.org)** library.`,

			`Issues or feature requests can be submitted to the **[GitHub repo](https://github.com/conrmahr/${name})**.`,
			'',
			`${description} v${version}.`,
		]);

		return message.channel.send(embed);
	},
};