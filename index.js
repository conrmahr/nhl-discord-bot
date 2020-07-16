const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token, activity } = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	client.user.setActivity(activity.name, { type: activity.type });
	console.log(`${client.user.tag} is logged in!`);
});

client.on('message', message => {

	if (!message.content.startsWith(prefix) || !isNaN(message.content.substring(1, 2)) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/(?:\s(?:-\S+)?)+/).filter(Boolean);
	const flags = (message.content.match(/(?:^|\s)-\S+/g) || []).map(f => f.slice(2));
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) {
		const reply = `\`${prefix}${commandName}\` is not a valid command. Type \`$help\` for a list of commands.`;

		return message.reply(reply);
	}
	try {
		command.execute(message, args, flags, prefix);
	}
	catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

client.login(token);