const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');

module.exports = {
	name: 'team',
	usage: '<year> <team> -<flag>',
	description: 'Get team stats or roster for active and former teams. Add `YYYY` to specifiy a season. Add the flag  `-roster` to return the team roster.',
	category: 'stats',
	aliases: ['team', 't', 'teams', 'tseason'],
	examples: ['stl', '1977 mtl', '1982 nyi -roster'],
	async execute(message, args, flags, prefix) {

		const parameters = {};
		let teamObj = '';
		let current = '';
		const embed = new RichEmbed();
		let type = '/stats/';
		const roster = ['roster', 'r'];
		const rosterFlag = roster.some(e => flags.includes(e));

		if (moment(args[0], 'YYYY', true).isValid()) {
			const prevSeason = args[0] - 1;
			parameters.season = `${prevSeason}${args[0]}`;
			current = `${prevSeason}${args[0]}`;
		}
		else {
			current = 'current';
			args.push(args[0]);
		}

		const query = qs.stringify(parameters, { addQueryPrefix: true });
		const { teams } = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${query}`).then(response => response.json());
		const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());

		if (!seasons[0]) return message.reply(`\`${args[0]}\` is not a valid NHL season.`);

		const humanSeason = `${seasons[0].seasonId.substring(0, 4)}-${seasons[0].seasonId.substring(6)}`;
		let teamLogo = 'https://i.imgur.com/zl8JzZc.png';

		if (!args[1]) {
			const divisions = {};
			let checkDivision = '';

			teams.forEach((team) => {
				checkDivision = team.division.name ? team.division.name : 'Unknown';
				divisions[checkDivision] = [];
			});

			teams.forEach((team) => {
				checkDivision = team.division.name ? team.division.name : 'Unknown';
				divisions[checkDivision].push(`${team.teamName.toLowerCase().split(' ').pop()} <${team.abbreviation.toLowerCase()}>`);
			});

			embed.setColor(0x59acef);
			embed.setAuthor(`${humanSeason} NHL Teams`, 'https://i.imgur.com/zl8JzZc.png');
			embed.setThumbnail(teamLogo);

			for (const division in divisions) {
				embed.addField(division, divisions[division].sort().join('\n'), true);
			}

			return message.channel.send(embed);
		}

		if (teams) {
			teamObj = teams.find(o => o.abbreviation === args[1].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());
		}
		else {
			return message.reply(`\`${args[1]}\` is not a team. Type \`${prefix}teams\` for a list of teams.`);
		}

		if (!teamObj) return message.reply(`\`${args[1]}\` is not a team. Type \`${prefix}teams\` for a list of teams.`);

		if (rosterFlag) type = '/roster/';

		if (teamObj.officialSiteUrl) {
			const html = await fetch(teamObj.officialSiteUrl).then(response => response.text());
			const $ = cheerio.load(html);
			teamLogo = $('[rel="shortcut icon"]').attr('href');
		}

		const conferenceBio = teamObj.conference.name ? `(${teamObj.conference.name})` : '';
		const divisionBio = teamObj.division.name ? `- ${teamObj.division.name}` : '';
		embed.setThumbnail(teamLogo);
		embed.setColor(0x59acef);
		embed.setAuthor(`${humanSeason} ${teamObj.name} ${divisionBio} ${conferenceBio}`, teamLogo);
		const data = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${teamObj.id}${type}${query}`).then(response => response.json());
		let g = '';

		if (rosterFlag) {
			const positions = { 'Left Wing' : [], Center: [], 'Right Wing': [], 'Defenseman': [], Goalie: [], '\u200B': ['\u200B'] };

			data.roster.sort(function(a, b) {
				return a['jerseyNumber'] - b['jerseyNumber'];
			});

			data.roster.forEach((player) => {
				positions[player.position.name].push(`${player.jerseyNumber} ${player.person.fullName}`);
			});

			g = positions;

		}
		else {
			const teamStats = data.stats[0].splits[0].stat;
			const teamRank = data.stats[1].splits[0].stat;
			const ties = seasons[0].tiesInUse ? teamStats.gamesPlayed - (teamStats.wins + teamStats.losses) + 'T' : `${teamStats.ot}OT`;
			embed.addField('Season', humanSeason, true);

			if (teamStats) {
				g = {
					Games: `${teamStats.gamesPlayed}`,
					Record: `${teamStats.wins}W-${teamStats.losses}L-${ties}`,
					'P%': Number(teamStats.ptPctg) ? `${teamStats.ptPctg} (${teamRank.ptPctg})` : null,
					'GF/GP': teamStats.goalsPerGame ? `${teamStats.goalsPerGame.toFixed(2)} (${teamRank.goalsPerGame})` : null,
					'GA/GP': teamStats.goalsAgainstPerGame ? `${teamStats.goalsAgainstPerGame.toFixed(2)} (${teamRank.goalsAgainstPerGame})` : null,
					'PP%': Number(teamStats.powerPlayPercentage) ? `${teamStats.powerPlayPercentage} (${teamRank.powerPlayPercentage})` : null,
					PPG: teamStats.powerPlayGoals ? `${teamStats.powerPlayGoals} (${teamRank.powerPlayGoals})` : null,
					PPGA: teamStats.powerPlayGoalsAgainst ? `${teamStats.powerPlayGoalsAgainst} (${teamRank.powerPlayGoalsAgainst})` : null,
					'PP Opp': teamStats.powerPlayOpportunities ? `${teamStats.powerPlayOpportunities} (${teamRank.powerPlayOpportunities})` : null,
					'PK%': Number(teamStats.penaltyKillPercentage) ? `${teamStats.penaltyKillPercentage} (${teamRank.penaltyKillPercentage})` : null,
					'Save%': teamStats.savePctg ? `${teamStats.savePctg} (${teamRank.savePctRank})` : null,
					'Shots/GP': teamStats.shotsPerGame ? `${teamStats.shotsPerGame.toFixed(1)} (${teamRank.shotsPerGame})` : null,
					'SA/GP': teamStats.shotsAllowed ? `${teamStats.shotsAllowed.toFixed(1)} (${teamRank.shotsAllowed})` : null,
					'Shot%': teamStats.shootingPctg ? `${teamStats.shootingPctg} (${teamRank.shootingPctRank})` : null,
					'W% Score First': teamStats.winScoreFirst ? `${teamStats.winScoreFirst.toFixed(3)} (${teamRank.winScoreFirst})` : null,
					'W% Opp Score First': teamStats.winOppScoreFirst ? `${teamStats.winOppScoreFirst.toFixed(3)} (${teamRank.winOppScoreFirst})` : null,
					'W% After 1P Lead': teamStats.winLeadFirstPer ? `${teamStats.winLeadFirstPer.toFixed(3)} (${teamRank.winLeadFirstPer})` : null,
					'W% After 2P Lead': teamStats.winOutshootOpp ? `${teamStats.winLeadSecondPer.toFixed(3)} (${teamRank.winLeadSecondPer})` : null,
					'W% Outshoot Opp:': teamStats.winOutshootOpp ? `${teamStats.winOutshootOpp.toFixed(3)} (${teamRank.winOutshootOpp})` : null,
					'W% Outshot by Opp:': teamStats.winOutshotByOpp ? `${teamStats.winOutshotByOpp.toFixed(3)} (${teamRank.winOutshotByOpp})` : null,
					'FaceOffs Taken': teamStats.faceOffsTaken ? `${teamStats.faceOffsTaken} (${teamRank.faceOffsTaken})` : null,
					'FOW%': Number(teamStats.faceOffWinPercentage) ? `${teamStats.faceOffWinPercentage} (${teamRank.faceOffWinPercentage})` : null,
					'evGGARatio': teamStats.evGGARatio ? `${teamStats.evGGARatio.toFixed(3)} (${teamRank.evGGARatio})` : null,
				};
			}

		}

		Object.entries(g).filter(([, number ]) => number != null).forEach(([ key, value ]) => embed.addField(key, value, true));
		return message.channel.send(embed);

	},
};