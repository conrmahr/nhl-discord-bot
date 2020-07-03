const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');
const cheerio = require('cheerio');

module.exports = {
	name: 'draft',
	usage: '<year> <round> <team>',
	description: 'Get draft picks by round or team. Add `YYYY` to specify a draft year.',
	category: 'draft',
	aliases: ['draft', 'd'],
	examples: ['1993', '1979 edm'],
	async execute(message, args, flags, prefix) {

		const endpoint = 'https://statsapi.web.nhl.com/api/v1/draft/';
		const parameters = {};
		let year = moment().format('YYYY');
		let current = moment().format('YYYY');
		let round = '1';
		let draftObj = '';
		let tableObj = '';
		let standingsObj = '';
		let draftLogo = 'https://i.imgur.com/zl8JzZc.png';
		let draftTitle = 'NHL Draft';
		let draftTeam = '';

		if (moment(args[0], 'YYYY', true).isValid()) {
			const nextSeason = parseInt(args[0], 10) + 1;
			current = `${args[0]}${nextSeason}`;
			year = args[0];
			args.push('0');
			if (!args[0]) return message.reply(`${args[0]} is not a valid draft year. Type \`${prefix}help draft\` for a list of arguments.`);
		}
		else {
			args.push(args[0]);
		}
		const data = await fetch(`https://statsapi.web.nhl.com/api/v1/draft/${year}`).then(response => response.json());

		if (!data.drafts[0].rounds) return message.reply(`no draft picks found. Type \`${prefix}help draft\` for a list of arguments.`);
		parameters.season = current;
		let query = qs.stringify(parameters, { addQueryPrefix: true });

		const { teams } = await fetch(`https://statsapi.web.nhl.com/api/v1/teams/${query}`).then(response => response.json());
		const flatFilterPicks = (data, pred) => data.drafts.flatMap(({rounds}) => {
		  return rounds.flatMap(({picks}) => picks.filter(pred));
		});

		if (args[1]) {

			if (args[1].length === 3) {

				const teamObj = teams.find(o => o.abbreviation === args[1].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[1].toUpperCase()) || '';
				draftTeam = ` (${teamObj.name})`;
				if (teamObj.active) {
					const html = await fetch(teamObj.officialSiteUrl).then(response => response.text());
					const $ = cheerio.load(html);
					draftLogo = $('[rel="shortcut icon"]').attr('href');
				}

				if (teamObj) {
					draftObj = flatFilterPicks(data, pick => pick.team.id === teamObj.id);
				}
				else {
					return message.reply(`\`${args[1]}\` is not a team for the ${year} Draft. Type \`${prefix}help draft\` for a list of arguments.`);
				}
			}
			else if (parseInt(args[1], 10) > 0) {
				draftTeam = ` (Round ${args[1]})`;
				draftObj = flatFilterPicks(data, pick => pick.round === args[1]);

				if (!draftObj.length > 0) return message.reply(`\`${args[1]}\` is not a valid round for the ${year} Draft. Type \`${prefix}help draft\` for a list of arguments.`);
			}
			else {
				draftTeam = ` (Round ${round})`;
				draftObj = flatFilterPicks(data, pick => pick.round === round);
				if (!draftObj) return message.reply(`no draft picks found for the ${year} Draft. Type \`${prefix}help draft\` for a list of arguments.`);
			}

		}

		draftObj.sort(function(a, b) {
				return a['pickOverall'] - b['pickOverall'];
		});

		function getPicks(rounds) {
			let r = 0;
			return rounds.map(pick => {
				r++;
				const { year, round, pickOverall, pickInRound, team, prospect } = pick
				const teamAbbreviation = teams.find(o => o.id === team.id).abbreviation;
			
				function getHeader() {
					if (r === 1) return '#Rd Pick Team Player\n';
					return '';
				}
				function pad(stat, column) {
					const d = new String(stat);
					if (d.length === 1 && column === 4) return `${d}   `;
					if (d.length === 2 && column === 4) return `${d}  `;
					if (d.length === 3 && column === 4) return `${d} `;
					if (d.length === 1 && column === 5) return `${d}    `;
					if (d.length === 2 && column === 5) return `${d}   `;
					if (d.length === 3 && column === 5) return `${d}  `;
					if (d.length === 4 && column === 5) return `${d} `;
					return `${d}`;
				}
				return `${getHeader()}${pad(round, 4)}${pad(pickOverall, 5)}${pad(teamAbbreviation, 5)}${prospect.fullName}`;

			}).join('\u200B\n');
		}

		const block = '```md\n' + getPicks(draftObj) + '```';
		const authorArr = [year, draftTitle, draftTeam];
		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor(authorArr.join(' '), 'https://i.imgur.com/zl8JzZc.png');
		embed.setThumbnail(draftLogo);
		embed.setDescription(block);

		message.channel.send(embed);
	},
};