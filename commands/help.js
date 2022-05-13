const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'help',
	usage: '<command>',
	description: 'List all of my commands or info about a specific command.',
	category: 'help',
	aliases: ['help', 'h'],
	examples: ['nhl', 'team'],
	execute(message, args, prefix) {
		const { commands } = message.client;
		const embed = new MessageEmbed();

		if (!args.length) {
			embed.setColor('#7289da');
			embed.setAuthor({ name: 'Command List', iconURL: 'https://cdn.discordapp.com/avatars/535203406592344067/1473d566732ea6ffd24d02be45af8b21.png' });
			embed.setDescription(`This is a list of all available commands.\nTo view details for a command, type \`${prefix}help <command>\`.`);
			embed.addField('Commands', `\`${commands.map(c => c.name).join('` `')}\``);

			return message.channel.send({ embeds: [embed] });
		}

		const name = args[0].toLowerCase();
		const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

		if (!command) {
			return message.reply({ content: `\`${name}\` is not a valid command. Type \`${prefix}help\` for a list of commands.`, allowedMentions: { repliedUser: true } });

		}

		embed.setColor('#7289da');
		embed.setTitle(`\`${prefix}${command.name} ${command.usage}\``);
		embed.addField('Description', command.description);
		if (command.examples.length) {
			embed.addField('Examples', `\`${prefix}${command.aliases[0]} ${command.examples.join(`\`\n\`${prefix}${command.aliases[0]} `)}\``, true);
		}
		if (command.aliases.length > 1) {
			embed.addField('Aliases', `\`${command.aliases.join('`\n`')}\``, true);
		}

		return message.channel.send({ embeds: [embed] });
	},
};