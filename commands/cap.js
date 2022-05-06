const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const qs = require('qs');
const { BitlyClient } = require('bitly');
const { googleSearch, bitlyAccess } = require('../config.json');
const bitly = new BitlyClient(bitlyAccess.token, {});

module.exports = {
	name: 'cap',
	usage: '<name>|<team> [-<flag>]',
	description: 'Get players most recent contract breakdown and teams latest salary cap numbers. Add flag `-buyout` for current contract buyout details.',
	category: 'stats',
	aliases: ['cap', 'c'],
	examples: ['mcdavid', 'edm', 'tavares -buyout'],
	async execute(message, args, prefix) {

		if (args.length === 0) return message.reply({ content: `No player or team provided. Type \`${prefix}help cap\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
		const { teams } = await fetch('https://statsapi.web.nhl.com/api/v1/teams/').then(response => response.json());
		const terms = args.join(' ');
		const teamObj = teams.find(o => o.abbreviation === args[0].toUpperCase() || o.teamName.toUpperCase().split(' ').pop() === args[0].toUpperCase());
		let nameString = '';
		let bio = '';

		if (teamObj) {
			nameString = teamObj.name;
		}
		else {
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
				return message.reply({ content: `${error.code}: ${error.message}`, allowedMentions: { repliedUser: true } });
			}
			else if (google.searchInformation.totalResults > 0 && args[0]) {
				const { link } = google.items[0];
				const playerId = link.slice(link.length - 7);
				const apiPeople = 'https://statsapi.web.nhl.com/api/v1/people/';
				const { people } = await fetch(`${apiPeople}${playerId}`).then(response => response.json());
				bio = people[0];
				nameString = bio.fullName;
			}
		}
		const bodyData = {
			'scope': 'all',
			'names': [
				{
					'name': nameString,
					'textLocation': nameString.length,
				},
			],
		};
		const { data } = await fetch('https://puckpedia.com/connector/api', {
			method: 'post',
			body: JSON.stringify(bodyData),
			headers: { 'Content-Type': 'application/json' },
		}).then(response => response.json());

		if (!data.length
			|| (data[0].contract === null && typeof data[0].cap_space === 'undefined')
			|| (data[0].contract > 0 && typeof data[0].cap_space === 'undefined')
			|| (data[0].contract === null && data[0].cap_space > 0)
		) return message.reply({ content: `No contract data found for \`${nameString}\`.`, allowedMentions: { repliedUser: true } });

		const getDollar = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			roundingIncrement: 0,
			maximumFractionDigits: 0,
		});

		const getPercent = (p) => {
			const o = p.toFixed(2) + '%';
			return o;
		};

		const bitlyObj = await bitly.shorten(data[0].url);
		const link = bitlyObj.link;
		const embed = new MessageEmbed();
		embed.setColor(0x59acef);

		if (teamObj) {
			embed.setAuthor({ name: nameString, iconURL: 'https://i.imgur.com/ekQAz39.png', url: link });
			embed.addFields(
				{ name: 'Projected Cap Hit', value: getDollar.format(data[0].accumulated_cap_hit), inline: true },
				{ name: 'Projected Cap Space', value: getDollar.format(data[0].cap_space), inline: true },
			);
		}
		else {
			embed.setAuthor({ name: `${nameString} #${bio.primaryNumber} - ${bio.currentTeam.name}`, iconURL: 'https://i.imgur.com/ekQAz39.png', url: link });
			embed.setThumbnail(`https://cms.nhl.bamgrid.com/images/headshots/current/168x168/${bio.id}.jpg`);
			embed.addFields(
				{ name: 'AAV', value: getDollar.format(data[0].contract.cap_hit), inline: true },
				{ name: 'Cap %', value: getPercent(data[0].contract.cap_share), inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Contract Signed', value: `${data[0].contract.expiry_year - data[0].contract.contract_year[1]} (Year ${data[0].contract.contract_year[0]} of ${data[0].contract.contract_year[1]})`, inline: true },
				{ name: 'Expiration Status', value: `${data[0].contract.expiry_status} ${data[0].contract.expiry_year}`, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
			);
		}

		return message.channel.send({ embeds: [embed] });
	},
};