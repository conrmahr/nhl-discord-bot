const { RichEmbed } = require('discord.js');

module.exports = {
	name: 'help',
	usage: '<command>',
	description: 'List all of my commands or info about a specific command.',
	category: 'help',
	aliases: ['help', 'h'],
	examples: ['nhl', 'teams'],
	execute(message, args, prefix) {
		const { commands } = message.client;

		if (!args.length) {
			const embed = new RichEmbed();
			embed.setColor(0x59acef);
			embed.addField('Command List',
				[
					'This is a list of all available commands.',
					`To view details for a command, type \`${prefix}help <command>\`.`,
				]);
			embed.addField('Commands', `\`${commands.map(c => c.name).join('` `')}\``);

			return message.channel.send(embed);

		}

		const name = args[0].toLowerCase();
		const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
		const text = `${prefix}${command.aliases[0]}`;

		if (!command) {
			return message.reply(`\`${name}\` is not a valid command. Type \`${prefix}help\` for a list of commands.`);
		}
		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setTitle(`\`${prefix}${command.name} ${command.usage}\``);
		embed.addField('Description', command.description);
		if (command.examples.length) {
			embed.addField('Examples', `\`${text} ${command.examples.join(`\`\n\`${text} `)}\``, true);
		}
		if (command.aliases.length > 1) {
			embed.addField('Aliases', `\`${command.aliases.join('` `')}\``, true);
		}
		return message.channel.send(embed);

	},
};