const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
	name: 'teams',
	usage: '',
	description: 'All active team mascots and abbreviations.',
	category: 'teams',
	aliases: ['teams', 't'],
	examples: [],
	async execute(message) {
		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const divisions = { Metropolitan: [], Atlantic: [], Central: [], Pacific: [] };
		teams.forEach((team) => {
			divisions[team.division.name].push(team.teamName.toLowerCase().split(' ').pop() + ' - ' + team.abbreviation.toLowerCase());
		});
		const embed = new Discord.RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor('NHL Teams', 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/05_NHL_Shield.svg/150px-05_NHL_Shield.svg.png');
		for (const division in divisions) {
			embed.addField(division, `\`${divisions[division].sort().join('`\n`')}\``, true);
		}
		return message.channel.send(embed);
	},
};