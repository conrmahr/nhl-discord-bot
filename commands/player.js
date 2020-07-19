const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');
const { googleSearch } = require('../config.json');

module.exports = {
	name: 'player',
	usage: '<year> <name> -<flag>',
	description: 'Get player stats for active and inactive players. Add `YYYY` to specifiy a season. Add flags `-career`, `-playoffs`, `-log`, `-byyear`, -onpace`, `-advanced`, `-filter=<term>` for more options.',
	category: 'stats',
	aliases: ['player', 'p'],
	examples: ['barzal', '1993 selanne', 'gretzky -career', 'mcdavid -log', 'howe -byyear', 'ovechkin -onpace'],
	async execute(message, args, flags, prefix) {

		let current = 'current';

		if (moment(args[0], 'YYYY', true).isValid()) {
			const prevSeason = args[0] - 1;
			current = `${prevSeason}${args[0]}`;
			args.shift();
		}

		const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());
		const fullSeason = seasons[0].seasonId;
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

		const apiGoogleCustomSearch = 'https://www.googleapis.com/customsearch/v1';
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
			const byyear = ['byyear', 'b'];
			const onpace = ['onpace', 'o'];
			const advanced = ['advanced', 'a'];
			const careerFlag = career.some(e => flags.includes(e));
			const playoffsFlag = playoffs.some(e => flags.includes(e));
			const gameLogFlag = gamelog.some(e => flags.includes(e));
			const byYearFlag = byyear.some(e => flags.includes(e));
			const onPaceFlag = onpace.some(e => flags.includes(e));
			const advancedFlag = advanced.some(e => flags.includes(e));
			const keywordFlag = flags.find(e => e.startsWith('filter=') || e.startsWith('f=')) || '';
			const keyword = (keywordFlag.length > 0) ? keywordFlag.split('=', 2)[1].toLowerCase() : '';
			if (flags.length > 0 && keywordFlag.length === 0 && !careerFlag && !playoffsFlag && !gameLogFlag && !byYearFlag && !onPaceFlag && !advancedFlag) return message.reply(`\`-${flags.join(' -')}\` is not a valid flag. Type \`${prefix}help player\` for list of flags.`);
			let last = 1;
			let rows = '';
			const limit = (advancedFlag || keywordFlag.length > 0) ? 25 : 3;

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
			else if (playoffsFlag && byYearFlag) {
				parameters.stats = 'yearByYearPlayoffs';
				last = -1;
			}
			else if (byYearFlag) {
				parameters.stats = 'yearByYear';
				last = -1;
			}
			else if (playoffsFlag) {
				parameters.stats = 'statsSingleSeasonPlayoffs';
			}
			else if (careerFlag) {
				parameters.stats = 'careerRegularSeason';
			}
			else if (onPaceFlag) {
				parameters.stats = 'onPaceRegularSeason';
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
			const renameTitle = {
				careerPlayoffs: 'Career Playoffs',
				careerRegularSeason: 'Career Regular Season',
				statsSingleSeasonPlayoffs: 'Playoffs',
				statsSingleSeason: 'Reg. Season',
				gameLog: 'Reg. Season - Last 5',
				playoffGameLog: 'Playoffs - Last 7',
				yearByYear: 'Career Regular Season',
				yearByYearPlayoffs: 'Career Playoffs',
				onPaceRegularSeason: 'Reg. Season On Pace',
			};
			const singleSeason = renameTitle[parameters.stats];
			const { splits } = data.stats[0];
			const seasonOrPlayoffs = (singleSeason.split(' ').includes('Career')) ? `(${singleSeason})` : `(${humanSeason} ${singleSeason})`;
			if (Array.isArray(splits) && splits.length === 0) return message.reply(`no stats found for ${fullName.trim()} ${seasonOrPlayoffs}. Type \`${prefix}help player\` for a list of arguments.`);
			parameters.player.push(fullName, sweater, seasonOrPlayoffs);
			const embed = new RichEmbed();
			embed.setThumbnail(`${thumbnail}${playerId}.jpg`);
			embed.setColor(0x59acef);
			embed.setAuthor(parameters.player.join(' '), teamLogo);

			if (splits.length > 0) {
				Object.keys(splits).slice(0, last).forEach(s=>{
					const k = splits[s];
					if (!gameLogFlag) {
						const skip = (x) => byYearFlag ? x : null;
						const scoring = (x) => byYearFlag ? x : `${k.stat.goals}G-${k.stat.assists}A-${k.stat.points}P`;
						const record = () => k.stat.ties ? `${k.stat.wins}W-${k.stat.losses}L-${k.stat.ties}T` : `${k.stat.wins}W-${k.stat.losses}L-${k.stat.ot}OT`;
						const fixed1 = (x) => x === 0 ? null : x.toString().substring(1);
						const fixed2 = (x) => x === 0 ? null : x.toFixed(2);
						const fixed3 = (x) => x === 0 ? null : (x / 100).toFixed(3).substring(1);

						const map = {
							games: { name: 'Games', order: 1 },
							gamesStarted: { name: 'GS', order: 2 },
							wins: { name: 'Record', order: 3, f: record },
							losses: { name: 'Losses', order: 4, f: skip },
							ties: { name: 'Ties', order: 5, f: skip },
							ot: { name: 'OT', order: 6, f: skip },
							goals: { name: 'Goals', order: 7, f: skip },
							assists: { name: 'Assists', order: 8, f: skip },
							points: { name: 'Scoring', order: 9, f: scoring },
							plusMinus: { name: '+/-', order: 10 },
							powerPlayGoals: { name: 'PPG', order: 11 },
							powerPlayPoints: { name: 'PPP', order: 12 },
							gameWinningGoals: { name: 'GWG', order: 13 },
							overTimeGoals: { name: 'OTG', order: 14 },
							shortHandedGoals: { name: 'SHG', order: 15 },
							shortHandedPoints: { name: 'SHP', order: 16 },
							faceOffPct: { name: 'Faceoff%', order: 17 },
							shots: { name: 'Shots', order: 18 },
							shotPct: { name: 'Shot%', order: 19 },
							pim: { name: 'PIM', order: 20 },
							penaltyMinutes: { name: 'PM', order: 21 },
							hits: { name: 'Hits', order: 22 },
							blocked: { name: 'Blocked', order: 23 },
							shifts: { name: 'Shifts', order: 24 },
							shotsAgainst: { name: 'SA', order: 25 },
							goalsAgainst: { name: 'GA', order: 26 },
							goalAgainstAverage: { name: 'GAA', order: 27, f: fixed2 },
							savePercentage: { name: 'Save%', order: 28, f: fixed1 },
							shutouts: { name: 'Shutouts', order: 29 },
							powerPlaySaves: { name: 'PP Sv', order: 30 },
							shortHandedSaves: { name: 'SH Sv', order: 31 },
							evenSaves: { name: 'Ev Sv', order: 32 },
							shortHandedShots: { name: 'SHS', order: 33 },
							evenShots: { name: 'Ev Shots', order: 34 },
							powerPlayShots: { name: 'PPS', order: 35 },
							saves: { name: 'Saves', order: 36 },
							powerPlaySavePercentage: { name: 'PP Sv%', order: 37, f: fixed3 },
							shortHandedSavePercentage: { name: 'SH Sv%', order: 38, f: fixed3 },
							evenStrengthSavePercentage: { name: 'Ev Sv%', order: 39, f: fixed3 },
							timeOnIce: { name: 'TOI', order: 40 },
							powerPlayTimeOnIce: { name: 'PP TOI', order: 41 },
							shortHandedTimeOnIce: { name: 'SH TOI', order: 42 },
							evenTimeOnIce: { name: 'Ev TOI', order: 43 },
							timeOnIcePerGame: { name: 'TOI/G', order: 44 },
							powerPlayTimeOnIcePerGame: { name: 'PP TOI/G', order: 45 },
							shortHandedTimeOnIcePerGame: { name: 'SH TOI/G', order: 46 },
							evenTimeOnIcePerGame: { name: 'Ev TOI/G', order: 47 },
						};

						const n = Object.keys(k.stat).reduce((a, b) => {
							return (!map[b].f)
								? { ...a, [map[b].name]: { stat: k.stat[b], order: map[b].order } }
								: { ...a, [map[b].name]: { stat: map[b].f(k.stat[b]), order: map[b].order } };
						}, {});

						const o = Object.entries(n).map(([key, value]) => Object.assign({}, { key }, value)).sort((a, b) => a.order - b.order);
						console.log(o);
						if (!byYearFlag) {
							Object.entries(o).slice(0, limit).filter(([, element]) => element.key.toLowerCase().startsWith(keyword) && element.stat !== null).forEach(([, values ]) => embed.addField(values.key, values.stat, true));
						}
						else {
							let season = `${k.season.substring(0,4)}-${k.season.substring(6)}`;
							if (k.league.id === 133) {
								let padTeam = `<${k.team.name.split(' ').pop()}>`;
								const padStat = (x,w) => x.length ==! w ? x.padEnd(w, ' ') : x;
								rows += `\n${season} ${padTeam.padEnd(12, ' ')}`;
								Object.entries(o).filter(([, element]) => ['Games', 'Goals', 'Assists', 'Points', 'Wins', 'Losses', 'Ties', 'OT', '+/-'].includes(element.key) && element.stat !== null).forEach(([, values ]) => rows += `${values.stat} `.padEnd(4, ' '));
							}
						}
					}
					else {
						const g = {
							date: moment(k.date).format('MMM DD, YYYY'),
							opponent: k.opponent.name,
							isHome: k.isHome ? 'vs' : '@',
							isWin: k.isWin ? 'W' : 'L',
							isOT: k.isOT ? '/OT' : '',
							goals: k.stat.goals,
							assists: k.stat.assists,
							points: k.stat.points,
							plusMinus: (k.stat.plusMinus > 0) ? `+${k.stat.plusMinus}` : k.stat.plusMinus,
							pim: k.stat.pim,
							hits: k.stat.hits,
							shots: k.stat.shots,
							TOI: (k.stat.timeOnIce) ? k.stat.timeOnIce : '--',
							gamesStarted: k.stat.gamesStarted ? '1' : '0',
							decision: (k.stat.decision === 'O') ? 'L/OT' : k.stat.decision ? k.stat.decision : 'ND',
							shotsAgainst: k.stat.shotsAgainst,
							goalsAgainst: k.stat.goalsAgainst,
							savePercentage: k.stat.savePercentage ? k.stat.savePercentage.toFixed(3) : null,
							shutouts: k.stat.shutouts,
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
			
			let block = '';

			if (byYearFlag) {
				if (p.primaryPosition.abbreviation === 'G') {
					block = '```md\n#Season Team        GP  W   L   T/OT' + rows + '```';	
				} else {
					block = '```md\n#Season Team        GP  G   A   P   +/-' + rows + '```';	
				}
			}
			
			embed.setDescription(`${parameters.bio.join(' | ')}\n${parameters.birthday.join(', ')}${block}`);
			message.channel.send(embed);

		}
		else {
			const missing = (terms.length > 0) ? `\`${terms}\` matched 0 players. Type \`${prefix}team <team> -roster\` for a list of player names.` : `no name provided. Type \`${prefix}help player\` for a list of arguments.`;
			message.reply(missing);
		}

	},
};