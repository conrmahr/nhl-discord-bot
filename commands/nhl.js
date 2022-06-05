const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'nhl',
	usage: '[<date>] [<team> <opponent>] [-<flag>]',
	description: 'Get games for `today`, `tomorrow`, `yesterday`, `next` 5 games, `last` 5 games, or a given date `YYYY-MM-DD`. If nothing is specified, games scheduled for today will return. Filter with a specific team and opponent abbreviations. Add flags `-tv`, `-venue`, `-hide`, `-zone` for more options.',
	category: 'scores',
	aliases: ['nhl', 'n'],
	examples: ['', 'tomorrow -tv -venue', 'next nyi nyr', '-hide', '-zone=europe/stockholm'],
	async execute(message, args, prefix, flags, timezone) {

		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const { seasons } = await fetch('https://statsapi.web.nhl.com/api/v1/seasons/current/').then(response => response.json());
		const endpoint = 'https://statsapi.web.nhl.com/api/v1/schedule/';
		const parameters = { expand: ['schedule.teams', 'schedule.linescore', 'schedule.game.seriesSummary'] };
		let limit = 1;
		let flagVenue = false;
		let flagHide = false;
		const timezoneNHL = 'America/New_York';
		const gameDateTimeNHL = moment.tz(timezoneNHL);
		const gameDateTimeNHLStart = gameDateTimeNHL.clone().startOf('date');
		const gameDateTimeNHLEnd = gameDateTimeNHL.clone().endOf('date');

		for (const flag of flags) {
			if (['tv', 't'].includes(flag)) {
				parameters.expand.push('schedule.broadcasts');
			}
			else if (['venue', 'v'].includes(flag)) {
				flagVenue = true;
			}
			else if (['hide', 'h'].includes(flag)) {
				flagHide = true;
			}
			else if (['zone', 'z'].includes(flag.substring(0, 1))) {
				timezone = (flag.length > 0) ? flag.split('=', 2)[1] : timezone;

				if (!moment.tz.zone(timezone)) {
					return message.reply({ content: `\`${timezone}\` is not a valid timezone database name. ${prefix}help nhl\` for an example.`, allowedMentions: { repliedUser: true } });
				}
			}
			else {
				return message.reply({ content: `\`-${flag}\` is not a valid flag. Type \`${prefix}help nhl\` for list of flags.`, allowedMentions: { repliedUser: true } });
			}
		}

		if (args[0]) {

			if (['last', 'yesterday', 'yd', 'today', 'tomorrow', 'tmw', 'next'].includes(args[0])) {
				switch (args[0]) {
				case 'last':
					parameters.startDate = moment(seasons[0].regularSeasonStartDate).format('YYYY-MM-DD');
					parameters.endDate = gameDateTimeNHLEnd.format('YYYY-MM-DD');
					limit = 5;
					break;
				case 'yesterday':
				case 'yd':
					parameters.startDate = gameDateTimeNHLStart.add(-1, 'day').format('YYYY-MM-DD');
					parameters.endDate = parameters.startDate;
					break;
				case 'today':
					parameters.startDate = gameDateTimeNHLStart.format('YYYY-MM-DD');
					parameters.endDate = gameDateTimeNHLEnd.format('YYYY-MM-DD');
					break;
				case 'tomorrow':
				case 'tmw':
					parameters.startDate = gameDateTimeNHLStart.add(1, 'day').format('YYYY-MM-DD');
					parameters.endDate = parameters.startDate;
					break;
				case 'next':
					parameters.startDate = gameDateTimeNHLStart.format('YYYY-MM-DD');
					parameters.endDate = moment(seasons[0].seasonEndDate).format('YYYY-MM-DD');
					limit = 5;
					break;
				}
			}
			else if (moment(args[0], 'YYYY-MM-DD', true).isValid()) {
				const gameDateTimeNHLDateOnly = moment(args[0]).tz(timezoneNHL).format('YYYY-MM-DD');
				parameters.startDate = gameDateTimeNHLDateOnly;
				parameters.endDate = gameDateTimeNHLDateOnly;
			}
			else {
				parameters.startDate = gameDateTimeNHLStart.format('YYYY-MM-DD');
				parameters.endDate = gameDateTimeNHLEnd.format('YYYY-MM-DD');
				args.push(args[0]);
			}

			if (args[1]) {

				const teamObj = teams.find(o => o.abbreviation === args[1].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());

				if (teamObj) {
					parameters.teamId = teamObj.id;
				}
				else {
					return message.reply({ content: `\`${args[1]}\` is not a valid argument. Type \`${prefix}help nhl\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
				}
			}

			if (args[2]) {

				const opponentObj = teams.find(o => o.abbreviation === args[2].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());

				if (opponentObj) {
					parameters.opponentId = opponentObj.id;
				}
				else {
					return message.reply({ content: `\`${args[2]}\` is not a valid argument. Type \`${prefix}help nhl\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
				}
			}
		}

		const query = qs.stringify(parameters, { arrayFormat: 'comma', addQueryPrefix: true });
		const schedule = await fetch(`${endpoint}${query}`).then(response => response.json());

		if (!schedule.totalGames) return message.reply({ content: 'No games scheduled.', allowedMentions: { repliedUser: true } });

		function getScores(games) {
			return games.map(game => {

				function isBold(w, l) {
					const b = (w > l) ? '**' : '';
					return b;
				}

				function formatPeriod(t, p) {
					const possibleTime = { Final: 'F', END: '0:00' };
					const remain = possibleTime[t] || t;
					let spacer = '/';
					let ordinal = p;
					if (remain === 'F' && p === '3rd' || remain === 'F' && p === '2nd') {
						spacer = '';
						ordinal = '';
					}

					return `(${remain}${spacer}${ordinal})`;
				}

				const { gameType, status: { statusCode }, teams: { away, home }, linescore, broadcasts, venue, seriesSummary } = game;
				const awayTeam = away.team.abbreviation;
				const homeTeam = home.team.abbreviation;
				const awayBB = isBold(away.score, home.score);
				const homeBB = isBold(home.score, away.score);
				let match = '';
				let series = '';
				let tv = '';
				let arena = '';

				if (gameType === 'P' && seriesSummary) {
					if (limit === 1 && !flagHide) {
						series = seriesSummary.seriesStatus ? ` **${seriesSummary.seriesStatus}** ` : ' **Series tied 0-0** ';
					}
					match = '[Playoffs] ';
				}
				else if (gameType === 'A') {
					match = '[ASG] ';
				}
				else if (gameType !== 'R') {
					match = `[${gameType}] `;
				}

				if (broadcasts) {
					const channels = broadcasts.map(i => i.name).join(', ');
					tv = ` :tv: [${channels}] `;
				}

				if (venue && flagVenue) {
					arena = ` :stadium: [${venue.name}] `;
				}

				if (statusCode < 3 || flagHide) {
					const gameTimeTZ = moment(game.gameDate).tz(timezone);
					const gameTimeNHL = moment(game.gameDate).tz(timezoneNHL);
					const dayDiff = moment(gameTimeTZ.format('YYYY-MM-DD')).diff(gameTimeNHL.format('YYYY-MM-DD'), 'days');
					const plusMinusDay = (dayDiff > 0) ? ' (+1 day)' : (dayDiff < 0) ? ' (-1 day)' : '';
					const gameTime = (statusCode > 2 && !flagHide) ? formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal) : `${gameTimeTZ.format('h:mm A z')}${plusMinusDay}`;
					return `${match}${awayTeam} @ ${homeTeam} ${gameTime}${series}${arena}${tv}`;
				}
				else if (statusCode > 2 && statusCode < 5) {
					const clock = function getClock(timeLeft, type) {
						const clockString = (timeLeft > 0 && type === 'int') ? ` (${linescore.currentPeriodOrdinal} Int - ${moment().startOf('day').seconds(timeLeft).format('mm:ss')}) ` : (timeLeft > 0 && type === 'pp') ? `[*PP ${moment().startOf('day').seconds(timeLeft).format('mm:ss')}*] ` : '';
						return clockString;
					};

					const awayPP = linescore.teams.away.powerPlay ? clock(linescore.powerPlayInfo.situationTimeRemaining, 'pp') : '';
					const homePP = linescore.teams.home.powerPlay ? clock(linescore.powerPlayInfo.situationTimeRemaining, 'pp') : '';
					const awayEN = linescore.teams.away.goaliePulled ? ' [*EN*] ' : '';
					const homeEN = linescore.teams.home.goaliePulled ? ' [*EN*] ' : '';
					const periodTime = linescore.intermissionInfo.inIntermission ? clock(linescore.intermissionInfo.intermissionTimeRemaining, 'int') : formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal);
					return `${match}${awayBB}${awayTeam} ${away.score}${awayBB} ${awayPP}${awayEN} ${homeBB}${homeTeam} ${home.score}${homeBB} ${homePP}${homeEN} ${periodTime}${series}${arena}${tv}`;
				}
				else if (statusCode > 4 && statusCode < 8) {
					return `${match}${awayBB}${awayTeam} ${away.score}${awayBB} ${homeBB}${homeTeam} ${home.score}${homeBB} ${formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal)}${series}${arena}`;
				}
				else if (statusCode === '8') {
					return `${match}${awayTeam} @ ${homeTeam} TBD ${series}`;
				}
				else if (statusCode === '9') {
					return `${match}${awayTeam} @ ${homeTeam} PPD ${series}`;
				}
				else {
					return 'Game status not found.';
				}
			}).join('\u200B\n');
		}

		if (args[0] === 'last') {
			schedule.dates.reverse();
		}

		const embed = new MessageEmbed();
		embed.setColor('#7289da');
		embed.setAuthor({ name: 'NHL Scores', iconURL: 'https://i.imgur.com/zl8JzZc.png' });

		schedule.dates.slice(0, limit).map(({ date, games }) => {

			return embed.addField(`:hockey: ${moment.tz(`${date} 12:00`, timezoneNHL).format('ddd, MMM DD')}`, `${getScores(games)}`);
		});

		return message.channel.send({ embeds: [embed] });
	},
};