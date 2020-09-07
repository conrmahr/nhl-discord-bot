const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'game',
	usage: '[<date>] <team> [-<flag>]',
	description: 'Get game editorials and boxscores. Add one flag `-preview`, `-boxscore`, or `-recap` to isolate.',
	category: 'stats',
	aliases: ['game', 'g'],
	examples: ['phi', 'phi yesterday -boxscore'],
	async execute(message, args, flags, prefix) {

		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const endpoint = 'https://statsapi.web.nhl.com/api/v1/schedule/';
		const parameters = {};

		if (args[0]) {

			if (['last', 'yesterday', 'today', 'tomorrow', 'next'].includes(args[0])) {
				switch (args[0]) {
				case 'yesterday':
					parameters.startDate = moment().add(-1, 'day').format('MM/DD/YYYY');
					parameters.endDate = parameters.startDate;
					break;
				case 'today':
					parameters.startDate = moment().format('MM/DD/YYYY');
					parameters.endDate = parameters.startDate;
					break;
				case 'tomorrow':
					parameters.startDate = moment().add(1, 'day').format('MM/DD/YYYY');
					parameters.endDate = parameters.startDate;
					break;
				}
			}
			else if (moment(args[0], 'YYYY-MM-DD', true).isValid()) {
				parameters.startDate = moment(args[0]).format('MM/DD/YYYY');
				parameters.endDate = moment(args[0]).format('MM/DD/YYYY');
			}
			else {
				args.push(args[0]);
			}

			if (args[1]) {

				const teamObj = teams.find(o => o.abbreviation === args[1].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());

				if (teamObj) {
					parameters.teamId = teamObj.id;
				}
				else {
					return message.reply(`\`${args[1]}\` is not a valid argument. Type \`${prefix}help game\` for a list of arguments.`);
				}
			}
		}

		if (!parameters.teamId) return message.reply(`no team was defined. Type \`${prefix}help game\` for a list of arguments.`);

		parameters.expand = ['schedule.teams', 'schedule.linescore'];
		let flagPreview = false;
		let flagBoxscore = false;
		let flagRecap = false;

		for (const flag of flags) {
			if (['preview', 'p'].includes(flag)) {
				flagPreview = true;
			}
			else if (['boxscore', 'b'].includes(flag)) {
				flagBoxscore = true;
			}
			else if (['recap', 'r'].includes(flag)) {
				flagRecap = true;
			}
			else {
				return message.reply(`\`-${flag}\` is not a valid flag. Type \`${prefix}help nhl\` for list of flags.`);
			}
		}

		const query = qs.stringify(parameters, { arrayFormat: 'comma', addQueryPrefix: true });
		const schedule = await fetch(`${endpoint}${query}`).then(response => response.json());

		if (!schedule.totalGames) return message.reply('no games scheduled.');

		function getScores(games) {
			return games.map(game => {

				function formatPeriod(t, p) {
					const possibleTime = { Final: 'Final', END: '0:00' };
					const remain = possibleTime[t] || t;
					let spacer = '/';
					let ordinal = p;
					if (remain === 'Final' && p === '3rd' || remain === 'Final' && p === '2nd') {
						spacer = '';
						ordinal = '';
					}

					return `${remain}${spacer}${ordinal}`;
				}

				const { status: { statusCode }, gameDate, teams: { away, home }, linescore, venue, content } = game;
				const gameObj = {
					author: '',
					authorURL: 'https://i.imgur.com/zl8JzZc.png',
					status: statusCode,
					date: gameDate,
					awayTeam: away.team.abbreviation,
					homeTeam: home.team.abbreviation,
					awayTeamLine: '',
					homeTeamLine: '',
					awayScoreFinal: '-',
					homeScoreFinal: '-',
					awayScore1st: '-',
					homeScore1st: '-',
					awayScore2nd: '-',
					homeScore2nd: '-',
					awayScore3rd: '-',
					homeScore3rd: '-',
					awayScoreOT: '',
					homeScoreOT: '',
					awayShots: '-',
					homeShots: '-',
					clock: '',
					awayPP: '',
					homePP: '',
					awayEN: '',
					homeEN: '',
					overtime: false,
					scoreboard: '',
					content: content.link,
					venue: venue.name,
				};

				if (statusCode === '8') {
					gameObj.clock = `${gameObj.awayTeam} @ ${gameObj.homeTeam} TBD`;
				}
				else if (statusCode === '9') {
					gameObj.clock = `${gameObj.awayTeam} @ ${gameObj.homeTeam} PPD`;
				}
				else {
					gameObj.clock = 'N/A';
				}

				const awayPP = linescore.teams.away.powerPlay ? '[PP]' : '';
				const homePP = linescore.teams.home.powerPlay ? '[PP]' : '';
				const awayEN = linescore.teams.away.goaliePulled ? '[EN]' : '';
				const homeEN = linescore.teams.home.goaliePulled ? '[EN]' : '';
				let firstPeriod, secondPeriod, thirdPeriod, overtimePeriod = 0;

				if (linescore.currentPeriod > 0) {
					firstPeriod = linescore.periods.filter(p => p.num === 1);
					[firstPeriod] = firstPeriod;
					gameObj.awayScore1st = firstPeriod.away.goals;
					gameObj.homeScore1st = firstPeriod.home.goals;
				}

				if (linescore.currentPeriod > 1) {
					secondPeriod = linescore.periods.filter(p => p.num === 2);
					[secondPeriod] = secondPeriod;
					gameObj.awayScore2nd = secondPeriod.away.goals;
					gameObj.homeScore2nd = secondPeriod.home.goals;
				}

				if (linescore.currentPeriod > 2) {
					thirdPeriod = linescore.periods.filter(p => p.num === 3);
					[thirdPeriod] = thirdPeriod;
					gameObj.awayScore3rd = thirdPeriod.away.goals;
					gameObj.homeScore3rd = thirdPeriod.home.goals;
				}
				if (linescore.currentPeriod > 3) {
					overtimePeriod = linescore.periods.filter(p => p.num === linescore.currentPeriod);
					[overtimePeriod] = overtimePeriod;
					gameObj.awayScoreOT = overtimePeriod.away.goals;
					gameObj.homeScoreOT = overtimePeriod.home.goals;
					gameObj.overtime = true;
				}

				const awayTeamStr = [`${gameObj.awayTeam} `, awayPP, awayEN].join('');
				const awayHomeStr = [`${gameObj.homeTeam} `, homePP, homeEN].join('');
				const awayRowArr = [awayTeamStr.padEnd(11, ' '), gameObj.awayScore1st, gameObj.awayScore2nd, gameObj.awayScore3rd];
				const homeRowArr = [awayHomeStr.padEnd(11, ' '), gameObj.homeScore1st, gameObj.homeScore2nd, gameObj.homeScore3rd];
				gameObj.awayScoreFinal = away.score;
				gameObj.homeScoreFinal = home.score;
				gameObj.awayShots = linescore.teams.away.shotsOnGoal.toString().padEnd(2, ' ');
				gameObj.homeShots = linescore.teams.home.shotsOnGoal.toString().padEnd(2, ' ');
				gameObj.overtime ? awayRowArr.push(gameObj.awayScoreOT, gameObj.awayScoreFinal, gameObj.awayShots) : awayRowArr.push(gameObj.awayScoreFinal, gameObj.awayShots);
				gameObj.overtime ? homeRowArr.push(gameObj.homeScoreOT, gameObj.homeScoreFinal, gameObj.homeShots) : homeRowArr.push(gameObj.homeScoreFinal, gameObj.homeShots);
				gameObj.awayTeamLine = awayRowArr.join('   ');
				gameObj.homeTeamLine = homeRowArr.join('   ');
				const gameTimeEST = moment(game.gameDate).tz('America/New_York').format('h:mm A z');
				const gameTime = (statusCode > 2) ? formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal) : gameTimeEST;
				gameObj.clock = gameTime;
				const o = gameObj.overtime ? 4 : 0;
				const periodsRow = gameObj.overtime ? '1   2   3   OT  T   SOG ' : '1   2   3   T   SOG ';
				let scoreboardStr = '```\n';
				scoreboardStr += `┌${''.padEnd(35 + o, '─')}┐\n`;
				scoreboardStr += `| ${gameObj.clock.padEnd(14, ' ')}${periodsRow}│\n`;
				scoreboardStr += `├${''.padEnd(14, '─')}${''.padEnd(20 + o, '────')}─┤\n`;
				scoreboardStr += `│ ${gameObj.awayTeamLine}  │\n`;
				scoreboardStr += `├${''.padEnd(14, '─')}${''.padEnd(20 + o, '────')}─┤\n`;
				scoreboardStr += `│ ${gameObj.homeTeamLine}  │\n`;
				scoreboardStr += `└${''.padEnd(35 + o, '─')}┘\n`;
				scoreboardStr += '```';
				gameObj.scoreboard = scoreboardStr;

				return gameObj;
			});
		}

		let gameData = schedule.dates.map(({ games }) => getScores(games));
		gameData = gameData[0][0];
		const contentObj = await fetch(`https://statsapi.web.nhl.com${gameData.content}`).then(response => response.json());
		const embed = new RichEmbed();
		embed.setColor(0x59acef);

		if ((gameData.status < 3 && (!flagBoxscore && !flagRecap)) || flagPreview) {

			if (contentObj.messageNumber !== 10 && contentObj.editorial.preview.items[0]) {
				const pre = contentObj.editorial.preview.items[0];
				const contributorFooter = pre.contributor.source ? `By ${pre.contributor.contributors[0].name} / ${pre.contributor.source}` : `By ${pre.contributor.contributors[0].name}`;
				embed.setTitle(pre.headline);
				embed.setURL(`https://www.nhl.com${pre.url}`);
				embed.setDescription(`${pre.preview}\n\n${pre.subhead}`);
				embed.setAuthor('Game Preview', 'https://i.imgur.com/zl8JzZc.png');
				if (Object.keys(pre.media).length > 0) { embed.setImage(pre.media.image.cuts['640x360'].src); }
				embed.setTimestamp(pre.date);
				embed.setFooter(contributorFooter);
			}
			else {
				return message.reply('no `Game Summary` found.');
			}
		}
		else if ((gameData.status > 2 && gameData.status < 5 && gameData.status > 7) || flagBoxscore) {
			embed.setAuthor('Boxscore', 'https://i.imgur.com/zl8JzZc.png');
			embed.setDescription(gameData.scoreboard);
		}
		else if ((gameData.status > 4 && gameData.status < 8) || flagRecap) {

			if (contentObj.messageNumber !== 10 && contentObj.editorial.recap.items[0]) {
				const post = contentObj.editorial.recap.items[0];
				const contributorFooter = post.contributor.source ? `By ${post.contributor.contributors[0].name} / ${post.contributor.source}` : `By ${post.contributor.contributors[0].name}`;
				embed.setTitle(post.headline);
				embed.setURL(`https://www.nhl.com${post.url}`);
				embed.setDescription(post.subhead);
				embed.setAuthor('Game Recap', 'https://i.imgur.com/zl8JzZc.png');
				if (Object.keys(post.media).length > 0) { embed.setImage(post.media.image.cuts['640x360'].src); }
				embed.setTimestamp(post.date);
				embed.setFooter(contributorFooter);
			}
			else {
				return message.reply('no `Game Recap` found.');
			}
		}
		else {
			return message.reply('no game found.');
		}

		message.channel.send(embed);
	},
};