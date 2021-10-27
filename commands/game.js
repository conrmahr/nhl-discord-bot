const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const turndown = require('turndown');

module.exports = {
	name: 'game',
	usage: '[<date>] <team> [-<flag>]',
	description: 'Get game boxscores, scoring, and penalty summaries. Add one flag `-scoring`, `-penalties`, `-lineups`, or `-recap` for more options.',
	category: 'stats',
	aliases: ['game', 'g'],
	examples: ['phi', '1985-12-11 edm -scoring', '1981-02-26 bos -penalties'],
	async execute(message, args, flags, prefix, timezone) {

		const endpoint = 'https://statsapi.web.nhl.com';
		const { teams } = await fetch(`${endpoint}/api/v1/teams/`).then(response => response.json());
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

		parameters.expand = ['schedule.teams', 'schedule.linescore', 'schedule.game.seriesSummary'];
		let flagLineup = false;
		let flagScoring = false;
		let flagPenalty = false;
		let flagRecap = false;

		for (const flag of flags) {
			if (['lineups', 'l'].includes(flag)) {
				flagLineup = true;
			}
			else if (['scoring', 's'].includes(flag)) {
				flagScoring = true;
			}
			else if (['penalties', 'p'].includes(flag)) {
				flagPenalty = true;
			}
			else if (['recap', 'r'].includes(flag)) {
				flagRecap = true;
			}
			else {
				return message.reply(`\`-${flag}\` is not a valid flag. Type \`${prefix}help game\` for list of flags.`);
			}
		}

		const query = qs.stringify(parameters, { arrayFormat: 'comma', addQueryPrefix: true });
		const schedule = await fetch(`${endpoint}/api/v1/schedule/${query}`).then(response => response.json());

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

				const { link, gameType, status: { statusCode }, gameDate, teams: { away, home }, linescore, venue, content, seriesSummary } = game;
				const gameObj = {
					author: '',
					authorURL: 'https://i.imgur.com/zl8JzZc.png',
					type: gameType,
					status: Number(statusCode),
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
					live: link,
					content: content.link,
					venue: venue.name,
					match: '',
					series: '',
				};

				if (gameObj.type === 'PR') {
					gameObj.match = ' *Pre-season\n';
				}
				else if (gameObj.type === 'A') {
					gameObj.match = ' *All-Star game\n';
				}
				else if (gameObj.type === 'P' && seriesSummary) {
					gameObj.series = seriesSummary.seriesStatus ? seriesSummary.seriesStatus : 'Series tied 0-0';
					gameObj.match = seriesSummary.gameLabel ? ` Playoffs - ${gameObj.series}\n` : '';
				}

				if (gameObj.status < 3) {
					const gameTime = `${moment(game.gameDate).tz(timezone).format('h:mm A z')}`;
					gameObj.clock = gameTime;
				}
				else if (gameObj.status < 8) {
					gameObj.clock = formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal);
				}
				else if (gameObj.status === 8) {
					gameObj.clock = `${gameObj.awayTeam} @ ${gameObj.homeTeam} TBD`;
				}
				else if (gameObj.status === 9) {
					gameObj.clock = `${gameObj.awayTeam} @ ${gameObj.homeTeam} PPD`;
				}
				else {
					gameObj.clock = 'N/A';
				}

				const awayPP = linescore.teams.away.powerPlay ? '[PP]' : '';
				const homePP = linescore.teams.home.powerPlay ? '[PP]' : '';
				const awayEN = linescore.teams.away.goaliePulled ? '[EN]' : '';
				const homeEN = linescore.teams.home.goaliePulled ? '[EN]' : '';
				const hasShootout = linescore.hasShootout;
				let firstPeriod, secondPeriod, thirdPeriod;

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
					let awayOT = (linescore.teams.away.goals > linescore.teams.home.goals) ? 1 : 0;
					let homeOT = (linescore.teams.away.goals < linescore.teams.home.goals) ? 1 : 0;
					if (hasShootout) {
						awayOT += ` (${linescore.shootoutInfo.away.scores}-${linescore.shootoutInfo.away.attempts})`;
						homeOT += ` (${linescore.shootoutInfo.home.scores}-${linescore.shootoutInfo.home.attempts})`;
					}

					gameObj.awayScoreOT = awayOT;
					gameObj.homeScoreOT = homeOT;
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
				const ot = linescore.currentPeriodOrdinal ? linescore.currentPeriodOrdinal.padEnd(4) : '';
				const b = hasShootout ? [41, 20] : gameObj.overtime ? [35, 14] : [35, 14];
				const o = gameObj.overtime ? 4 : 0;
				const periodsRow = hasShootout ? '1   2   3   SO        T   SOG ' : gameObj.overtime ? `1   2   3   ${ot}T   SOG ` : '1   2   3   T   SOG ';
				let scoreboardStr = '```md\n';
				scoreboardStr += `${gameObj.match}`;
				scoreboardStr += `┌${''.padEnd(b[0] + o, '─')}┐\n`;
				scoreboardStr += `| ${gameObj.clock.padEnd(14, ' ')}${periodsRow}│\n`;
				scoreboardStr += `├${''.padEnd(b[1], '─')}${''.padEnd(20 + o, '────')}─┤\n`;
				scoreboardStr += `│ ${gameObj.awayTeamLine}  │\n`;
				scoreboardStr += `├${''.padEnd(b[1], '─')}${''.padEnd(20 + o, '────')}─┤\n`;
				scoreboardStr += `│ ${gameObj.homeTeamLine}  │\n`;
				scoreboardStr += `└${''.padEnd(b[0] + o, '─')}┘\n`;
				scoreboardStr += '```';
				gameObj.scoreboard = scoreboardStr;

				return gameObj;
			});
		}

		let gameData = schedule.dates.map(({ games }) => getScores(games));
		gameData = gameData[0][0];
		const feedObj = await fetch(`${endpoint}${gameData.live}`).then(response => response.json());
		const contentObj = await fetch(`${endpoint}${gameData.content}`).then(response => response.json());
		const embed = new MessageEmbed();
		embed.setColor(0x59acef);
		const periodName = { 0: '1st Period', 1: '2nd Period', 2: '3rd Period', 3: 'OT', 4: 'SO' };
		const allPlays = feedObj.liveData.plays.allPlays;
		const playsByPeriod = feedObj.liveData.plays.playsByPeriod;
		const scoringPlays = feedObj.liveData.plays.scoringPlays;
		const penaltyPlays = feedObj.liveData.plays.penaltyPlays;
		const decisions = feedObj.liveData.decisions;
		const datetime = feedObj.gameData.datetime;
		const eventsMethod = (y, z) => z.filter((e, i)=>{
			return (y.includes(i));
		});
		const getHighlightURL = (content, eid)=>{
			let watch = '';
			if (!content.media) return;
			content.media.milestones.items.filter(x => x.statsEventId == eid).filter(plays => {
				if (Object.keys(plays.highlight).length === 0) return;
				watch = plays.highlight.playbacks.find(({ name }) => name === 'FLASH_1800K_896x504' || name === 'FLASH_1800K_960X540').url;
			});
			return watch;
		};

		if (flagLineup) {

			if (contentObj.messageNumber !== 10 && contentObj.editorial.preview.items[0]) {
				const pre = contentObj.editorial.preview.items[0];
				const turndownService = new turndown();
				const contributorFooter = pre.contributor.contributors[0] ? `By ${pre.contributor.contributors[0].name}` : 'By NHL.com';
				embed.setTitle(pre.headline);
				embed.setURL(`https://www.nhl.com${pre.url}`);
				const preTitle = `${turndownService.turndown(pre.preview)}\n\n${pre.subhead}`;
				embed.setDescription(preTitle.replace(/#/g, ''));
				embed.setAuthor('Game Preview', 'https://i.imgur.com/zl8JzZc.png');
				if (Object.keys(pre.media).length > 0) embed.setImage(pre.media.image.cuts['640x360'].src);
				embed.setTimestamp(pre.date);
				embed.setFooter(contributorFooter);
			}
			else {
				return message.reply('no `Game Preview` found.');
			}
		}
		else if (flagRecap) {

			if (contentObj.messageNumber !== 10 && contentObj.editorial.recap.items[0]) {
				const post = contentObj.editorial.recap.items[0];
				const final = `**${gameData.awayTeam} ${gameData.awayScoreFinal} ${gameData.homeTeam} ${gameData.homeScoreFinal} (${gameData.clock})**`;
				const contributorFooter = post.contributor.source ? `By ${post.contributor.contributors[0].name} / ${post.contributor.source}` : `By ${post.contributor.contributors[0].name}`;
				embed.setTitle(post.headline);
				embed.setURL(`https://www.nhl.com${post.url}`);
				embed.setDescription(`${final}\n${post.subhead}`);
				embed.setAuthor('Game Recap', 'https://i.imgur.com/zl8JzZc.png');
				if (Object.keys(post.media).length > 0) { embed.setImage(post.media.image.cuts['640x360'].src); }
				embed.setTimestamp(post.date);
				embed.setFooter(contributorFooter);
			}
			else {
				return message.reply('no `Game Recap` found.');
			}
		}
		else if (flagScoring) {
			embed.setDescription(`:hockey: ${gameData.awayTeam} ${gameData.awayScoreFinal} ${gameData.homeTeam} ${gameData.homeScoreFinal} (${gameData.clock})`);
			embed.setAuthor('Scoring Summary', 'https://i.imgur.com/zl8JzZc.png');
			embed.setFooter(gameData.venue);
			embed.setTimestamp(datetime.dateTime);

			if (scoringPlays.length && gameData.status > 2 && gameData.status < 8) {
				const shootoutStr = allPlays.filter(({ players, about: { period } }) => period === 5 && players).map(({ players, team: { triCode }, result: { description } }) => `${players.filter(({ playerType }) => playerType === 'Shooter' || playerType === 'Scorer').map(({ playerType }) => `${playerType === 'Shooter' ? ':x:' : ':white_check_mark:'} ${triCode}`)} ${description}`).join('\n');
				playsByPeriod.slice(0, 4).forEach((e, i) => {
					const scoringStr = eventsMethod(scoringPlays, allPlays).filter(({ about: { period } }) => period === i + 1).map(({ players, result: { strength, emptyNet }, about: { eventId, periodTime, goals: { away, home } }, team: { triCode } }) => `:rotating_light: ${periodTime} ${away}-${home} ${triCode} [${players.filter(({ playerType }) => playerType === 'Scorer').map(({ player: { fullName }, seasonTotal }) => `**${fullName} ${seasonTotal}**${strength.code === 'EVEN' ? '' : ` [${strength.code}]`}${emptyNet ? ' [EN]' : ''}`).join('')} (${players.filter(({ playerType }) => playerType === 'Assist').map(({ player: { fullName }, seasonTotal }) => `${fullName.split(' ').slice(1).join(' ')} ${seasonTotal}`).join(', ') || 'Unassisted'})](${getHighlightURL(contentObj, eventId)})`).join('\n') || 'No goals';
					embed.addField(periodName[i], scoringStr);
				});

				if (shootoutStr) embed.addField('Shootout', shootoutStr);
			}
		}
		else if (flagPenalty) {
			const officialsStr = feedObj.liveData.boxscore.officials.map(({ official: { fullName }, officialType }) => `${officialType}: ${fullName}`).join('\n');
			embed.setDescription(`:hockey: ${gameData.awayTeam} ${gameData.awayScoreFinal} ${gameData.homeTeam} ${gameData.homeScoreFinal} (${gameData.clock})`);
			embed.setAuthor('Penalty Summary', 'https://i.imgur.com/zl8JzZc.png');
			embed.setFooter(gameData.venue);
			embed.setTimestamp(datetime.dateTime);

			if (penaltyPlays.length && gameData.status > 2 && gameData.status < 8) {
				const penaltyObj = eventsMethod(penaltyPlays, allPlays);
				playsByPeriod.slice(0, 4).forEach((e, i) => {
					let penaltyStr = penaltyObj.filter(({ about: { period } }) => period === i + 1).map(({ about: { periodTime }, result: { description, penaltyMinutes }, team: { triCode } }) => `:warning: ${triCode}${periodTime ? ` ${periodTime} ` : ' '}[${penaltyMinutes} min] ${description}`).join('\n') || 'No penalties';

					if (penaltyStr.length > 1023) penaltyStr = `${penaltyObj.filter(({ about: { period } }) => period === i + 1).length} penalties called this period`;
					embed.addField(periodName[i], penaltyStr);
				});

			}
			if (officialsStr) embed.addField('Officials', officialsStr);
		}
		else {
			embed.setAuthor('Boxscore', 'https://i.imgur.com/zl8JzZc.png');
			embed.setDescription(gameData.scoreboard);
			embed.setFooter(gameData.venue);
			embed.setTimestamp(datetime.dateTime);

			if (decisions.winner && decisions.firstStar) {
				const goalies = [`:regional_indicator_w: ${decisions.winner.fullName}`, `:regional_indicator_l: ${decisions.loser.fullName}`].join('\n');
				const stars = [`:star: ${decisions.firstStar.fullName}`, `:star::star: ${decisions.secondStar.fullName}`, `:star::star::star: ${decisions.thirdStar.fullName}`].join('\n');
				embed.addField('Goalies', goalies, true);
				embed.addField('Three Stars', stars, true);

				if (typeof contentObj.media !== 'undefined') {
					const shortPlayback = contentObj.media.epg.filter(({ title }) => title === 'Recap').map(({ items }) => items[0].playbacks.find(({ name }) => name === 'FLASH_1800K_896x504' || name === 'FLASH_1800K_960X540').url);
					const longPlayback = contentObj.media.epg.filter(({ title }) => title === 'Extended Highlights').map(({ items }) => items[0].playbacks.find(({ name }) => name === 'FLASH_1800K_896x504' || name === 'FLASH_1800K_960X540').url);
					embed.addField('Highlights', `:film_frames: [Recap](${shortPlayback})\n:film_frames: [Extended](${longPlayback})`, true);
				}
			}
		}

		message.channel.send(embed);
	},
};