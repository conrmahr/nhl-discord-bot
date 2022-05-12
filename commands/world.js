const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const cheerio = require('cheerio');
const { BitlyClient } = require('bitly');
const { bitlyAccess } = require('../config.json');
const bitly = new BitlyClient(bitlyAccess.token, {});

module.exports = {
	name: 'world',
	usage: '[<date>] [-<flag>]',
	description: 'Get IIHF tournament games for `today`, `tomorrow`, or a given date `YYYY-MM-DD`. If nothing is specified, games scheduled for today will return. Add flags `-venue` or `-hide` for more options.',
	category: 'scores',
	aliases: ['world', 'w'],
	examples: ['', 'tomorrow', '-hide', '-venue', '-zone=europe/paris'],
	async execute(message, args, prefix, flags, timezone) {

		const tourney = { tourneyURLBase: 'https://www.iihf.com/en' };
		let flagVenue = false;
		let flagHide = false;

		for (const flag of flags) {
			if (['venue', 'v'].includes(flag)) {
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
				return message.reply(`\`-${flag}\` is not a valid flag. Type \`${prefix}help world\` for list of flags.`);
			}
		}

		const bitlyObj = await bitly.shorten(tourney.tourneyURLBase);
		const link = bitlyObj.link;
		const html = await fetch(link).then(response => response.text());
		const $ = cheerio.load(html);
		const liveBlock = $('#live-championship-container > div.s-filter > div.b-tabs > div > a > span.is-show').first();
		tourney.tourneyTitleCode = liveBlock.text();
		tourney.tourneyId = liveBlock.attr('data-tournament-id');
		const getLatestScoresState = 'https://realtime.iihf.com/gamestate/GetLatestScoresState/';
		const fullSchedule = await fetch(`${getLatestScoresState}${tourney.tourneyId}`).then(response => response.json());

		if (!Array.isArray(fullSchedule) || !fullSchedule.length) return message.reply({ content: 'No tournament found.', allowedMentions: { repliedUser: true } });

		const firstGameObj = fullSchedule.find(g => g.TimeOffset);
		const gameDateTimeIIHF = moment().utcOffset(firstGameObj.TimeOffset);
		const currentDateTimeStartLocal = gameDateTimeIIHF.clone().startOf('date');
		const currentDateTimeEndLocal = gameDateTimeIIHF.clone().endOf('date');

		if (moment(args[0], 'YYYY-MM-DD', true).isValid()) {
			tourney.currentDateTimeStartLocal = moment(args[0]).utcOffset(firstGameObj.TimeOffset).startOf('date');
			tourney.currentDateTimeEndLocal = moment(args[0]).utcOffset(firstGameObj.TimeOffset).endOf('date');
		}
		else if (args[0] === 'today') {
			tourney.currentDateTimeStartLocal = currentDateTimeStartLocal;
			tourney.currentDateTimeEndLocal = currentDateTimeEndLocal;
		}
		else if (args[0] === 'tomorrow') {
			tourney.currentDateTimeStartLocal = currentDateTimeStartLocal.add(1, 'day');
			tourney.currentDateTimeEndLocal = currentDateTimeEndLocal.add(1, 'day');
		}
		else if (!args[0]) {
			tourney.currentDateTimeStartLocal = currentDateTimeStartLocal;
			tourney.currentDateTimeEndLocal = currentDateTimeEndLocal;
			args.push(args[0]);
		}
		else {
			return message.reply({ content: `\`${args[0]}\` is not a valid argument. Type \`${prefix}help world\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
		}

		let schedule = fullSchedule.filter(o => {
			return moment.utc(o.GameDateTime).isBetween(tourney.currentDateTimeStartLocal, tourney.currentDateTimeEndLocal);
		});

		if (!Array.isArray(schedule) || !schedule.length) {
			schedule = [{ no: 'games' }];
		}

		const tourneyNameObj = {
			WM: 'World Championship',
			WMIA: 'World Championship Div. I, Group A',
			WMIB: 'World Championship Div. I, Group B',
			WMIIA: 'World Championship Div. II, Group A',
			WMIIB: 'World Championship Div. II, Group B',
			WMIIIA: 'World Championship Div. III, Group A',
			WMIIIB: 'World Championship Div. III, Group B',
			WMIV: 'World Championship Div. IV',
			WM20: 'World Junior Championship',
			WM20IA: 'U20 World Championship Div. I, Group A',
			WM20IB: 'U20 World Championship Div. I, Group B',
			WM20IIA: 'U20 World Championship Div. II, Group A',
			WM20IIB: 'U20 World Championship Div. II, Group B',
			WM20III: 'U20 World Championship Div. III',
			WM18: 'U18 World Championship',
			WM18IA: 'U18 World Championship Div. I, Group A',
			WM18IB: 'U18 World Championship Div. I, Group B',
			WM18IIA: 'U18 World Championship Div. II, Group A',
			WM18IIB: 'U18 World Championship Div. II, Group B',
			WM18IIIA: 'U18 World Championship Div. III, Group A',
			WM18IIIB: 'U18 World Championship Div. III, Group B',
			WW: 'Women\'s World Championship',
			WWIA: 'Women\'s World Championship Div. I, Group A',
			WWIB: 'Women\'s World Championship Div. I, Group B',
			WWIIA: 'Women\'s World Championship Div. II, Group A',
			WWIIB: 'Women\'s World Championship Div. II, Group B',
			WWIII: 'Women\'s World Championship Div. III',
			WW18: 'U18 Women\'s World Championship',
			WW18IA: 'U18 Women\'s World Championship Div. I, Group A',
			WW18IB: 'U18 Women\'s World Championship Div. I, Group B',
			WW18IIA: 'U18 Women\'s World Championship Div. II, Group A',
			WW18IIB: 'U18 Women\'s World Championship Div. II, Group B',
		};

		const tourneyYear = gameDateTimeIIHF.year();
		tourney.tourneyTitle = tourneyNameObj[tourney.tourneyTitleCode] ? `${tourneyYear} ${tourneyNameObj[tourney.tourneyTitleCode]}` : 'TBD';

		function getScores(games) {
			return Promise.all(games.map(async (game) => {
				if (!game.HomeTeam) return 'No games scheduled or is past this date.';
				function isBold(w, l) {
					const b = (w > l) ? '**' : '';
					return b;
				}

				function formatPeriod(t, p, f) {
					let remain = `${t}:00`;
					let spacer = '/';
					let ordinal = p;
					if (f) {
						remain = 'F';
						spacer = '';
						ordinal = '';
					}
					else if (remain === '0:00') {
						remain = '';
						spacer = '';
					}

					return `(${remain}${spacer}${ordinal})`;
				}

				function formatFlag(f) {
					const flagsObj = {
						AUT: ':flag_at:',
						BLR: ':flag_by:',
						DEN: ':flag_dk:',
						EST: ':flag_ee:',
						GER: ':flag_de:',
						IRL: ':flag_ie:',
						JAM: ':flag_jm:',
						JPN: ':flag_jp:',
						KAZ: ':flag_kz:',
						KOR: ':flag_kr:',
						LAT: ':flag_lv:',
						POL: ':flag_pl:',
						SUI: ':flag_ch:',
						SVK: ':flag_sk:',
						SVN: ':flag_si:',
						SWE: ':flag_se:',
						UKR: ':flag_ua:',
					};

					const flag = flagsObj[f] ? flagsObj[f] : f.length === 3 ? `:flag_${f.toLowerCase().substring(0, 2)}:` : f;

					return flag;
				}

				const { HomeTeam, GuestTeam, GameDateTime, GameDateTimeUTC, EventStatus, Venue, PhaseId, Group, Status, GameId } = game;
				const phaseObj = {
					RoundRobin: 'Round Robin',
					PreliminaryRound: 'Prelims',
					BronzeMedalGame: ':third_place: Medal Game',
					GoldMedalGame: ':first_place: Medal Game',
				};
				const formatRound = phaseObj[PhaseId] || PhaseId;
				const formatGroup = Group ? ` ${Group}` : '';
				const gameObj = {
					awayTeam: formatFlag(GuestTeam.TeamCode),
					homeTeam: formatFlag(HomeTeam.TeamCode),
					awayScore: '',
					homeScore: '',
					gameLocal: GameDateTime,
					gameUTC: GameDateTimeUTC,
					gameTime: 'TBD',
					period: '',
					clock: '',
					isFinished: false,
					eventStatus: EventStatus,
					arena: '',
					round: formatRound,
					groupId: formatGroup,
					gameId: GameId,

				};

				if (['FINAL', 'LIVE', 'F(OT)', 'F(SO)'].includes(Status)) {
					const GetLatestStateObj = await fetch(`https://realtime.iihf.com/gamestate/GetLatestState/${GameId}`).then(response => response.json());
					const possiblePeriod = {
						'Period 1': '1st',
						'Period 1 Ended': '1st Int',
						'Period 2': '2nd',
						'Period 2 Ended': '2nd Int',
						'Period 3': '3rd',
						'Overtime': 'OT',
						'Shootout': 'SO',
						'Final': 'F',
						'Game Completed': 'F',
					};

					gameObj.eventStatus = Status === 'LIVE' ? 3 : GetLatestStateObj.IsGameCompleted ? 7 : Status;
					gameObj.awayScore = GetLatestStateObj.CurrentScore.Away;
					gameObj.homeScore = GetLatestStateObj.CurrentScore.Home;
					gameObj.isFinished = GetLatestStateObj.IsGameCompleted;
					gameObj.period = possiblePeriod[GetLatestStateObj.Status];
					gameObj.clock = GetLatestStateObj.GameTime.Time - GetLatestStateObj.GameTime.PlayTime;

				}

				if (Venue && flagVenue) {
					gameObj.arena = `:stadium: [${Venue}] `;
				}

				if (gameObj.eventStatus < 3 || flagHide) {
					const gameTimeTZ = moment.utc(gameObj.gameUTC).tz(timezone);
					const dayDiff = moment(gameTimeTZ.format('YYYY-MM-DD')).diff(tourney.currentDateTimeStartLocal.format('YYYY-MM-DD'), 'days');
					const plusMinusDay = (dayDiff > 0) ? ' (+1 day)' : (dayDiff < 0) ? ' (-1 day)' : '';
					const gameTime = `${moment(gameObj.gameUTC).tz(timezone).format('h:mm A z')}${plusMinusDay}`;
					gameObj.gameTime = gameTime;
					return `[${gameObj.round}${gameObj.groupId}] ${gameObj.awayTeam} @ ${gameObj.homeTeam} ${gameObj.gameTime} ${gameObj.arena}`;
				}
				else if (gameObj.eventStatus > 2 && gameObj.eventStatus < 8) {
					const awayBB = isBold(gameObj.awayScore, gameObj.homeScore);
					const homeBB = isBold(gameObj.homeScore, gameObj.awayScore);
					return `[${gameObj.round}${gameObj.groupId}] ${gameObj.awayTeam} ${awayBB}${gameObj.awayScore}${awayBB} ${gameObj.homeTeam} ${homeBB}${gameObj.homeScore}${homeBB} ${formatPeriod(gameObj.clock, gameObj.period, gameObj.isFinished)} ${gameObj.arena}`;
				}
				else {
					return 'Game status not found.';
				}

			})).then((arrayOfResults) => arrayOfResults.join('\u200B\n'));
		}
		const gamesList = await getScores(schedule);
		const embed = new MessageEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor({ name: tourney.tourneyTitle, iconURL: 'https://i.imgur.com/udUeTlY.png' });
		embed.addField(`:hockey: ${tourney.currentDateTimeStartLocal.format('ddd, MMM DD')}`, gamesList);

		return message.channel.send({ embeds: [embed] });
	},
};