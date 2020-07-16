const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'nhl',
	usage: '<date> <team> <opponent> -<flag>',
	description: 'Get games for `today`, `tomorrow`, `yesterday`, `next` 5 games, `last` 5 games, or a given date `YYYY-MM-DD`. If nothing is specified, games scheduled for today will return. Add abbreviations to filter for a specific team and opponent. Add flags `-tv`, `-venue`, `-hide` for more options.',
	category: 'scores',
	aliases: ['nhl', 'n'],
	examples: ['', 'nyi -hide', 'tomorrow -tv -venue', 'next nyi nyr'],
	async execute(message, args, flags, prefix) {

		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const { seasons } = await fetch('https://statsapi.web.nhl.com/api/v1/seasons/current/').then(response => response.json());
		const endpoint = 'https://statsapi.web.nhl.com/api/v1/schedule/';
		const parameters = {};
		let limit = 1;

		if (args[0]) {

			if (['last', 'yesterday', 'today', 'tomorrow', 'next'].includes(args[0])) {
				switch (args[0]) {
				case 'last':
					parameters.startDate = moment(seasons[0].regularSeasonStartDate).format('MM/DD/YYYY');
					parameters.endDate = moment().format('MM/DD/YYYY');
					limit = 5;
					break;
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
				case 'next':
					parameters.startDate = moment().format('MM/DD/YYYY');
					parameters.endDate = moment(seasons[0].seasonEndDate).format('MM/DD/YYYY');
					limit = 5;
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
					return message.reply(`\`${args[1]}\` is not a valid argument. Type \`${prefix}help nhl\` for a list of arguments.`);
				}
			}

			if (args[2]) {

				const opponentObj = teams.find(o => o.abbreviation === args[2].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());

				if (opponentObj) {
					parameters.opponentId = opponentObj.id;
				}
				else {
					return message.reply(`\`${args[2]}\` is not a valid argument. Type \`${prefix}help nhl\` for a list of arguments.`);
				}
			}
		}

		parameters.expand = ['schedule.teams', 'schedule.linescore'];
		let flagVenue = false;
		let flagHide = false;
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
			else {
				return message.reply(`\`-${flag}\` is not a valid flag. Type \`${prefix}help nhl\` for list of flags.`);
			}
		}

		const query = qs.stringify(parameters, { arrayFormat: 'comma', addQueryPrefix: true });
		const schedule = await fetch(`${endpoint}${query}`).then(response => response.json());

		if (!schedule.totalGames) return message.reply('no games scheduled.');

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

				const { status: { statusCode }, teams: { away, home }, linescore, broadcasts, venue } = game;
				const awayTeam = away.team.abbreviation;
				const homeTeam = home.team.abbreviation;
				const awayBB = isBold(away.score, home.score);
				const homeBB = isBold(home.score, away.score);
				let tv = '';
				let arena = '';
				if (broadcasts) {
					const channels = broadcasts.map(i => i.name).join(', ');
					tv = `:tv: [${channels}]`;
				}

				if (venue && flagVenue) {
					arena = `:stadium: [${venue.name}]`;
				}

				if (statusCode < 3 || flagHide) {
					const gameTimeEST = moment(game.gameDate).tz('America/New_York').format('h:mm A z');
					const gameTime = (statusCode > 2) ? formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal) : gameTimeEST;
					return `${awayTeam} @ ${homeTeam} ${gameTime} ${arena} ${tv}`;
				}
				else if (statusCode > 2 && statusCode < 5) {
					const clock = function getClock(s) {
						const c = s ? new Date(s * 1000).toISOString().slice(14, -5) : '';
						return c;
					};

					const awayPP = (linescore.teams.away.powerPlay && linescore.powerPlayInfo.situationTimeRemaining > 0) ? ' [*PP*]' : '';
					const homePP = (linescore.teams.home.powerPlay && linescore.powerPlayInfo.situationTimeRemaining > 0) ? ' [*PP*]' : '';
					const awayEN = linescore.teams.away.goaliePulled ? ' [*EN*]' : '';
					const homeEN = linescore.teams.home.goaliePulled ? ' [*EN*]' : '';
					const intermission = linescore.intermissionInfo.inIntermission ? `[${clock(linescore.intermissionInfo.intermissionTimeRemaining)} Int]` : '';
					return `${awayTeam} ${away.score}${awayPP}${awayEN} ${homeTeam} ${home.score}${homePP}${homeEN} ${formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal)} ${intermission} ${arena} ${tv}`;
				}
				else if (statusCode > 4 && statusCode < 8) {
					return `${awayBB}${awayTeam} ${away.score}${awayBB} ${homeBB}${homeTeam} ${home.score}${homeBB} ${formatPeriod(linescore.currentPeriodTimeRemaining, linescore.currentPeriodOrdinal)} ${arena}`;
				}
				else if (statusCode === '8') {
					return `${awayTeam} @ ${homeTeam} TBD`;
				}
				else if (statusCode === '9') {
					return `${awayTeam} @ ${homeTeam} PPD`;
				}
				else {
					return 'Game status not found.';
				}
			}).join('\u200B\n');
		}

		if (args[0] === 'last') {
			schedule.dates.reverse();
		}

		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor('NHL Scores', 'https://i.imgur.com/zl8JzZc.png');
		schedule.dates.slice(0, limit).map(({ date, games }) => embed.addField(`:hockey: ${moment(date).format('ddd, MMM DD')}`, `${getScores(games)}`));

		message.channel.send(embed);

	},
};