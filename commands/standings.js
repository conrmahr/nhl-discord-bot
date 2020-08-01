const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'standings',
	usage: '<date> <table> -<flag>',
	description: 'Get current standings for any division, conference, or league. Add `YYYY` to specify a season. Add flags `-wildcard` or `-percentage` after a conference for sorting.',
	category: 'standings',
	aliases: ['standings', 's'],
	examples: ['metro', 'east', 'league', '1981 campbell', '1993 patrick'],
	async execute(message, args, flags, prefix) {

		const endpoint = 'https://statsapi.web.nhl.com/api/v1/standings/';
		const parameters = {};
		let current = 'current';
		let query = '';
		let standingsType = '';
		let teamsObj = '';
		let tableObj = '';
		let standingsObj = '';
		let standingsLogo = 'https://i.imgur.com/zl8JzZc.png';
		let standingsTitle = 'National Hockey League';
		let humanSeason = '';
		let flagWildCard = false;
		let flagPointsPercentage = false;

		if (!args[0]) return message.reply(`no league, conference, or division was specified. Type \`${prefix}help standings\` for a list of arguments.`);

		if (moment(args[0], 'YYYY', true).isValid()) {
			const prevSeason = args[0] - 1;
			parameters.season = `${prevSeason}${args[0]}`;
			current = `${prevSeason}${args[0]}`;
			if (!args[1]) return message.reply(`no league, conference, or division was specified. Type \`${prefix}help standings\` for a list of arguments.`);

		}
		else {
			args.push(args[0]);
		}
		query = qs.stringify(parameters, { addQueryPrefix: true });
		teamsObj = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${query}`).then(response => response.json());
		const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());

		if (!seasons[0]) return message.reply(`the \`${args[0]}\` season does not have any games associated with it. Type \`${prefix}help standings\` for a list of arguments.`);
		const { seasonId, tiesInUse, conferencesInUse, divisionsInUse, wildCardInUse } = seasons[0];
		humanSeason = `${seasonId.substring(0, 4)}-${seasonId.substring(6)}`;

		for (const flag of flags) {
			if (wildCardInUse && ['wildcard', 'wc'].includes(flag)) {
				flagWildCard = true;
			}
			else if (['percentage', 'p'].includes(flag)) {
				flagPointsPercentage = true;
			}
			else {
				return message.reply(`\`-${flag}\` is not a valid flag. Type \`${prefix}help standings\` for list of flags.`);
			}
		}

		if (['eastern', 'east', 'western', 'west', 'wales', 'campbell' ].includes(args[1].toLowerCase()) && conferencesInUse) {
			const conferenceShort = args[1].toLowerCase();
			let conferenceName = '';
			if (conferenceShort === 'east') {
				conferenceName = 'eastern';
			}
			else if (conferenceShort === 'west') {
				conferenceName = 'western';
			}
			else if (conferenceShort.includes('wales')) {
				conferenceName = 'prince of wales';
			}
			else if (conferenceShort.includes('campbell')) {
				conferenceName = 'clarence campbell';
			}
			else {
				conferenceName = conferenceShort;
			}

			const conferenceLogos = {
				Eastern: 'https://i.imgur.com/qgmpsVw.png',
				Western: 'https://i.imgur.com/iPe1ISG.png',
				'Prince of Wales': 'https://i.imgur.com/QbenYLo.gif',
				'Clarence Campbell': 'https://i.imgur.com/Ia3S6M6.gif',
			};

			const conferenceId = teamsObj.teams.find(o => o.conference.name.toLowerCase() === conferenceName);

			if (!conferenceId) return message.reply(`\`${args[1]}\` is not a valid conference for the ${humanSeason} season. Type \`${prefix}help standings\` for a list of arguments.`);

			tableObj = await fetch(`https://statsapi.web.nhl.com/api/v1/conferences/${conferenceId.conference.id}`).then(response => response.json());
			standingsType = flagWildCard ? 'wildCardWithLeaders' : 'byConference';
			standingsLogo = conferenceLogos[tableObj.conferences[0].name];
		}
		else if (['metropolitan', 'metro', 'atlantic', 'atl', 'central', 'cen', 'pacific', 'pac', 'northeast', 'southeast', 'northwest', 'canadian', 'american', 'east', 'west', 'adams', 'norris', 'patrick', 'smythe'].includes(args[1].toLowerCase()) && divisionsInUse) {
			const divisionShort = args[1].toLowerCase();
			let divisionName = '';

			if (divisionShort === 'metro') {
				divisionName = 'metropolitan';
			}
			else if (divisionShort === 'atl') {
				divisionName = 'atlantic';
			}
			else if (divisionShort.includes('cen')) {
				divisionName = 'central';
			}
			else if (divisionShort === 'pac') {
				divisionName = 'pacific';
			}
			else {
				divisionName = divisionShort;
			}

			const divisionLogos = {
				Atlantic: 'https://i.imgur.com/Lzm76PX.png',
				Central: 'https://i.imgur.com/TA9v6sj.png',
				Metropolitan: 'https://i.imgur.com/IPqIiIy.png',
				Pacific: 'https://i.imgur.com/n6iImAX.png',
			};
			const divisionId = teamsObj.teams.find(o => o.division.name.toLowerCase() === divisionName);
			if (!divisionId) return message.reply(`\`${args[1]}\` is not a valid conference or division for the ${humanSeason} season. Type \`${prefix}help standings\` for a list of arguments.`);
			tableObj = await fetch(`https://statsapi.web.nhl.com/api/v1/divisions/${divisionId.division.id}`).then(response => response.json());
			standingsType = 'byDivision';
			standingsLogo = divisionLogos[tableObj.divisions[0].name] ? divisionLogos[tableObj.divisions[0].name] : 'https://i.imgur.com/zl8JzZc.png';

		}
		else if (['league', 'nhl'].includes(args[1])) {
			standingsType = 'byLeague';
		}
		else {
			return message.reply(`no league, conference, or division was specified. Type \`${prefix}help standings\` for a list of arguments.`);
		}

		const { records } = await fetch(`${endpoint}${standingsType}${query}`).then(response => response.json());

		if (!records[0].standingsType) return message.reply('no standings available.');

		if (standingsType === 'byConference') {
			standingsObj = records.find(o => o.conference.id === tableObj.conferences[0].id);
			standingsObj.teamRecords.sort((a, b) => Number(a.ppConferenceRank) - Number(b.ppConferenceRank));
			standingsTitle = `${tableObj.conferences[0].name} Conference`;
			if (flagPointsPercentage) standingsTitle = `${standingsTitle} Points Percentage`;
		}
		else if (standingsType === 'byDivision') {
			standingsObj = records.find(o => o.division.id === tableObj.divisions[0].id);
			standingsObj.teamRecords.sort((a, b) => Number(a.divisionRank) - Number(b.divisionRank));
			standingsTitle = `${tableObj.divisions[0].name} Division`;
		}
		else if (standingsType === 'wildCardWithLeaders') {
			records.reverse();
			const standingsPrepObj = records.filter((o => o.conference.id === tableObj.conferences[0].id), []);
			standingsTitle = `${tableObj.conferences[0].name} Conference Wildcard`;
			standingsObj = standingsPrepObj.reduce((c, i) => {
				c.teamRecords.push(...i.teamRecords); return c;
			}, { teamRecords: [] });

		}
		else {
			standingsObj = records[0];
			standingsObj.teamRecords.sort((a, b) => Number(a.leagueRank) - Number(b.leagueRank));
		}

		const updated = records[0].teamRecords[0].lastUpdated;
		const { teams } = teamsObj;

		function getStandings(tables) {
			let r = 0;
			return tables.map(table => {
				const { gamesPlayed, leagueRecord: { wins, losses, ties, ot }, points, regulationWins, goalsAgainst, goalsScored, divisionRank, conferenceRank, leagueRank, wildCardRank, row, streak: { streakCode }, pointsPercentage } = table;
				const ranks = { byDivision: divisionRank, byConference: conferenceRank, byLeague: leagueRank, wildCardWithLeaders: wildCardRank };
				const rank = (ranks[standingsType] == 0) ? divisionRank : ranks[standingsType];
				const teamAbbreviation = teams.find(o => o.id === table.team.id).abbreviation;
				const extra = tiesInUse ? ties : ot;
				const pp = (flagPointsPercentage && pointsPercentage) ? pointsPercentage.toFixed(3).substring(1) : '';
				const rw = (!flagPointsPercentage && regulationWins) ? regulationWins : '';
				const rowe = (!flagPointsPercentage && !regulationWins && row) ? row : '';
				const strk = streakCode ? `${streakCode}` : '';
				r++;
				function getHeader(loop, xrw, xrow, xpp, tiu) {
					if (loop === 1 && xrw && !xpp) return '#  TEAM  GP W  L  OT PTS RW DIFF STRK\n';
					if (loop === 1 && xrow && !xpp) return '#  TEAM  GP W  L  OT PTS ROW DIFF STRK\n';
					if (loop === 1 && xpp) return '#  TEAM  GP W  L  OT PTS PTS% DIFF STRK\n';
					if (loop === 1 && tiu) return '#  TEAM  GP W  L  T  PTS DIFF STRK\n';
					if (loop === 1) return '#  TEAM  GP  W L  OT PTS DIFF STRK\n';
					return '';
				}
				function getDiff(scored, against) {
					const diff = scored - against;
					if (diff > 0) return `+${diff}`;
					if (diff === 0) return ` ${diff}`;
					return diff;
				}
				function getLine(loop, wc, percent) {
					const wcBreak = [3, 6];
					if (wcBreak.includes(loop) && wc) return '\n';
					if (loop === 12 && percent) return '\n';
					return '';
				}
				function pad(stat, column) {
					if (stat === '') return '';
					return stat.toString().padEnd(column, ' ');
				}
				return `${getHeader(r, regulationWins, row, flagPointsPercentage, tiesInUse)}${pad(rank, 3)}<${teamAbbreviation}> ${pad(gamesPlayed, 3)}${pad(wins, 3)}${pad(losses, 3)}${pad(extra, 3)}${pad(points, 4)}${pad(pp, 5)}${pad(rw, 3)}${pad(rowe, 4)}${pad(getDiff(goalsScored, goalsAgainst), 5)}${strk}${getLine(r, flagWildCard, flagPointsPercentage)}`;

			}).join('\u200B\n');
		}

		const block = '```md\n' + getStandings(standingsObj.teamRecords) + '```';
		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor(`${humanSeason} ${standingsTitle}`, standingsLogo);
		embed.setThumbnail(standingsLogo);
		embed.setDescription(block);
		embed.setTimestamp(updated);
		embed.setFooter('Last updated', 'https://i.imgur.com/zl8JzZc.png');

		message.channel.send(embed);
	},
};