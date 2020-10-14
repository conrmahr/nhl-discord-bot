const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const qs = require('qs');
const cheerio = require('cheerio');
const { BitlyClient } = require('bitly');
const { googleSearch, bitlyAccess } = require('../config.json');
const bitly = new BitlyClient(bitlyAccess.token, {});

module.exports = {
	name: 'cap',
	usage: '[<name>|<team>]',
	description: 'Get players most recent contract breakdown and teams latest salary cap numbers.',
	category: 'stats',
	aliases: ['cap', 'c'],
	examples: ['mcdavid', 'edm'],
	async execute(message, args, flags, prefix) {

		if (args.length === 0) return message.reply(`no player or team provided. Type \`${prefix}help cap\` for a list of arguments.`);
		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const terms = args.join(' ');
		const isTeam = teams.some(o => o.abbreviation === args[0].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[0].toUpperCase());
		const type = isTeam ? 'teams' : 'players';
		const options = {
			key: googleSearch.key,
			cx: googleSearch.cx,
			num: 1,
			lr: 'lang_en',
			safe: 'active',
			fields: 'searchInformation,items(link)',
			siteSearch: `https://www.capfriendly.com/${type}`,
			q: terms,
		};

		const apiGoogleCustomSearch = 'https://www.googleapis.com/customsearch/v1';
		const google = await fetch(`${apiGoogleCustomSearch}${qs.stringify(options, { addQueryPrefix: true })}`).then(response => response.json());

		if (google.error) {
			const { error } = google;
			message.reply(`${error.code}: ${error.message}`);
		}
		else if (google.searchInformation.totalResults > 0 && args[0]) {
			let { link } = google.items[0];
			const bitlyObj = await bitly.shorten(link);
			link = bitlyObj.link;
			const html = await fetch(link).then(response => response.text());
			const $ = cheerio.load(html);
			const embed = new MessageEmbed();
			embed.setColor(0x59acef);

			if (isTeam) {
				const teamName = $('body > div.wrap > div > div > h1').text().split(' ');
				const teamDollars = $('div.mb5 > div.c').first();
				const projectedCapHit = teamDollars.find('h5:nth-child(1)').text().split(':')[1];
				const projectedLTIRUsed = teamDollars.find('h5:nth-child(2)').text().split(':')[1];
				const projectedCapSpace = teamDollars.find('h5:nth-child(3)').text().split(':')[1];
				const currentCapSpace = teamDollars.find('div:nth-child(4) > span').text();
				const deadlineCapSpace = teamDollars.find('div:nth-child(5) > span').text();
				const todaysCapHit = teamDollars.find('div:nth-child(6) > span').text();
				const rosterSize = teamDollars.find('div:nth-child(7)').text().split(':')[1];
				const contracts = teamDollars.find('div:nth-child(8)').text().split(':')[1];
				const reserveList = teamDollars.find('div:nth-child(9)').text().split(':')[1];
				const capArr = {
					'Projected Cap Hit': projectedCapHit.trim(),
					'Projected LTIR Used': projectedLTIRUsed.trim(),
					'Projected Cap Space': projectedCapSpace.trim(),
					'Current Cap Space': currentCapSpace.trim(),
					'Deadline Cap Space': deadlineCapSpace.trim(),
					'Todays Cap Hit': todaysCapHit.trim(),
					'Roster Size': rosterSize.trim(),
					'Contracts': contracts.trim(),
					'Reserve List': reserveList.trim(),
				};

				embed.setColor(0x59acef);
				embed.setAuthor(teamName.join(' '), 'https://i.imgur.com/RFALbw5.png', link);


				for (const [key, value] of Object.entries(capArr)) {
					embed.addField(key, value, true);
				}

			}
			else {
				const playerObj = {};
				let contract = '';
				playerObj.name = $('.ofh:nth-child(1) > h1').text();
				playerObj.team = $('.ofh:nth-child(1) > h3').text();
				playerObj.signed = $('body > div.wrap > div > div > div:nth-child(14) > div:nth-child(1) > h4').text().trim();

				if (playerObj.signed.includes('CURRENT')) {
					contract = $('.table_c').filter(function() {
						return $(this).find('table.cntrct').length;
					}).first();
				}
				else {
					contract = $('.table_c').filter(function() {
						return $(this).find('table.cntrct').length;
					}).last();
				}

				const na = (x) => x ? x : null;
				playerObj.hasContract = contract.children().children().hasClass('ofh');
				if (!playerObj.hasContract) return message.reply(`no NHL contract history found for ${playerObj.name}.`);
				playerObj.contractType = na(contract.find('.cntrct > div.ofh').children().first().text());
				playerObj.length = na(contract.find('.contract_data.rel.cntrct > div.ofh > div:nth-child(4)').text().split(':')[1]);
				playerObj.expiryStatus = na(contract.find('.contract_data.rel.cntrct > div.ofh > div:nth-child(5)').text().split(':')[1]);
				playerObj.signingTeam = na(contract.find('.contract_data.rel.cntrct > div.ofh > div:nth-child(6)').text().split(':')[1]);
				playerObj.value = na(contract.find('.contract_data.rel.cntrct > div:nth-child(2) > div:nth-child(1)').text().split(':')[1]);
				playerObj.chPercentage = na(contract.find('.contract_data.rel.cntrct > div:nth-child(2) > div:nth-child(2)').text().split(':')[1]);
				playerObj.signingDate = na(contract.find('.contract_data.rel.cntrct > div:nth-child(2) > div:nth-child(3)').text().split(':')[1]);
				playerObj.source = na(contract.find('.cntrct > div:last-child').children().eq(-1).text().split(':')[1]);
				playerObj.sourceTitle = contract.find('.cntrct > div:last-child').children().eq(-1).text().split(':')[0];
				playerObj.url = contract.find('.cntrct > div:last-child a').attr('href');
				const summary = [];
				let block = '';
				let valueAll = null;
				let signingAll = null;

				if (playerObj.value && playerObj.length && playerObj.chPercentage) {
					valueAll = `${playerObj.value}, ${playerObj.length} (C.H. ${playerObj.chPercentage}%)`;
				}

				if (playerObj.signingTeam && playerObj.signingDate) {
					signingAll = `${playerObj.signingTeam} (${playerObj.signingDate.trim()})`;
				}

				if (playerObj.url) {
					const sourceURL = await bitly.shorten(playerObj.url);
					playerObj.source = `[${playerObj.source}](${sourceURL.link})`;
				}

				const capArr = {
					Type: playerObj.contractType,
					Value: valueAll,
					'Signing': signingAll,
					'Expiry Status': playerObj.expiryStatus,
					Source: playerObj.source,
				};

				for (const [key, value] of Object.entries(capArr)) {

					if (value) {
						summary.push(`**${key}:** ${value}`);
					}
				}

				let table = '- SEASON   CLAUSE     AAV($)       TOTAL\n';
				block += summary.join('\n');
				contract.find('tr').each(function() {
					const self = $(this).first();
					let result = '';
					let asterisk = '';
					let slide = self.find('td:nth-child(8)').text();
					const padArr = [2, 11, 11, 13];
					const checkHeader = self.find('td:nth-child(1)').text().trim();
					if (self.find('td:nth-child(1)').hasClass('b')) { asterisk = '+ '; }
					if (!slide.length) { slide = `${self.find('td:nth-child(7)').text().trim()}`; }
					if (checkHeader === 'SEASON') return true;
					result += `${asterisk.padEnd(padArr[0])}${self.find('td:nth-child(1)').text().trim()}`.padEnd(padArr[1]);
					result += `${self.find('td:nth-child(2)').text().trim().padEnd(padArr[2])}`;
					result += `${self.find('td:nth-child(4)').text().trim().padEnd(padArr[3])}`;
					result += slide;
					result += '\n';
					table += result;
				});

				const clause = contract.find('.clause').map(function() {
					return `${$(this).text()}\n\n`;
				}).get().join('');

				block += `\`\`\`diff\n${table}\n\`\`\``;
				embed.setAuthor(`${playerObj.name} - ${playerObj.team}`, 'https://i.imgur.com/RFALbw5.png', link);
				embed.setDescription(block);
				embed.setFooter(clause);
			}

			return message.channel.send(embed);

		}
		else {
			message.reply(`\`${terms}\` matched 0 players or teams.`);
		}
	},
};