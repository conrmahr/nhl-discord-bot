const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');

module.exports = {
	name: 'team',
	usage: '[<year>] [<team>] [-<flag>]',
	description: 'Get team stats or roster for active and former teams. Add `YYYY` to specifiy a season. Add the flags  `-roster`, `-advanced`, `-filter=<term>` for more options.',
	category: 'stats',
	aliases: ['team', 'teams', 't'],
	examples: ['', '1996 det', '1982 nyi -roster', 'team 1978 mtl -filter=pp'],
	async execute(message, args, prefix, flags) {

		const parameters = {};
		let teamObj = '';
		let current = 'current';
		const embed = new MessageEmbed();
		let type = '/stats/';
		const roster = ['roster', 'r'];
		const advanced = ['advanced', 'a'];
		const rosterFlag = roster.some(e => flags.includes(e));
		const advancedFlag = advanced.some(e => flags.includes(e));
		const keywordFlag = flags.find(e => e.startsWith('filter=') || e.startsWith('f=')) || '';
		const keyword = (keywordFlag.length > 0) ? keywordFlag.split('=', 2)[1].toLowerCase() : '';

		if (flags.length > 0 && keywordFlag.length === 0 && !rosterFlag && !advancedFlag) return message.reply({ content: `\`-${flags.join(' -')}\` is not a valid flag. Type \`${prefix}help team\` for list of flags.`, allowedMentions: { repliedUser: true } });

		let limit = (advancedFlag || keywordFlag.length > 0) ? 25 : 3;

		if (moment(args[0], 'YYYY', true).isValid()) {
			const prevSeason = args[0] - 1;
			parameters.season = `${prevSeason}${args[0]}`;
			current = `${prevSeason}${args[0]}`;
		}
		else {
			args.push(args[0]);
		}

		let query = qs.stringify(parameters, { addQueryPrefix: true });
		const { teams } = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${query}`).then(response => response.json());
		const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());

		if (!seasons[0]) return message.reply({ content: `\`${args[0]}\` is not a valid NHL season.`, allowedMentions: { repliedUser: true } });

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
				divisions[checkDivision].push(`${team.teamName.split(' ').pop()} <${team.abbreviation.toLowerCase()}>`);
			});

			embed.setColor('#7289da');
			embed.setAuthor({ name: `${humanSeason} NHL Teams`, iconURL: 'https://i.imgur.com/zl8JzZc.png' });
			embed.setThumbnail(teamLogo);

			for (const division in divisions) {
				embed.addField(division, divisions[division].sort().join('\n'), true);
			}

			return message.channel.send({ embeds: [embed] });
		}

		if (teams) {
			teamObj = teams.find(o => o.abbreviation === args[1].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());
		}
		else {
			return message.reply({ content: `\`${args[1]}\` matched 0 teams. Type \`${prefix}team\` for a list of teams.`, allowedMentions: { repliedUser: true } });
		}

		if (!teamObj) return message.reply({ content: `\`${args[1]}\` matched 0 teams. Type \`${prefix}team\` for a list of teams.`, allowedMentions: { repliedUser: true } });
		if (rosterFlag) type = '/roster/';
		if (teamObj.officialSiteUrl) {
			const html = await fetch(teamObj.officialSiteUrl).then(response => response.text());
			const $ = cheerio.load(html);
			teamLogo = $('[rel="shortcut icon"]').attr('href');
		}

		const establishedBio = teamObj.firstYearOfPlay ? `Est: ${teamObj.firstYearOfPlay}` : 'Est: Unknown';
		const conferenceBio = teamObj.conference.name ? `${teamObj.conference.name} Conference` : 'Unknown Conference';
		const divisionBio = teamObj.division.name ? `${teamObj.division.name} Division` : 'Unknown Division';
		const franchise = [ establishedBio, conferenceBio, divisionBio ];
		embed.setThumbnail(teamLogo);
		embed.setColor('#7289da');
		embed.setAuthor({ name: `${teamObj.name} (${humanSeason} Reg. Season)`, iconURL: teamLogo });
		embed.setDescription(franchise.join(' | '));
		query = qs.stringify(parameters, { addQueryPrefix: true });
		const data = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${teamObj.id}${type}${query}`).then(response => response.json());
		let g = '';

		if (rosterFlag) {
			const positions = { 'Left Wing' : [], Center: [], 'Right Wing': [], Defenseman: [], Goalie: [], '\u200B': ['\u200B'] };

			data.roster.sort(function(a, b) {
				return a['jerseyNumber'] - b['jerseyNumber'];
			});

			data.roster.forEach((player) => {
				positions[player.position.name].push(`${player.jerseyNumber} ${player.person.fullName}`);
			});

			g = positions;
			limit = 6;

			Object.entries(g).forEach(([key, value]) => {
				if (value.length === 0) g[key].push('None');
			});


		}
		else {
			const teamStats = data.stats[0].splits[0].stat;
			const teamRank = data.stats[1].splits[0].stat;
			const ties = seasons[0].tiesInUse ? teamStats.gamesPlayed - (teamStats.wins + teamStats.losses) + 'T' : `${teamStats.ot}OT`;

			if (teamStats) {
				g = {
					Games: `${teamStats.gamesPlayed}`,
					Record: `${teamStats.wins}W-${teamStats.losses}L-${ties}`,
					'PTS%': Number(teamStats.ptPctg) ? `${teamStats.ptPctg} (${teamRank.ptPctg})` : null,
					'GF/GP': teamStats.goalsPerGame ? `${teamStats.goalsPerGame.toFixed(2)} (${teamRank.goalsPerGame})` : null,
					'GA/GP': teamStats.goalsAgainstPerGame ? `${teamStats.goalsAgainstPerGame.toFixed(2)} (${teamRank.goalsAgainstPerGame})` : null,
					'PP%': Number(teamStats.powerPlayPercentage) ? `${teamStats.powerPlayPercentage} (${teamRank.powerPlayPercentage})` : null,
					PPG: teamStats.powerPlayGoals ? `${teamStats.powerPlayGoals} (${teamRank.powerPlayGoals})` : null,
					PPGA: teamStats.powerPlayGoalsAgainst ? `${teamStats.powerPlayGoalsAgainst} (${teamRank.powerPlayGoalsAgainst})` : null,
					'PP Opp': teamStats.powerPlayOpportunities ? `${teamStats.powerPlayOpportunities} (${teamRank.powerPlayOpportunities})` : null,
					'PK%': Number(teamStats.penaltyKillPercentage) ? `${teamStats.penaltyKillPercentage} (${teamRank.penaltyKillPercentage})` : null,
					'Save%': teamStats.savePctg ? `${teamStats.savePctg.toFixed(3).substring(1)} (${teamRank.savePctRank})` : null,
					'Shots/GP': teamStats.shotsPerGame ? `${teamStats.shotsPerGame.toFixed(1)} (${teamRank.shotsPerGame})` : null,
					'SA/GP': teamStats.shotsAllowed ? `${teamStats.shotsAllowed.toFixed(1)} (${teamRank.shotsAllowed})` : null,
					'Shot%': teamStats.shootingPctg ? `${teamStats.shootingPctg} (${teamRank.shootingPctRank})` : null,
					'W% Score First': teamStats.winScoreFirst ? `${teamStats.winScoreFirst.toFixed(3).substring(1)} (${teamRank.winScoreFirst})` : null,
					'W% Opp Score First': teamStats.winOppScoreFirst ? `${teamStats.winOppScoreFirst.toFixed(3).substring(1)} (${teamRank.winOppScoreFirst})` : null,
					'W% After 1P Lead': teamStats.winLeadFirstPer ? `${teamStats.winLeadFirstPer.toFixed(3).substring(1)} (${teamRank.winLeadFirstPer})` : null,
					'W% After 2P Lead': teamStats.winLeadSecondPer ? `${teamStats.winLeadSecondPer.toFixed(3).substring(1)} (${teamRank.winLeadSecondPer})` : null,
					'W% Outshoot Opp:': teamStats.winOutshootOpp ? `${teamStats.winOutshootOpp.toFixed(3).substring(1)} (${teamRank.winOutshootOpp})` : null,
					'W% Outshot by Opp:': teamStats.winOutshotByOpp ? `${teamStats.winOutshotByOpp.toFixed(3).substring(1)} (${teamRank.winOutshotByOpp})` : null,
					'FaceOffs Taken': teamStats.faceOffsTaken ? `${teamStats.faceOffsTaken} (${teamRank.faceOffsTaken})` : null,
					'FOW%': Number(teamStats.faceOffWinPercentage) ? `${teamStats.faceOffWinPercentage} (${teamRank.faceOffWinPercentage})` : null,
					'evGGARatio': teamStats.evGGARatio ? `${teamStats.evGGARatio.toFixed(3).substring(1)} (${teamRank.evGGARatio})` : null,
				};
			}

		}

		Object.entries(g).slice(0, limit).filter(([title, number]) => title.toLowerCase().startsWith(keyword.toLowerCase()) && number != null).forEach(([ key, value ]) => embed.addField(`${key}`, `${value.join('\n')}`, true));

		return message.channel.send({ embeds: [embed] });
	},
};