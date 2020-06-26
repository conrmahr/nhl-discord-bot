const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const qs = require('qs');

module.exports = {
	name: 'official',
	usage: '<#>',
	description: 'Get active officials information.',
	category: 'stats',
	aliases: ['official', 'o', 'ref'],
	examples: ['4'],
	async execute(message, args, flags, prefix) {

		const embed = new RichEmbed();
		embed.setColor(0x59acef);
		embed.setAuthor('National Hockey League Officials', 'https://i.imgur.com/zl8JzZc.png');
		const endpoint = 'https://records.nhl.com/site/api/officials/';
		const options = {
			cayenneExp: 'active=true',
		};

		const { data } = await fetch(`${endpoint}${qs.stringify(options, { addQueryPrefix: true })}`).then(response => response.json());

		if (args.length === 0) {
			const positions = { Referee: [], Linesman: [] };
			data.sort((a, b) => a.lastName.localeCompare(b.lastName))
			data.forEach((official) => {
				if (official.officialType) {
					positions[official.officialType].push(`${official.lastName}, ${official.firstName} ${official.sweaterNumber}`);
				}
			});

			Object.entries(positions).filter(([, number ]) => number != null).forEach(([ key, value ]) => embed.addField(key, value, true));

			message.channel.send(embed);
		}
		else if (data.length > 0 && args[0] < 100) {
			function getFirstGame(p) {
				const fullDate = moment(p).format('MMMM DD, YYYY');
				return fullDate;
			}
			officialsObj = data.find(n => n.sweaterNumber == args[0]);

			if (officialsObj) {
			const o = {
				city: officialsObj.birthCity ? `${officialsObj.birthCity}, ` : '',
				country: officialsObj.countryCode ? officialsObj.countryCode : '',
				first: officialsObj.firstName,
				playoff: officialsObj.firstPlayoffGameId,
				regular: officialsObj.firstRegularGameId,
				headshot: officialsObj.headshot_url,
				last: officialsObj.lastName,
				type: officialsObj.officialType ? `${officialsObj.officialType} | ` : '',
				province: officialsObj.stateProvinceCode ? `${officialsObj.stateProvinceCode}, ` : '',
				number: officialsObj.sweaterNumber
			};

			let firstGameObj, firstPlayoffGameObj, firstGame, firstPlayoffGame;
			if (o.regular) {
				firstGameObj = await fetch(`https://statsapi.web.nhl.com/api/v1/game/${o.regular}/feed/live`).then(response => response.json());
				firstGame = getFirstGame(firstGameObj.gameData.datetime.dateTime);
			} else {
				firstGame = 'No games'; 
			}
			if (o.playoff) {
				firstPlayoffGameObj = await fetch(`https://statsapi.web.nhl.com/api/v1/game/${o.playoff}/feed/live`).then(response => response.json());
				firstPlayoffGame = getFirstGame(firstPlayoffGameObj.gameData.datetime.dateTime);
			} else {
				firstPlayoffGame = 'No games'; 
			}
			embed.setAuthor(`${o.first} ${o.last} | #${o.number}`, 'https://i.imgur.com/zl8JzZc.png');
			embed.setThumbnail(o.headshot);
			embed.setDescription(`${o.type}${o.city}${o.province}${o.country}`);
			embed.addField('First Regular Game', firstGame, true);
			embed.addField('First Playoff Game', firstPlayoffGame, true);
			message.channel.send(embed);
			}
			else {
				message.reply(`\`${args.join()}\` is not an active sweater number. Type \`${prefix}official\` for list of active officials.`);
			}
		}
		else {
			message.reply(`\`${args.join()}\` is not a valid argument. Type \`${prefix}help official\` for a list of arguments.`);
		}

	},
};