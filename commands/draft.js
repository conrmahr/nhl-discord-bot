const { RichEmbed } = require('discord.js');
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
		const draftTitle = 'NHL Draft';
		let draftYear = moment().format('YYYY');
		let current = '';
		let draftRound = '1';
		let draftObj = '';
		let draftLogo = 'https://i.imgur.com/zl8JzZc.png';
		let draftTeam = '';
		let teamObj = '';

		if (moment(args[0], 'YYYY', true).isValid()) {
			const nextSeason = parseInt(args[0], 10) + 1;
			current = `${args[0]}${nextSeason}`;
			draftYear = args[0];
			args.push('0');
			parameters.season = current;
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
		else {
			draftObj = flatFilterPicks(data, pick => pick.team.id === teamObj.id);

			if (!draftObj) return message.reply(`no draft picks found for the ${draftYear} Draft. Type \`${prefix}help draft\` for a list of arguments.`);
		}

		draftObj.sort(function(a, b) {
			return a['pickOverall'] - b['pickOverall'];
		});

		function getPicks(rounds) {
			let r = 0;
			return rounds.map(pick => {
				r++;
				const { round, pickOverall, team, prospect } = pick;
				const teamAbbreviation = teams.find(o => o.id === team.id).abbreviation;
				function getHeader() {
					if (r === 1) return '#Rd Pick Team Player\n';
					return '';
				}
				function pad(stat, column) {
					if (stat === '') return '';
					return stat.toString().padEnd(column, ' ');
				}
				return `${getHeader()}${pad(round, 4)}${pad(pickOverall, 5)}${pad(teamAbbreviation, 5)}${prospect.fullName}`;

			}).join('\u200B\n');
		}

		const block = '```md\n' + getPicks(draftObj) + '```';
		const authorArr = [draftYear, draftTitle, draftTeam];
		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor(authorArr.join(' '), 'https://i.imgur.com/zl8JzZc.png');
		embed.setThumbnail(draftLogo);
		embed.setDescription(block);

		message.channel.send(embed);
	},
};