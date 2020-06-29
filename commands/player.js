const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');
const { googleSearch } = require('../config.json');

module.exports = {
	name: 'player',
	usage: '<year> <name> -<flag>',
	description: 'Get player stats for active and inactive players. Add `YYYY` to specifiy a season. Add flags `-career`, `-playoffs`, `-carrer -playoffs`, `-log`, `-log -playoffs`, `-advanced`, `-filter=<keyword>` for more options.',
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

		const humanSeason = `${fullSeason.substring(0, 4)}-${fullSeason.substring(6)}`;
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
			const apiTeams = 'https://statsapi.web.nhl.com/api/v1/teams/';
			const { people } = await fetch(`${apiPeople}${playerId}`).then(response => response.json());
			const p = people[0];
			const parameters = {};
			const career = ['career', 'c'];
			const playoffs = ['playoffs', 'p'];
			const gamelog = ['log', 'l'];
			const advanced = ['advanced', 'a'];
			const careerFlag = career.some(e => flags.includes(e));
			const playoffsFlag = playoffs.some(e => flags.includes(e));
			const gameLogFlag = gamelog.some(e => flags.includes(e));
			const advancedFlag = advanced.some(e => flags.includes(e));
			const keywordFlag = flags.find(e => e.startsWith('filter=')) || '';
			const keyword = (keywordFlag.length > 0) ? keywordFlag.substring(7) : '';
			let last = 1;
			const limit = advancedFlag ? 25 : 3;

			if (careerFlag && playoffsFlag) {
				parameters.stats = 'careerPlayoffs';
			}
			else if (gameLogFlag && playoffsFlag) {
				parameters.stats = 'playoffGameLog';
				last = 7;
			}
			else if (gameLogFlag) {
				parameters.stats = 'gameLog';
				last = 5;
			}
			else if (playoffsFlag) {
				parameters.stats = 'statsSingleSeasonPlayoffs';
			}
			else if (careerFlag) {
				parameters.stats = 'careerRegularSeason';
			}
			else if (p.active) {
				parameters.stats = 'statsSingleSeason';
			}
			else {
				parameters.stats = 'careerRegularSeason';
			}

			parameters.season = fullSeason;
			parameters.player = [];
			parameters.bio = [];
			parameters.birthday = [];
			let teamLogo = 'https://i.imgur.com/zl8JzZc.png';
			let currentTeam = 'Inactive';
			let currentAge = '';
			let onPace = '';
			const fullName = `${p.fullName}`;
			const sweater = p.primaryNumber ? `#${p.primaryNumber}` : '';
			const shootsCatches = { Forward: 'Shoots:', Defenseman: 'Shoots:', Goalie: 'Catches:' };
			const hands = p.shootsCatches ? `${shootsCatches[p.primaryPosition.type]} ${p.shootsCatches}` : '';
			const flagsObj = {
				AUT: ':flag_at:',
				BLR: ':flag_by:',
				DNK: ':flag_dk:',
				EST: ':flag_ee:',
				IRL: ':flag_ie:',
				KAZ: ':flag_kz:',
				JAM: ':flag_jm:',
				JPN: ':flag_jp:',
				KOR: ':flag_kr:',
				POL: ':flag_pl:',
				SVK: ':flag_sk:',
				SVN: ':flag_si:',
				SWE: ':flag_se:',
				UKR: ':flag_ua:',
			};

			if (p.active === true) {
				const querySeason = { season: fullSeason };
				const { teams } = await fetch(`${apiTeams}/${p.currentTeam.id}/${qs.stringify(querySeason, { addQueryPrefix: true })}`).then(response => response.json());
				const html = await fetch(teams[0].officialSiteUrl).then(response => response.text());
				const $ = cheerio.load(html);
				teamLogo = $('[rel="shortcut icon"]').attr('href');
				currentTeam = teams[0].abbreviation ? `${teams[0].abbreviation} ` : '';
				currentAge = p.currentAge ? `(${p.currentAge}) ` : '';
				onPace = (parameters.stats === 'statsSingleSeason') ? 82 : null;
			}

			const flag = Object.keys(flagsObj).includes(p.nationality) ? flagsObj[p.nationality] : `:flag_${p.nationality.toLowerCase().substring(0, 2)}:`;
			const nationality = p.nationality ? `Nationality: ${flag}` : '';
			parameters.bio.push(currentTeam, p.primaryPosition.abbreviation, p.height, `${p.weight} lb`, hands, nationality);
			const todayObj = moment().format('MM DD');
			const birthDateObj = moment(p.birthDate).format('MM DD');
			const isBirthday = (todayObj === birthDateObj) ? ` :birthday: ${currentAge}` : '';
			const birthDate = `DOB: ${moment(p.birthDate).format('MMM-DD-YYYY')}${isBirthday}`;
			const birthCity = p.birthCity ? `${p.birthCity}` : '';
			const birthStateProvince = p.birthStateProvince ? `${p.birthStateProvince}, ` : '';
			const birthCountry = p.birthCountry ? `${birthStateProvince}${p.birthCountry}` : '';
			parameters.birthday.push(birthDate, birthCity, birthCountry);
			let statLine = '';
			const query = qs.stringify(parameters, { addQueryPrefix: true });
			const thumbnail = 'https://nhl.bamcontent.com/images/headshots/current/168x168/';
			const data = await fetch(`${apiPeople}${playerId}/stats/${query}`).then(response => response.json());
			if (Array.isArray(data.stats[0].splits) && data.stats[0].splits.length === 0) return message.reply(`no stats associated with \`${fullName.trim()}\` for this argument. Type \`${prefix}help player\` for a list of arguments.`);
			const { splits } = data.stats[0];
			const renameTitle = { careerPlayoffs: 'Career Playoffs', careerRegularSeason: 'Career Regular Season', statsSingleSeasonPlayoffs: 'Playoffs', statsSingleSeason: 'Reg. Season', gameLog: 'Reg. Season - Last 5', playoffGameLog: 'Playoffs - Last 7' };
			const singleSeason = renameTitle[parameters.stats];
			const seasonOrPlayoffs = splits[0].season ? `${humanSeason} (${singleSeason})` : `(${singleSeason})`;
			parameters.player.push(fullName, sweater, seasonOrPlayoffs);
			const embed = new RichEmbed();
			embed.setThumbnail(`${thumbnail}${playerId}.jpg`);
			embed.setColor(0x59acef);
			embed.setDescription(`${parameters.bio.join(' | ')}\n${parameters.birthday.join(', ')}`);
			embed.setAuthor(parameters.player.join(' '), teamLogo);

			if (splits.length > 0) {
				Object.keys(splits).slice(0, last).forEach(s=>{

					if (!gameLogFlag) {
						const g = {
							Forward: {
								Games: splits[s].stat.games,
								'Scoring': `${splits[s].stat.goals}G-${splits[s].stat.assists}A-${splits[s].stat.points}P`,
								'+/-': (splits[s].stat.plusMinus > 0) ? `+${splits[s].stat.plusMinus}` : splits[s].stat.plusMinus,
								PPG: splits[s].stat.powerPlayGoals,
								PPP: splits[s].stat.powerPlayPoints,
								GWG: splits[s].stat.gameWinningGoals,
								OTG: splits[s].stat.overTimeGoals,
								SHG: splits[s].stat.shortHandedGoals,
								SHP: splits[s].stat.shortHandedPoints,
								'Faceoff %': splits[s].stat.faceOffPct,
								Shots: splits[s].stat.shots,
								'Shot %': splits[s].stat.shotPct,
								PIM: splits[s].stat.pim,
								Hits: splits[s].stat.hits,
								Blocked: splits[s].stat.blocked,
								Shifts: splits[s].stat.shifts,
								TOI: splits[s].stat.timeOnIce,
								'PP TOI': splits[s].stat.powerPlayTimeOnIce,
								'SH TOI': splits[s].stat.shortHandedTimeOnIce,
								'Ev TOI': splits[s].stat.evenTimeOnIce,
								'TOI/G': splits[s].stat.timeOnIcePerGame,
								'Ev TOI/G': splits[s].stat.evenTimeOnIcePerGame,
								'SH TOI/G': splits[s].stat.shortHandedTimeOnIcePerGame,
								'PP TOI/G': splits[s].stat.powerPlayTimeOnIcePerGame,
								'Scoring Pace (82 Games)': onPace ? `${Math.floor((splits[s].stat.goals / splits[s].stat.games) * onPace)}G-${Math.floor((splits[s].stat.assists / splits[s].stat.games) * onPace)}A-${Math.floor((splits[s].stat.points / splits[s].stat.games) * onPace)}P` : null,
							},
							Defenseman: {
								Games: splits[s].stat.games,
								'Scoring': `${splits[s].stat.goals}G-${splits[s].stat.assists}A-${splits[s].stat.points}P`,
								'+/-': (splits[s].stat.plusMinus > 0) ? `+${splits[s].stat.plusMinus}` : splits[s].stat.plusMinus,
								PPG: splits[s].stat.powerPlayGoals,
								PPP: splits[s].stat.powerPlayPoints,
								GWG: splits[s].stat.gameWinningGoals,
								OTG: splits[s].stat.overTimeGoals,
								SHG: splits[s].stat.shortHandedGoals,
								SHP: splits[s].stat.shortHandedPoints,
								'Faceoff %': splits[s].stat.faceOffPct,
								Shots: splits[s].stat.shots,
								'Shot %': splits[s].stat.shotPct,
								PIM: splits[s].stat.pim,
								Hits: splits[s].stat.hits,
								Blocked: splits[s].stat.blocked,
								Shifts: splits[s].stat.shifts,
								TOI: splits[s].stat.timeOnIce,
								'PP TOI': splits[s].stat.powerPlayTimeOnIce,
								'SH TOI': splits[s].stat.shortHandedTimeOnIce,
								'Ev TOI': splits[s].stat.evenTimeOnIce,
								'TOI/G': splits[s].stat.timeOnIcePerGame,
								'Ev TOI/G': splits[s].stat.evenTimeOnIcePerGame,
								'SH TOI/G': splits[s].stat.shortHandedTimeOnIcePerGame,
								'PP TOI/G': splits[s].stat.powerPlayTimeOnIcePerGame,
								'Scoring Pace (82 Games)': onPace ? `${Math.floor((splits[s].stat.goals / splits[s].stat.games) * onPace)}G-${Math.floor((splits[s].stat.assists / splits[s].stat.games) * onPace)}A-${Math.floor((splits[s].stat.points / splits[s].stat.games) * onPace)}P` : null,
							},
							Goalie: {
								Games: splits[s].stat.games,
								Starts: splits[s].stat.gamesStarted,
								Record: `${splits[s].stat.wins}W-${splits[s].stat.losses}L-${splits[s].stat.ties ? splits[s].stat.ties : 0}T-${splits[s].stat.ot ? splits[s].stat.ot : 0}OT`,
								SA: splits[s].stat.shotsAgainst,
								GA: splits[s].stat.goalsAgainst,
								GAA: splits[s].stat.goalAgainstAverage ? splits[s].stat.goalAgainstAverage.toFixed(2) : null,
								'Sv%': splits[s].stat.savePercentage ? splits[s].stat.savePercentage.toFixed(3).substring(1) : null,
								Shutouts: splits[s].stat.shutouts,
								TOI: splits[s].stat.timeOnIce,
								'PP Sv': splits[s].stat.powerPlaySaves,
								'SH Sv': splits[s].stat.shortHandedSaves,
								'Ev Sv': splits[s].stat.evenSaves,
								SHS: splits[s].stat.shortHandedShots,
								'Ev S': splits[s].stat.evenShots,
								PPS: splits[s].stat.powerPlayShots,
								SHG: splits[s].stat.shortHandedGoals,
								SHP: splits[s].stat.shortHandedPoints,
								Saves: splits[s].stat.saves,
								'PP Sv%': splits[s].stat.powerPlaySavePercentage ? (splits[s].stat.powerPlaySavePercentage / 100).toFixed(3).substring(1) : null,
								'SH Sv%': splits[s].stat.shortHandedSavePercentage ? (splits[s].stat.shortHandedSavePercentage / 100).toFixed(3).substring(1) : null,
								'Ev Sv%': splits[s].stat.evenStrengthSavePercentage ? (splits[s].stat.evenStrengthSavePercentage / 100).toFixed(3).substring(1) : null,
								'TOI/G': splits[s].stat.timeOnIcePerGame,
								'Record Pace (82 Games)': onPace ? `${Math.floor((splits[s].stat.wins / splits[s].stat.games) * onPace)}W-${Math.floor((splits[s].stat.losses / splits[s].stat.games) * onPace)}L-${splits[s].stat.ties ? Math.floor((splits[s].stat.ties / splits[s].stat.games) * onPace) : 0}T-${splits[s].stat.ot ? Math.floor((splits[s].stat.ot / splits[s].stat.games) * onPace) : 0}OT` : null,
							},
						};

						Object.entries(g[p.primaryPosition.type]).slice(0, limit).filter(([title, number]) => title.toLowerCase().startsWith(keyword.toLowerCase()) && number !== null).forEach(([ key, value ]) => embed.addField(key, value, true));
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
							plusMinus: (splits[s].stat.plusMinus > 0) ? `+${splits[s].stat.plusMinus}` : splits[s].stat.plusMinus,
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
							statLine = `${g.goals}G-${g.assists}A-${g.points}P (${g.plusMinus}) Shots ${g.shots} PIM ${g.pim} Hits ${g.hits} TOI ${g.TOI}`;
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
			const missing = (terms.length > 0) ? `\`${terms}\`ed 0 results.` : `no name provided. Type \`${prefix}help player\` for command format.`;
			message.reply(missing);
		}

	},
};