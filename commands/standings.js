const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'standings',
	usage: '[<year>] <table> [-<flag>]',
	description: 'Get current standings for any division, conference, or league. Add `YYYY` to specify a season. Add flags `-wildcard` or `-percentage` after a conference for sorting.',
	category: 'standings',
	aliases: ['standings', 's'],
	examples: ['metro', 'east', 'league', '1981 campbell', '1993 patrick'],
	async execute(message, args, prefix, flags) {

		const endpoint = 'https://statsapi.web.nhl.com/api/v1/standings/';
		const parameters = {};
		const tableNames = [];
		let current = 'current';
		let query = '';
		let standingsType = '';
		let standingsObj = '';
		let standingsLogo = 'https://i.imgur.com/zl8JzZc.png';
		let standingsTitle = 'National Hockey League';
		let humanSeason = '';
		let flagWildCard = false;
		let flagPointsPercentage = false;

		if (moment(args[0], 'YYYY', true).isValid()) {
			const prevSeason = args[0] - 1;
			parameters.season = `${prevSeason}${args[0]}`;
			current = `${prevSeason}${args[0]}`;
			args.push(args[0]);
		}
		else {
			args.push(args[0]);
		}

		parameters.expand = 'standings.team';
		query = qs.stringify(parameters, { addQueryPrefix: true });
		const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());
		if (!seasons[0]) return message.reply({ content: `The \`${args[0]}\` season does not have any games associated with it. Type \`${prefix}help standings\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
		const { seasonId, tiesInUse, conferencesInUse, divisionsInUse, wildCardInUse } = seasons[0];
		humanSeason = `${seasonId.substring(0, 4)}-${seasonId.substring(6)}`;

		for (const flag of flags) {
			if (['wildcard', 'wc'].includes(flag)) {
				if (wildCardInUse) {
					flagWildCard = true;
				}
				else {
					return message.reply({ content: `The \`${args[0]}\` season does not have a wild card format. Type \`${prefix}help standings\` for list of arguments.`, allowedMentions: { repliedUser: true } });
				}
			}
			else if (['percentage', 'p'].includes(flag)) {
				flagPointsPercentage = true;
			}
			else {
				return message.reply({ content: `\`-${flag}\` is not a valid flag. Type \`${prefix}help standings\` for list of flags.`, allowedMentions: { repliedUser: true } });
			}
		}

		const { records } = await fetch(`${endpoint}${query}`).then(response => response.json());
		if (!records[0].standingsType) return message.reply({ content: 'No standings available.', allowedMentions: { repliedUser: true } });
		const divisionTeams = records.filter(o => {

			if (divisionsInUse) {
				tableNames.push(o.division.name.toLowerCase().split(' ').pop());
				const d = args[1] ? args[1] : 'none';
				return o.division.name.toLowerCase().split(' ').pop().startsWith(d.toLowerCase());
			}
		},
		).flatMap(({ teamRecords }) => teamRecords);

		const conferenceTeams = records.filter(o => {
			if (conferencesInUse) {
				tableNames.push(o.conference.name.toLowerCase().split(' ').pop());
				const c = args[1] ? args[1] : 'none';
				return o.conference.name.toLowerCase().split(' ').pop().startsWith(c.toLowerCase());
			}
		},
		).flatMap(({ teamRecords }) => teamRecords);

		const leagueTeams = records.filter(o => {
			if (o.league) {
				tableNames.push('league');
				const l = args[1] ? args[1] : 'none';
				return o.league.name.toLowerCase().split(' ').includes(l);
			}
		},
		).flatMap(({ teamRecords }) => teamRecords);

		if (divisionTeams.length > 0) {
			const divisionName = divisionTeams[0].team.division.name;
			standingsType = 'byDivision';
			standingsTitle = `${divisionName} Conference`;
			const divisionLogos = {
				atlantic: 'https://i.imgur.com/DfukSpN.png',
				central: 'https://i.imgur.com/3uVACx4.png',
				metropolitan: 'https://i.imgur.com/bciivGM.png',
				pacific: 'https://i.imgur.com/xQLkBaO.png',
				'honda west': 'https://i.imgur.com/UZ1jE1t.png',
				'scotia north': 'https://i.imgur.com/s98kwYD.png',
				'discover central': 'https://i.imgur.com/czMqC3p.png',
				'massmutual east': 'https://i.imgur.com/QNwCNdY.png',
			};
			const divShort = divisionLogos[divisionName.toLowerCase()];
			if (divShort) standingsLogo = divShort;
			if (flagWildCard) return message.reply({ content: `\`-wildcard\` is not a valid flag for this division table. Type \`${prefix}help standings\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
			if (flagPointsPercentage) return message.reply({ content: `\`-percentage\` is not a valid flag for this division table. Type \`${prefix}help standings\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
			standingsObj = divisionTeams.sort((a, b) => Number(a.DivisionRank) - Number(b.DivisionRank));
		}
		else if (conferenceTeams.length > 0) {
			const conferenceName = conferenceTeams[0].team.conference.name;
			standingsType = 'byConference';
			standingsTitle = `${conferenceName} Conference`;
			const conferenceLogos = {
				eastern: 'https://i.imgur.com/qgmpsVw.png',
				western: 'https://i.imgur.com/iPe1ISG.png',
				wales: 'https://i.imgur.com/QbenYLo.gif',
				campbell: 'https://i.imgur.com/Ia3S6M6.gif',
			};
			const confShort = conferenceLogos[conferenceName.toLowerCase().split(' ').pop()];
			if (confShort) standingsLogo = confShort;

			if (flagWildCard) {
				standingsType = 'wildCardWithLeaders';
				standingsTitle = `${standingsTitle} Wild Card`;
				standingsObj = conferenceTeams.sort((a, b) => Number(a.wildCardRank) - Number(b.wildCardRank));
			}
			else if (flagPointsPercentage) {
				standingsTitle = `${standingsTitle} Points Percentage`;
				standingsObj = conferenceTeams.sort((a, b) => Number(a.ppConferenceRank) - Number(b.ppConferenceRank));
			}
			else {
				standingsObj = conferenceTeams.sort((a, b) => Number(a.conferenceRank) - Number(b.conferenceRank));
			}
		}
		else if (leagueTeams.length > 0) {
			standingsObj = leagueTeams.sort((a, b) => Number(a.leagueRank) - Number(b.leagueRank));
			standingsType = 'byLeague';
		}
		else {
			const tableArr = [...new Set(tableNames)].filter(n => n);
			return message.reply({ content: `Please define a table. \`${tableArr.join('` `')}\` are the available tables for the ${humanSeason} season. Type \`${prefix}help standings\` for a list of arguments.`, allowedMentions: { repliedUser: true } });

		}

		const updated = moment(Math.max(...standingsObj.map(e => moment(e.lastUpdated)))).format();

		function getStandings(tables) {
			let r = 0;
			return tables.map(table => {
				const { team, gamesPlayed, leagueRecord: { wins, losses, ties, ot }, points, regulationWins, goalsAgainst, goalsScored, divisionRank, conferenceRank, leagueRank, wildCardRank, streak, pointsPercentage } = table;
				const ranks = { byDivision: divisionRank, byConference: conferenceRank, byLeague: leagueRank, wildCardWithLeaders: wildCardRank };
				const rank = (ranks[standingsType] == 0) ? divisionRank : ranks[standingsType];
				const clinch = table.clinchIndicator ? `${table.clinchIndicator}-` : '';
				const teamAbbreviation = team.abbreviation;
				const extra = tiesInUse ? ties : ot;
				const pp = (flagPointsPercentage && pointsPercentage >= 0) ? (pointsPercentage === 1) ? '1.000' : (pointsPercentage === 0) ? '.000' : pointsPercentage.toFixed(3).substring(1) : '';
				const rw = (!flagPointsPercentage && regulationWins >= 0) ? regulationWins : '';
				const strk = typeof streak !== 'undefined' ? streak.streakCode : '';
				r++;
				function getHeader(loop, xrw, xpp, tiu) {
					if (loop === 1 && xrw && !xpp) return '#  TEAM  GP W  L  OT PTS RW DIFF STRK\n';
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
					const wcBreak = {
						3: '\n',
						6: '\n',
						8: '\n--',
					};
					if (wcBreak[loop] && wc) return wcBreak[loop];
					if (loop === 12 && percent) return '\n--';
					return '';
				}
				function pad(stat, column) {
					if (stat === '') return '';
					return stat.toString().padEnd(column, ' ');
				}
				return `${getHeader(r, regulationWins, flagPointsPercentage, tiesInUse)}${pad(rank, 3)}${pad(clinch + teamAbbreviation, 6)}${pad(gamesPlayed, 3)}${pad(wins, 3)}${pad(losses, 3)}${pad(extra, 3)}${pad(points, 4)}${pad(pp, 5)}${pad(rw, 3)}${pad(getDiff(goalsScored, goalsAgainst), 5)}${strk}${getLine(r, flagWildCard, flagPointsPercentage)}`;

			}).join('\u200B\n');
		}

		const block = `\`\`\`md\n${getStandings(standingsObj)}\n\`\`\``;
		const embed = new MessageEmbed();
		embed.setColor('#7289da');
		embed.setAuthor({ name: `${humanSeason} ${standingsTitle}`, iconURL: standingsLogo });
		embed.setThumbnail(standingsLogo);
		embed.setDescription(block);
		embed.setTimestamp(updated);
		embed.setFooter({ text: 'Last updated', iconURL: 'https://i.imgur.com/zl8JzZc.png' });

		return message.channel.send({ embeds: [embed] });
	},
};