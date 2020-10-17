const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');

module.exports = {
	name: 'draft',
	usage: '[<year>] [<round>|<team>]',
	description: 'Get draft picks by round or team. Add `YYYY` to specify a draft year.',
	category: 'draft',
	aliases: ['draft', 'd'],
	examples: ['1993', '2004 8', '1979 edm'],
	async execute(message, args, flags, prefix) {

		const endpoint = 'https://statsapi.web.nhl.com/api/v1/draft/';
		const parameters = {};
		const current = 'current';
		const draftTitle = 'NHL Draft';
		let draftYear = moment().format('YYYY');
		let draftRound = '1';
		let draftObj = '';
		let draftLogo = 'https://i.imgur.com/zl8JzZc.png';
		let draftTeam = '';
		let teamObj = '';

		const { seasons } = await fetch(`https://statsapi.web.nhl.com/api/v1/seasons/${current}`).then(response => response.json());
		let seasonCode = seasons[0].seasonId;

		if (moment(args[0], 'YYYY', true).isValid()) {
			const seasonEnd = moment(seasons[0].seasonEndDate);
			const seasonX = moment(args[0]);

			if (seasonX.isBefore(seasonEnd, 'year')) {
				seasonCode = `${moment(seasonX).format('YYYY')}${moment(seasonX).add(1, 'y').format('YYYY')}`;
			}

			draftYear = args[0];
			args.push('0');
			parameters.season = seasonCode;
		}
		else {
			args.push(args[0]);
		}

		const query = qs.stringify(parameters, { addQueryPrefix: true });
		const { teams } = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${query}`).then(response => response.json());

		if (args[1]) {

			if (args[1].length === 3) {
				teamObj = teams.find(o => o.abbreviation === args[1].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase()) || '';

				if (!teamObj) return message.reply(`\`${args[1]}\` is not a team for the ${draftYear} Draft. Type \`${prefix}help draft\` for a list of arguments.`);

				if (teamObj.active) {
					const html = await fetch(teamObj.officialSiteUrl).then(response => response.text());
					const $ = cheerio.load(html);
					draftLogo = $('[rel="shortcut icon"]').attr('href');
				}

				draftTeam = ` (${teamObj.name})`;
			}
			else if (parseInt(args[1], 10) > 0) {
				draftTeam = ` (Round ${args[1]})`;
				draftRound = args[1];
			}
			else {
				draftTeam = ` (Round ${draftRound})`;
			}
		}

		const data = await fetch(`${endpoint}${draftYear}`).then(response => response.json());

		if (!data.drafts[0].rounds) return message.reply(`no draft picks found for the ${draftYear} Draft. Type \`${prefix}help draft\` for a list of arguments.`);

		const flatFilterPicks = (draft, pred) => draft.drafts.flatMap(({ rounds }) => {
			return rounds.flatMap(({ picks }) => picks.filter(pred));
		});

		const draftTeamArr = draftTeam.split(' ');
		const checkRound = ['(Round'].some(needle => draftTeamArr.includes(needle));

		if (checkRound) {
			draftObj = flatFilterPicks(data, pick => pick.round === draftRound);

			if (!draftObj.length > 0) return message.reply(`\`${args[1]}\` is not a valid round for the ${draftYear} Draft. Type \`${prefix}help draft\` for a list of arguments.`);
		}
		else if (teamObj) {
			draftObj = flatFilterPicks(data, pick => pick.team.id === teamObj.id);

			if (!draftObj) return message.reply(`no draft picks found for the ${draftYear} Draft. Type \`${prefix}help draft\` for a list of arguments.`);
		}
		else {
			draftObj = flatFilterPicks(data, pick => pick.round === '1');
		}

		draftObj.sort(function(a, b) {
			return a['pickOverall'] - b['pickOverall'];
		});

		function getPicks(rounds) {
			let r = 0;
			return rounds.map(pick => {
				r++;
				const { round, pickOverall, team, prospect } = pick;
				const name = prospect.fullName ? prospect.fullName : '-';
				const teamAbbreviation = teams.find(o => o.id === team.id).abbreviation;

				function getHeader() {
					if (r === 1) return '#Rd Pick Team Player\n';
					return '';
				}
				function pad(stat, column) {
					if (stat === '') return '';
					return stat.toString().padEnd(column, ' ');
				}
				return `${getHeader()}${pad(round, 4)}${pad(pickOverall, 5)}${pad(teamAbbreviation, 5)}${name}`;

			}).join('\u200B\n');
		}

		const block = `\`\`\`md\n${getPicks(draftObj)}\n\`\`\``;
		const authorArr = [draftYear, draftTitle, draftTeam];
		const embed = new MessageEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor(authorArr.join(' '), 'https://i.imgur.com/zl8JzZc.png');
		embed.setThumbnail(draftLogo);
		embed.setDescription(block);

		message.channel.send(embed);
	},
};