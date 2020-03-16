const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'standings',
	usage: '<date> <team> <opponent> -<flag>',
	description: 'Get current standings or a given date `YYYY-MM-DD`. If nothing is specified, current wildcard standings will return.',
	category: 'standings',
	aliases: ['standings', 's'],
	examples: ['', 'standings metro'],
	async execute(message, args, flags, prefix) {

		const endpoint = 'https://statsapi.web.nhl.com/api/v1/standings/';
		const parameters = {};
		let query = '';
		let standingsType = '';
		let teamsObj = '';
		let tableObj = '';
		let standingsObj = '';
		let standingsLogo = 'https://i.imgur.com/zl8JzZc.png';
		let standingsTitle = 'NHL';
		let humanSeason = '';

		if (args[0]) {

			if (moment(args[0], 'YYYY', true).isValid()) {
				const prevSeason = args[0] - 1;
				parameters.season = `${prevSeason}${args[0]}`;
				current = `${prevSeason}${args[0]}`;
			}
			else {
				current = 'current';
				args.push(args[0]);
			}

			query = qs.stringify(parameters, { addQueryPrefix: true });
			teamsObj = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${query}`).then(response => response.json());
			const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());
			const { seasonId, tiesInUse, conferencesInUse, divisionsInUse, wildCardInUse } = seasons[0];
			humanSeason = `${seasonId.substring(0, 4)}-${seasonId.substring(6)}`;

			if (['eastern', 'east', 'western', 'west', 'wales', 'campbell' ].includes(args[1]) && conferencesInUse) {
				if (args[1].toUpperCase() === 'EAST') {
					fix = 'Eastern';
				}
				else if (args[1].toUpperCase() === 'WEST') {
					fix = 'Western';
				}
				else { 
					fix = args[1];
				}

				const conferenceLogos = { Eastern: 'https://i.imgur.com/iPe1ISG.png', Western: 'https://i.imgur.com/qgmpsVw.png' }
				const conferenceId = teamsObj.teams.find(o => o.conference.name.toUpperCase() === fix.toUpperCase()).conference.id;
				tableObj = await fetch(`https://statsapi.web.nhl.com/api/v1/conferences/${conferenceId}`).then(response => response.json());
				standingsType = 'byConference';
				standingsLogo = conferenceLogos[tableObj.conferences[0].name];
			}
			else if (['metropolitan', 'metro', 'atlantic', 'atl', 'central', 'cen', 'pacific', 'pac', 'northeast', 'southeast', 'northwest', 'canadian', 'american', 'east', 'west', 'adams', 'norris', 'patrick', 'smythe'].includes(args[1]) && divisionsInUse) {
				const divisionLogos = { Atlantic: 'https://i.imgur.com/Lzm76PX.png', Central: 'https://i.imgur.com/TA9v6sj.png', Metropolitan: 'https://i.imgur.com/IPqIiIy.png', Pacific: 'https://i.imgur.com/n6iImAX.png'}
				const divisionId = teamsObj.teams.find(o => o.division.name.toUpperCase() === args[1].toUpperCase() || o.division.nameShort.toUpperCase() === args[1].toUpperCase()).division.id;
				tableObj = await fetch(`https://statsapi.web.nhl.com/api/v1/divisions/${divisionId}`).then(response => response.json());
				standingsType = 'byDivision';
				standingsLogo = divisionLogos[tableObj.divisions[0].name];
			}
			else if (['league', 'nhl'].includes(args[1])) {
				standingsType = 'byLeague';
		    }
		    else {
				return message.reply(`no league, conference, or division was specified. Type \`${prefix}help standings\` for a list of arguments.`);
			}
		}

		const { records } = await fetch(`${endpoint}${standingsType}${query}`).then(response => response.json());

		if (!records[0].standingsType) return message.reply('no standings available.');

		if (standingsType === 'byConference') {
			standingsObj = records.find(o => o.conference.id === tableObj.conferences[0].id);
			standingsTitle = `${tableObj.conferences[0].name} Conference`;
		}
		else if (standingsType === 'byDivision') {
			standingsObj = records.find(o => o.division.id === tableObj.divisions[0].id);
			standingsTitle = `${tableObj.divisions[0].name} Division`;
		}
		else {
			standingsObj = records;
		}

		const { teams } = teamsObj;

		function getStandings(tables) {
			let rank = 0;
			return tables.map(table => {
				rank++;
				const { team: { abbreviation }, gamesPlayed, leagueRecord: { wins, losses, ot }, points, regulationWins, row, streak: { streakCode } } = table;
				const teamAbbreviation = teams.find(o => o.id === table.team.id).abbreviation;
				return `${rank}. ${teamAbbreviation} - GP: **${gamesPlayed}** W: **${wins}** L: **${losses}** OT: **${ot}** P: **${points}** RW: **${regulationWins}** STRK: **${streakCode}**`;

			}).join('\u200B\n');
		}

		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor(`${humanSeason} ${standingsTitle} Standings`, standingsLogo);
		embed.setThumbnail(standingsLogo);
		embed.setDescription(`${getStandings(standingsObj.teamRecords)}`);

		message.channel.send(embed);
	},
};