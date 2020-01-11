const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const querystring = require('querystring');

module.exports = {
	name: 'nhl',
	usage: '<date> <team> <opponent> -<flag>',
	description: 'Get games for `today`, `tomorrow`, `yesterday`, `next` 5 games, `last` 5 games, or a given date `YYYY-MM-DD`. If nothing is specified, games scheduled for today will return. Add abbreviations to filter for a specific team and opponent. Add flags `-tv` and/or `-venue`for more detail.',
	category: 'scores',
	aliases: ['nhl', 'n'],
	examples: ['', 'nyi', 'tomorrow -tv -venue', 'next nyi nyr'],
	async execute(message, args, flags, prefix) {

		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const { seasons } = await fetch('https://statsapi.web.nhl.com/api/v1/seasons/current/').then(response => response.json());
		const endpoint = 'https://statsapi.web.nhl.com/api/v1/schedule/?';
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
			else if (moment(args[0], 'YYYY-MM-DD').isValid()) {
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
					return message.channel.send(`\`${args[1]}\` is not a valid team. Type \`${prefix}teams\` for a list of teams.`);
				}
			}

			if (args[2]) {

				const opponentObj = teams.find(o => o.abbreviation === args[2].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase());

				if (opponentObj) {
					parameters.opponentId = opponentObj.id;
				}
				else {
					return message.channel.send(`\`${args[2]}\` is not a valid opponent. Type \`${prefix}teams\` for a list of teams.`);
				}
			}
		}

		let expands = 'schedule.linescore';
		let flagBroadcasts = false;
		let flagVenue = false;
		let flagHide = false;
		flags.forEach(flag => {
			if (['tv', 't'].includes(flag)) {
				expands += ',schedule.broadcasts';
				flagBroadcasts = true;
			}
			else if (['venue', 'v'].includes(flag)) {
				flagVenue = true;
			}
			else if (['hide', 'h'].includes(flag)) {
				flagHide = true;
			}
			else {
				return message.channel.send(`\`-${flag}\` is not a valid flag. Type \`${prefix}help nhl\` for list of flags.`);
			}
		});

		parameters.expand = expands;
		parameters.gameType = ['PR', 'R', 'P', 'A'];
		const query = querystring.stringify(parameters);
		const schedule = await fetch(endpoint + query).then(response => response.json());
		const checkGames = schedule.totalGames;
		if (!checkGames) return message.reply('No games scheduled.');

		function getScores(games) {
			return games.map(game => {

				function isBold(w, l) {
					if(w > l) {
						return '**';
					}
					else {
						return '';
					}
				}

				function formatPeriod(p) {
					switch(p) {
					case 'OT':
						return 'F/OT';
					case 'SO':
						return 'F/SO';
					default:
						return 'F';
					}
				}

				const { status: { statusCode }, teams: { away, home }, linescore, broadcasts, venue } = game;
				const awayTeam = teams.find(o => o.id === away.team.id).abbreviation;
				const homeTeam = teams.find(o => o.id === home.team.id).abbreviation;
				const awayBB = isBold(away.score, home.score);
				const homeBB = isBold(home.score, away.score);
				let tv = '';
				let arena = '';
				if (broadcasts && flagBroadcasts) {
					const channels = broadcasts.map(i => i.name).join(', ');
					tv = '[' + channels + ']';
				}
				if (venue && flagVenue) {
					arena = '[' + game.venue.name + ']';
				}

				if (statusCode < 3 || flagHide) {
					const gameTimeEST = moment(game.gameDate).tz('America/New_York').format('h:mm A z');
					return `${awayTeam} @ ${homeTeam} (${gameTimeEST}) ${arena} ${tv}`;
				}
				else if (statusCode > 2 && statusCode < 5) {
					const awayPP = linescore.teams.away.powerPlay ? '[*PP*]' : '';
					const homePP = linescore.teams.home.powerPlay ? '[*PP*]' : '';
					const awayEN = linescore.teams.away.goaliePulled ? '[*EN*]' : '';
					const homeEN = linescore.teams.home.goaliePulled ? '[*EN*]' : '';
					return `${awayTeam} ${away.score} ${awayPP} ${awayEN} ${homeTeam} ${home.score} ${homePP} ${homeEN} (${linescore.currentPeriodTimeRemaining}/${linescore.currentPeriodOrdinal}) ${arena} ${tv}`;
				}
				else if (statusCode > 5 && statusCode < 8) {
					return `${awayBB}${awayTeam} ${away.score}${awayBB} ${homeBB}${homeTeam} ${home.score}${homeBB} (${formatPeriod(linescore.currentPeriodOrdinal)}) ${arena} ${tv}`;
				}
				else if (statusCode === 9) {
					return `${awayTeam} @ ${homeTeam} PPD`;
				}
			}).join('\n');
		}

		if (args[0] === 'last') {
			schedule.dates.reverse();
		}

		const embed = new RichEmbed();
		embed.setColor(0xa1cdff);
		embed.setAuthor('NHL Scores', 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/05_NHL_Shield.svg/150px-05_NHL_Shield.svg.png');
		schedule.dates.slice(0, limit).map(({ date, games }) => embed.addField(':hockey: ' + moment(date).format('ddd, MMM DD'), `${getScores(games)}`));

		message.channel.send(embed);

	},
};