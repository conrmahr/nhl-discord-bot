const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'official',
	usage: '[<#>]',
	description: 'Get active officials information.',
	category: 'stats',
	aliases: ['official', 'o'],
	examples: ['', '4'],
	async execute(message, args, prefix) {

		const embed = new MessageEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor({ name: 'National Hockey League Officials', iconURL: 'https://i.imgur.com/zl8JzZc.png' });
		const endpoint = 'https://records.nhl.com/site/api/officials/';
		const options = {
			cayenneExp: 'active=true',
		};

		const { data } = await fetch(`${endpoint}${qs.stringify(options, { addQueryPrefix: true })}`).then(response => response.json());

		if (args.length === 0) {
			const positions = { Referee: [], Linesman: [] };

			data.sort((a, b) => a.lastName.localeCompare(b.lastName));

			data.forEach((official) => {
				if (official.officialType) {
					positions[official.officialType].push(`${official.lastName}, ${official.firstName} ${official.sweaterNumber}`);
				}
			});

			Object.entries(positions).filter(([, number ]) => number != null).forEach(([ key, value ]) => embed.addField(key, value.join('\n'), true));

			return message.channel.send({ embeds: [embed] });
		}
		else if (data.length > 0 && args[0] < 100) {

			const officialObj = data.find(n => n.sweaterNumber == args[0]);

			if (officialObj) {
				const o = {
					city: (officialObj.birthCity && officialObj.birthCity.length > 1) ? ` | ${officialObj.birthCity}, ` : '',
					country: (officialObj.countryCode && officialObj.countryCode.length > 1) ? officialObj.countryCode : '',
					first: officialObj.firstName,
					playoff: officialObj.firstPlayoffGameId,
					regular: officialObj.firstRegularGameId,
					headshot: officialObj.headshot_url,
					last: officialObj.lastName,
					type: (officialObj.officialType && officialObj.officialType.length > 1) ? `${officialObj.officialType}` : '',
					province: (officialObj.stateProvinceCode && officialObj.stateProvinceCode.length > 1) ? `${officialObj.stateProvinceCode}, ` : '',
					number: officialObj.sweaterNumber,
				};

				let firstGameObj, firstPlayoffGameObj, firstGame, firstPlayoffGame;
				if (o.regular) {
					firstGameObj = await fetch(`https://statsapi.web.nhl.com/api/v1/game/${o.regular}/feed/live`).then(response => response.json());
					firstGame = moment(firstGameObj.gameData.datetime.dateTime).format('MMMM DD, YYYY');
				}
				else {
					firstGame = 'No games';
				}
				if (o.playoff) {
					firstPlayoffGameObj = await fetch(`https://statsapi.web.nhl.com/api/v1/game/${o.playoff}/feed/live`).then(response => response.json());
					firstPlayoffGame = moment(firstPlayoffGameObj.gameData.datetime.dateTime).format('MMMM DD, YYYY');
				}
				else {
					firstPlayoffGame = 'No games';
				}
				embed.setAuthor({ name: `${o.first} ${o.last} #${o.number}`, iconURL: 'https://i.imgur.com/zl8JzZc.png' });
				embed.setThumbnail(o.headshot);
				embed.setDescription(`${o.type}${o.city}${o.province}${o.country}`);
				embed.addField('First Regular Game', firstGame, true);
				embed.addField('First Playoff Game', firstPlayoffGame, true);

				return message.channel.send({ embeds: [embed] });
			}
			else {
				return message.reply({ content: `\`${args.join()}\` is not an active sweater number. Type \`${prefix}official\` for list of active officials.`, allowedMentions: { repliedUser: true } });
			}
		}
		else {
			return message.reply({ content: `\`${args.join()}\` is not a valid argument. Type \`${prefix}help official\` for a list of arguments.`, allowedMentions: { repliedUser: true } });
		}

	},
};