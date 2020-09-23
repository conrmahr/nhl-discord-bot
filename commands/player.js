const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');
const { googleSearch } = require('../config.json');

module.exports = {
	name: 'player',
	usage: '[<year>] <name> [-<flag>]',
	description: 'Get player stats for active and inactive players. Add `YYYY` to specifiy a season. Add flags  `-advanced`, `-playoffs`, `-career`, `-log`, `-onpace`, `-year`, `-month`, `-day`, `-filter=<term>` for more options.',
	category: 'stats',
	aliases: ['player', 'p'],
	examples: ['barzal', 'kucherov -advanced', 'crosby -playoffs', 'gretzky -career', 'mcdavid -log', 'ovechkin -onpace', 'marleau -year', 'wilson -filter=pim'],
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
			const year = ['year', 'y'];
			const month = ['month', 'm'];
			const day = ['day', 'd'];
			const onpace = ['onpace', 'o'];
			const advanced = ['advanced', 'a'];
			const careerFlag = career.some(e => flags.includes(e));
			const playoffsFlag = playoffs.some(e => flags.includes(e));
			const gameLogFlag = gamelog.some(e => flags.includes(e));
			const yearFlag = year.some(e => flags.includes(e));
			const monthFlag = month.some(e => flags.includes(e));
			const dayFlag = day.some(e => flags.includes(e));
			const onPaceFlag = onpace.some(e => flags.includes(e));
			const advancedFlag = advanced.some(e => flags.includes(e));
			const keywordFlag = flags.find(e => e.startsWith('filter=') || e.startsWith('f=')) || '';
			const keyword = (keywordFlag.length > 0) ? keywordFlag.split('=', 2)[1].toLowerCase() : '';
			if (flags.length > 0 && keywordFlag.length === 0 && !careerFlag && !playoffsFlag && !gameLogFlag && !yearFlag && !monthFlag && !dayFlag && !onPaceFlag && !advancedFlag) return message.reply(`\`-${flags.join(' -')}\` is not a valid flag. Type \`${prefix}help player\` for list of flags.`);
			let last = 0;
			let seasonCount = 0;
			let rows = '';
			const limit = (advancedFlag || keywordFlag.length > 0) ? 23 : 3;

			if (careerFlag && playoffsFlag) {
				parameters.stats = 'careerPlayoffs';
			}
			else if (gameLogFlag && playoffsFlag) {
				parameters.stats = 'playoffGameLog';
				last = -7;
			}
			else if (gameLogFlag) {
				parameters.stats = 'gameLog';
				last = -5;
			}
			else if (playoffsFlag && yearFlag) {
				parameters.stats = 'yearByYearPlayoffs';
			}
			else if (yearFlag) {
				parameters.stats = 'yearByYear';
			}
			else if (playoffsFlag && monthFlag) {
				parameters.stats = 'byMonthPlayoffs';
			}
			else if (monthFlag) {
				parameters.stats = 'byMonth';
			}
			else if (playoffsFlag && dayFlag) {
				parameters.stats = 'byDayOfWeekPlayoffs';
			}
			else if (dayFlag) {
				parameters.stats = 'byDayOfWeek';
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
			let seasonLine = '';
			const query = qs.stringify(parameters, { addQueryPrefix: true });
			const thumbnail = 'https://nhl.bamcontent.com/images/headshots/current/168x168/';
			const data = await fetch(`${apiPeople}${playerId}/stats/${query}`).then(response => response.json());
			const renameTitle = {
				careerPlayoffs: 'Career Playoffs',
				careerRegularSeason: 'Career Regular Season',
				statsSingleSeasonPlayoffs: 'Playoffs',
				statsSingleSeason: 'Regular Season',
				gameLog: 'Reg. Season Game Log',
				playoffGameLog: 'Playoffs Game Log',
				yearByYear: 'Regular Season Year by Year',
				yearByYearPlayoffs: 'Playoffs Year by Year',
				byMonth: 'Reg. Season by Month',
				byMonthPlayoffs: 'Playoffs by Month',
				byDayOfWeek: 'Reg. Season by Day',
				byDayOfWeekPlayoffs: 'Playoffs by Day',
				onPaceRegularSeason: 'On Pace',
			};
			const statType = renameTitle[parameters.stats];
			const { splits } = data.stats[0];
			const statTypeArr = statType.split(' ');
			const multiYear = ['Career', 'Year'].some(needle => statTypeArr.includes(needle));
			const seasonOrPlayoffs = multiYear ? `(${statType})` : `(${humanSeason} ${statType})`;
			if (Array.isArray(splits) && splits.length === 0) return message.reply(`no stats found for ${fullName.trim()} ${seasonOrPlayoffs}. Type \`${prefix}help player\` for a list of arguments.`);
			parameters.player.push(fullName, sweater, seasonOrPlayoffs);
			const embed = new MessageEmbed();
			embed.setThumbnail(`${thumbnail}${playerId}.jpg`);
			embed.setColor(0x59acef);
			embed.setAuthor(parameters.player.join(' '), teamLogo);

			if (splits.length > 0) {
				Object.keys(splits).slice(last).forEach(s=>{
					const k = splits[s];
					if (!gameLogFlag) {
						const skip = (x) => yearFlag ? x : null;
						const scoring = (x) => yearFlag ? x : `${k.stat.goals}G-${k.stat.assists}A-${k.stat.points}P`;
						const record = (x) => yearFlag ? x : typeof k.stat.ot === 'undefined' ? `${k.stat.wins}W-${k.stat.losses}L-${k.stat.ties}T` : `${k.stat.wins}W-${k.stat.losses}L-${k.stat.ot}OT`;
						const fixed1 = (x) => x === 1 ? x.toFixed(3) : x > 0 ? x.toFixed(3).substring(1) : null;
						const fixed2 = (x) => x === 0 ? null : x.toFixed(2);
						const fixed3 = (x) => x === 0 ? null : x === 100 ? (x / 100).toFixed(3) : (x / 100).toFixed(3).substring(1);

						const map = {
							games: { name: 'GP', order: 1 },
							wins: { name: 'Record', order: 2, f: record },
							gamesStarted: { name: 'Starts', order: 3 },
							losses: { name: 'Losses', order: 4, f: skip },
							ties: { name: 'Ties', order: 5, f: skip },
							ot: { name: 'OT', order: 6, f: skip },
							goals: { name: 'Scoring', order: 7, f: scoring },
							plusMinus: { name: '+/-', order: 8 },
							assists: { name: 'Assists', order: 9, f: skip },
							points: { name: 'Points', order: 10, f: skip },
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
							timeOnIcePerGame: { name: 'TOI/GP', order: 41 },
							evenTimeOnIcePerGame: { name: 'Ev TOI/GP', order: 42 },
							powerPlayTimeOnIcePerGame: { name: 'PP TOI/GP', order: 43 },
							shortHandedTimeOnIcePerGame: { name: 'SH TOI/GP', order: 44 },
							powerPlayTimeOnIce: { name: 'PP TOI', order: 45 },
							evenTimeOnIce: { name: 'Ev TOI', order: 46 },
							shortHandedTimeOnIce: { name: 'SH TOI', order: 47 },
							penaltyMinutes: { name: 'PM', order: 47, f: skip },

						};

						const n = Object.keys(k.stat).reduce((a, b) => {
							return (!map[b].f)
								? { ...a, [map[b].name]: { stat: k.stat[b], order: map[b].order } }
								: { ...a, [map[b].name]: { stat: map[b].f(k.stat[b]), order: map[b].order } };
						}, {});

						const o = Object.entries(n).map(([key, value]) => Object.assign({}, { key }, value)).sort((a, b) => a.order - b.order);

						if (!(yearFlag || monthFlag || dayFlag)) {
							Object.entries(o).slice(0, limit).filter(([, element]) => element.key.toLowerCase().startsWith(keyword) && element.stat !== null).forEach(([, values ]) => embed.addField(values.key, values.stat, true));
						}
						else {
							let season = '';
							let padTeam = '';

							if (yearFlag) {
								if (k.league.id !== 133) return;
								seasonCount++;
								season = `${k.season.substring(0, 4)}-${k.season.substring(6)}`;
								padTeam = `<${k.team.name.split(' ').pop()}>`;
								rows += `\n${season} ${padTeam.padEnd(12, ' ')}`;
							}
							else if (monthFlag) {
								seasonCount++;
								season = moment().month(k.month - 1).format('MMM');
								rows += `\n${season.padEnd(7, ' ')}`;
							}
							else {
								seasonCount++;
								season = moment().day(k.dayOfWeek).format('ddd');
								rows += `\n${season.padEnd(7, ' ')}`;
							}

							if (p.primaryPosition.abbreviation === 'G') {
								rows += k.stat.games.toString().padStart(3, ' ');
								rows += (k.stat.gamesStarted >= 0) ? k.stat.gamesStarted.toString().padStart(3, ' ') : '  0';
								rows += (k.stat.wins >= 0) ? k.stat.wins.toString().padStart(3, ' ') : '  0';
								rows += (k.stat.losses >= 0) ? k.stat.losses.toString().padStart(3, ' ') : '  0';
								rows += (k.stat.ties >= 0) ? k.stat.ties.toString().padStart(3, ' ') : '  -';
								rows += (k.stat.ot >= 0) ? k.stat.ot.toString().padStart(3, ' ') : ' --';
								rows += k.stat.goalAgainstAverage.toFixed(2).padStart(5, ' ');
							}
							else {
								rows += k.stat.games.toString().padStart(3, ' ');
								rows += k.stat.goals.toString().padStart(4, ' ');
								rows += k.stat.assists.toString().padStart(4, ' ');
								rows += k.stat.points.toString().padStart(4, ' ');
								rows += (k.stat.plusMinus || k.stat.plusMinus === 0) ? k.stat.plusMinus.toString().padStart(5, ' ') : '  --';
								rows += (k.stat.pim || k.stat.pim === 0) ? k.stat.pim.toString().padStart(4, ' ') : '   0';
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
							statLine = `${g.goals}G-${g.assists}A-${g.points}P (${g.plusMinus}) PIM ${g.pim} Shots ${g.shots} Hits ${g.hits} TOI ${g.TOI}`;
						}

						embed.addField(`:hockey: ${g.date} ${g.isHome} ${g.opponent} (${g.isWin}${g.isOT})`, statLine);
					}
				});

			}
			else {
				embed.addField(renameTitle[parameters.stats], (fullSeason.length > 0) ? humanSeason : '--', true);
				embed.addField('Games', 0, true);
			}

			if (yearFlag || monthFlag || dayFlag) {
				const columns = yearFlag ? `${'Season'.padEnd(7, ' ')} ${'Team'.padEnd(12, ' ')}` : monthFlag ? `${'Month'.padEnd(7, ' ')}` : `${'Day'.padEnd(7, ' ')}`;

				if (p.primaryPosition.code === 'G' && seasonCount > 0) {
					seasonLine = `\`\`\`md\n#${columns}GP GS  W  L  T OT  GA${rows}\n\`\`\``;
				}
				else if (['L', 'C', 'R', 'D'].includes(p.primaryPosition.code) && seasonCount > 0) {
					seasonLine = `\`\`\`md\n#${columns}GP   G   A   P  +/- PIM${rows}\n\`\`\``;
				}
				else {
					return message.reply(`no stats found for ${fullName.trim()} ${seasonOrPlayoffs}. Type \`${prefix}help player\` for a list of arguments.`);
				}
			}
			embed.setDescription(`${parameters.bio.join(' | ')}\n${parameters.birthday.join(', ')}${seasonLine}`);
			message.channel.send(embed);
		}
		else {
			const missing = (terms.length > 0) ? `\`${terms}\` matched 0 players. Type \`${prefix}team <team> -roster\` for a list of player names.` : `no name provided. Type \`${prefix}help player\` for a list of arguments.`;
			message.reply(missing);
		}

	},
};