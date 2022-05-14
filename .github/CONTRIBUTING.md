# Contributing

We would love for you to contribute to nhl-discord-bot and help make it even better than it is
today! As a contributor, here are the guidelines we would like you to follow:

 - [Code of Conduct](#coc)
 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Setup on Local Environment](#setup)

## <a name="coc"></a> Code of Conduct

Help us keep the project open and inclusive. Please read and follow the [Code of Conduct][coc].

## <a name="question"></a> Got a Question or Problem?

Do not open issues for general support questions as we want to keep GitHub issues for bug reports and feature requests. If you would like to chat about the question in real-time, you can reach out via the [Discord server][discord].

## <a name="issue"></a> Found a Bug?

If you find a bug in the source code, you can help us by [submitting an issue][issue-template] to the GitHub Repository.

## <a name="feature"></a> Missing a Feature?

You can *request* a new feature by [submitting an issue][issue-template] to the GitHub Repository.

## <a name="setup"></a> Setup Local Environment

### Requirements

- Node.js v16.9+
- Git v1.7+
- [Discord Bot Token](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
- [Google Search Engine ID](https://developers.google.com/custom-search/docs/tutorial/creatingcse)
- [Google APIs Key](https://developers.google.com/custom-search/v1/introduction)
- [Bitly Generic Access Token](https://support.bitly.com/hc/en-us/articles/230647907-How-do-I-generate-an-OAuth-access-token-for-the-Bitly-API-)
- [Timezone Database Name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)


### Installation

Make sure, that you have `git` and `node` installed first
```sh
git --version && node -v
# Example output:
# git version 2.36.0
# v16.14.0
```

Clone the repository
```sh
git clone https://github.com/conrmahr/nhl-discord-bot.git
```

Change directories
```sh
cd nhl-discord-bot
```

Install all required dependencies
```sh
npm i
```

Copy the `config-sample.json` file
```sh
cp config-sample.json config.json
```

Edit the `config.json` file
```json
{
  "prefix": "ONE-CHARACTER-SYMBOL",
  "token": "DISCORD-BOT-TOKEN",
  "timezone": "COUNTRY/CITY",
  "activity": {
    "type": "WATCHING-OR-LISTENING",
    "name": "ANY-TEXT-STRING"
  },
  "googleSearch": {
    "cx": "GOOGLE-SEARCH-ENGINE-ID",
    "key": "GOOGLE-APIS-KEY"
  },
  "bitlyAccess": {
    "token": "BITLY-GENERIC-ACCESS-TOKEN"
  }
}
```

Run the bot
```sh
node .
# nhl-discord-bot is logged in!
```

```
# Open this URL in a browser to add the bot to server
https://discordapp.com/oauth2/authorize?client_id={YOUR_CLIENT_ID}&scope=bot
```

<!-- LINKS -->
[coc]: CODE_OF_CONDUCT.md
[issue-template]: https://github.com/conrmahr/nhl-discord-bot/issues/new/choose
[feature-template]: ISSUE_TEMPLATE/feature_request.md
[pr-template]: PULL_REQUEST_TEMPLATE.md
[github]: https://github.com/conrmahr/nhl-discord-bot
[discord]: https://discord.gg/92UtjGs