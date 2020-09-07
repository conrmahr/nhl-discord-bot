<img width="128" height="128" align="left" style="float: left; margin: 0 10px 0 0;" alt="NHL Discord Bot" src="https://cdn.discordapp.com/avatars/535203406592344067/1473d566732ea6ffd24d02be45af8b21.png">  

# :ice_hockey: NHL Discord Bot

[![Discord Banner](https://discordapp.com/api/guilds/499434832124837889/widget.png?style=shield)](https://discord.gg/92UtjGs)
![Build Status](https://github.com/conrmahr/nhl-discord-bot/workflows/build/badge.svg)


NHL Discord Bot is a self-hosted bot that fetches data from live public [NHL API](https://github.com/erunion/sport-api-specifications/tree/master/nhl) endpoints triggered by simple text commands and formats them to styled embeds using the [discord.js](https://github.com/discordjs/discord.js) library.
>**Disclaimer:** The NHL Discord Bot is not affiliated, associated, authorized, endorsed by, or in any way officially connected with the National Hockey League; National Hockey League Players' Association, National Hockey League Officials' Association, or any of its subsidiaries or its affiliates.

### :page_with_curl: Requirements

- Node.js v12+
- Git v1.7+
- Discord Bot Token
  - https://discordjs.guide/preparations/setting-up-a-bot-application.html
- Google Search Engine ID
  - https://developers.google.com/custom-search/docs/tutorial/creatingcse
- Google APIs Key
  - https://developers.google.com/custom-search/v1/introduction

### :computer: Installation

Make sure, that you have `git` and `node` installed first
```sh
git --version && node -v
# Example output:
# git version 2.27.0
# v12.18.2
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
  "activity": {
    "type": "WATCHING-OR-LISTENING",
    "name": "ANY-TEXT-STRING"
  },
  "googleSearch": {
    "cx": "GOOGLE-SEARCH-ENGINE-ID",
    "key": "GOOGLE-APIS-KEY"
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

### :keyboard: Commands

| Command with Arguments                | Description |
| ------------------------------------- | ------------------------------------- |
|**`about`** | Shows information about `nhl-discord-bot`.|
|**`draft [<year>] [<round>|<team>]`** | Get draft picks by round or team.|
|**`game [<date>] <team> [-<flag>]`** | Get game editorials and boxscores.|
|**`help <command>`** | List all of commands or info about a specific command.|
|**`nhl [<date>] [<team> <opponent>] [-<flag>]`** | Get game schedules and scores.|
|**`official [<#>]`** | Get active officials information.|
|**`player [<year>] <name> [-<flag>]`** | Get player stats for active and inactive players.|
|**`standings [<year>] <table> [-<flag>]`** | Get current standings for any division, conference, or league.|
|**`team [<year>] [<team>] [-<flag>]`** | Get team stats or roster for active and former teams.|

### :handshake: Contributing

Contributions, issues and feature requests are welcomed!

**If you want to contribute to the codebase of this project, please follow the [contribution guidelines](.github/CONTRIBUTING.md).**

### :book: Author

[@conrmahr](https://github.com/conrmahr)

### :thumbsup: Credits

[@dword4](https://github.com/dword4) For discovering a majority of the NHL API endpoints and documenting them.<br />
[@erunion](https://github.com/erunion) For documenting the OpenAPI 3.0 specifications for the NHL API.

### :memo: License

This project is licensed under the [MIT License](LICENSE).