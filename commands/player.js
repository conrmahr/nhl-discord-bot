const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');
const { googleSearch } = require('../config.json');

module.exports = {
	name: 'player',
	usage: '<year> <name> -<flag>',
	description: 'Get player stats for active and former players. Add `YYYY` to specifiy a season. Add flags `-career`, `-playoffs`, `-carrer -playoffs`, `-log`, `-log -playoffs` for more options.',
	category: 'stats',
	aliases: ['player', 'p', 'pseason'],
	examples: ['barzal', '1993 selanne', 'gretzky -career', 'mcdavid -log'],
	async execute(message, args, flags, prefix) {

		const apiGoogleCustomSearch = 'https://www.googleapis.com/customsearch/v1';
		const { seasons } = await fetch('https://statsapi.web.nhl.com/api/v1/seasons/current').then(response => response.json());
		let fullSeason = seasons[0].seasonId;

		if (moment(args[0], 'YYYY', true).isValid()) {
			const prevSeason = args[0] - 1;
			fullSeason = `${prevSeason}${args[0]}`;
			args.shift();
		}

		const humanSeason = `${fullSeason.substring(0, 4)} - ${fullSeason.substring(6)}`;
		const terms = args.join(' ');
		const options = {
			key: googleSearch.key,
			cx: googleSearch.cx,
			num: 1,
			lr: 'lang_en',
			safe: 'active',
			fields: 'searchInformation,items(link)',
			siteSearch: 'https://www.nhl.com/player/',
			q: terms,
		};

		const google = await fetch(`${apiGoogleCustomSearch}${qs.stringify(options, { addQueryPrefix: true })}`).then(response => response.json());

		if (google.error) {
			const { error } = google;
			message.reply(`${error.code}: ${error.message}`);
		}
		else if (google.searchInformation.totalResults > 0 && args[0]) {
			const { link } = google.items[0];
			const playerId = link.slice(link.length - 7);
			const apiPeople = 'https://statsapi.web.nhl.com/api/v1/people/';
			const { people } = await fetch(`${apiPeople}${playerId}`).then(response => response.json());
			const p = people[0];
			const parameters = {};
			const career = ['career', 'c'];
			const playoffs = ['playoffs', 'p'];
			const gamelog = ['log', 'l'];
			const careerFlag = career.some(e => flags.includes(e));
			const playoffsFlag = playoffs.some(e => flags.includes(e));
			const gameLogFlag = gamelog.some(e => flags.includes(e));
			let last = 1;

			if (careerFlag && playoffsFlag) {
				parameters.stats = 'careerPlayoffs';
			}
			else if (gameLogFlag && playoffsFlag) {
				parameters.stats = 'playoffGameLog';
				last = 7;
			}
			else if (careerFlag) {
				parameters.stats = 'careerRegularSeason';
			}
			else if (playoffsFlag) {
				parameters.stats = 'statsSingleSeasonPlayoffs';
			}
			else if (gameLogFlag) {
				parameters.stats = 'gameLog';
				last = 5;
			}
			else {
				parameters.stats = 'statsSingleSeason';
			}

			parameters.season = fullSeason;
			let teamLogo = 'https://i.imgur.com/zl8JzZc.png';
			let currentTeam = '';
			let currentAge = '';
			const position = p.primaryPosition.abbreviation;
			const birthDate = moment(p.birthDate).format('MMM D, YYYY');
			const birthStateProvince = p.birthStateProvince ? p.birthStateProvince + ', ' : '';
			let statLine = '';

			if (p.active === true) {
				const { teams } = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${p.currentTeam.id}`).then(response => response.json());
				const html = await fetch(teams[0].officialSiteUrl).then(response => response.text());
				const $ = cheerio.load(html);
				teamLogo = $('[rel="shortcut icon"]').attr('href');
				currentTeam = ' ' + teams[0].abbreviation;
				currentAge = p.currentAge ? '| Age: ' + p.currentAge + ' |' : '|';
			}

			const query = qs.stringify(parameters, { addQueryPrefix: true });
			const thumbnail = 'https://nhl.bamcontent.com/images/headshots/current/168x168/';
			const renameTitle = { careerPlayoffs: 'Playoff Career', careerRegularSeason: 'Career', statsSingleSeasonPlayoffs: 'Playoffs', statsSingleSeason: 'Season', gameLog: 'Last 5', playoffGameLog: 'Last 7' };
			const singleSeason = renameTitle[parameters.stats];
			const data = await fetch(`${apiPeople}${playerId}/stats/${query}`).then(response => response.json());
			const embed = new RichEmbed();
			embed.setThumbnail(thumbnail + playerId + '.jpg');
			embed.setColor(0x59acef);
			embed.setAuthor(`${p.fullName} | #${p.primaryNumber}`, teamLogo);
			embed.setDescription(`${position} | ${p.height} | ${p.weight} lb ${currentAge} ${currentTeam}\nBorn: ${birthDate} (${p.birthCity}, ${birthStateProvince}${p.birthCountry})`);
			const { splits } = data.stats[0];

			if (splits.length > 0) {
				Object.keys(splits).slice(0, last).forEach(s=>{

					if (!gameLogFlag) {
						const g = {
							Games: splits[s].stat.games,
							TOI: splits[s].stat.timeOnIce,
							Goals: splits[s].stat.goals,
							Assists: splits[s].stat.assists,
							Points: splits[s].stat.points,
							PPG: splits[s].stat.powerPlayGoals,
							PPP: splits[s].stat.powerPlayPoints,
							PIM: splits[s].stat.pim,
							SHG: splits[s].stat.shortHandedGoals,
							SHP: splits[s].stat.shortHandedPoints,
							'Faceoff %': splits[s].stat.faceOffPct,
							Shots: splits[s].stat.shots,
							'Shot %': splits[s].stat.shotPct,
							'+/-': (splits[s].stat.plusMinus > 0) ? '+' + splits[s].stat.plusMinus : (splits[s].stat.plusMinus === 0) ? 'E' : splits[s].stat.plusMinus,
							Starts: splits[s].stat.gamesStarted,
							Wins: splits[s].stat.wins,
							Losses: splits[s].stat.loses,
							Ties: (splits[s].stat.ties === 0) ? null : splits[s].stat.ties,
							OTL: splits[s].stat.ot,
							SA: splits[s].stat.shotsAgainst,
							GA: splits[s].stat.goalsAgainst,
							GAA: splits[s].stat.goalAgainstAverage ? splits[s].stat.goalAgainstAverage.toFixed(2) : null,
							Saves: splits[s].stat.saves,
							'Sv%': splits[s].stat.savePercentage ? splits[s].stat.savePercentage.toFixed(3) : null,
							Shutouts: splits[s].stat.shutouts,
						};
						const seasonOrPlayoffs = splits[s].season ? splits[s].season.substring(0, 4) + '-' + splits[s].season.substring(6) : '-';
						embed.addField(singleSeason, seasonOrPlayoffs, true);
						Object.entries(g).filter(([, number ]) => number != null).forEach(([ key, value ]) => embed.addField(key, value, true));
					}
					else {
						const g = {
							date: moment(splits[s].date).format('MMM DD, YYYY'),
							opponent: splits[s].opponent.name,
							isHome: splits[s].isHome ? 'vs' : '@',
							isWin: splits[s].isWin ? 'W' : 'L',
							isOT: splits[s].isOT ? '/OT' : '',
							goals: splits[s].stat.goals,
							assists: splits[s].stat.assists,
							points: splits[s].stat.points,
							plusMinus: (splits[s].stat.plusMinus > 0) ? '+' + splits[s].stat.plusMinus : (splits[s].stat.plusMinus === 0) ? 'E' : splits[s].stat.plusMinus,
							pim: splits[s].stat.pim,
							hits: splits[s].stat.hits,
							shots: splits[s].stat.shots,
							TOI: (splits[s].stat.timeOnIce) ? splits[s].stat.timeOnIce : '--',
							gamesStarted: splits[s].stat.gamesStarted ? '1' : '0',
							decision: (splits[s].stat.decision === 'O') ? 'L/OT' : splits[s].stat.decision ? splits[s].stat.decision : 'ND',
							shotsAgainst: splits[s].stat.shotsAgainst,
							goalsAgainst: splits[s].stat.goalsAgainst,
							savePercentage: splits[s].stat.savePercentage ? splits[s].stat.savePercentage.toFixed(3) : null,
							shutouts: splits[s].stat.shutouts,
						};

						if (p.primaryPosition.abbreviation === 'G') {
							statLine = `GS ${g.gamesStarted} ${g.decision} | SA ${g.shotsAgainst} GA ${g.goalsAgainst} Sv% ${g.savePercentage} SO ${g.shutouts} TOI ${g.TOI}`;
						}
						else {
							statLine = `${g.goals}G-${g.assists}A-${g.points}P | +/- ${g.plusMinus} PIM ${g.pim} Hits ${g.hits} Shots ${g.shots} TOI ${g.TOI}`;
						}

						embed.addField(`:hockey: ${g.date} ${g.isHome} ${g.opponent} (${g.isWin}${g.isOT})`, statLine);
					}
				});

			}
			else {
				embed.addField(renameTitle[parameters.stats], (fullSeason.length > 0) ? humanSeason : '--', true);
				embed.addField('Games', 0, true);
			}

			message.channel.send(embed);

		}
		else {
			const missing = (terms.length > 0) ? `\`${terms}\` returned 0 results.` : `no name provided. Type \`${prefix}help player\` for command format.`;
			message.reply(missing);
		}

	},
};