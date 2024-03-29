<img width="128" height="128\" align="left" style="float: left; margin: 0 10px 0 0;" alt="NHL Discord Bot" src="https://cdn.discordapp.com/avatars/535203406592344067/1473d566732ea6ffd24d02be45af8b21.png">  

# :ice_hockey: NHL Discord Bot

[![Discord Banner](https://discordapp.com/api/guilds/499434832124837889/widget.png?style=shield)](https://discord.gg/92UtjGs)
![Build Status](https://github.com/conrmahr/nhl-discord-bot/workflows/build/badge.svg)

NHL Discord Bot is a public bot that fetches data from live public [NHL API](https://github.com/erunion/sport-api-specifications/tree/master/nhl) endpoints triggered by simple text commands and formats them to styled embeds using the [discord.js](https://github.com/discordjs/discord.js) library.
>**Disclaimer:** The NHL Discord Bot is not affiliated, associated, authorized, endorsed by, or in any way officially connected with the National Hockey League; National Hockey League Players' Association, National Hockey League Officials' Association, or any of its subsidiaries or its affiliates.

<p align="center">
  <img width="600" height="489\" src="https://cdn.discordapp.com/attachments/843989785189810206/966483391560175676/nbd-screenshot.gif" />
</p>

### :keyboard: Commands

| Command with Arguments                | Description |
| ------------------------------------- | ------------------------------------- |
|**`about`** | Shows information about `nhl-discord-bot`.|
|**`cap <name>\|<team> [-<flag>]`** | Get players and teams contract information.|
|**`draft [<year>] [<round>\|<team>]`** | Get draft picks by round or team.|
|**`game [<date>] <team> [-<flag>]`** | Get game boxscores, scoring, and penalty summaries.|
|**`help <command>`** | List all of commands or info about a specific command.|
|**`invite`** | Get invite links for adding the bot and support server.|
|**`nhl [<date>] [<team> <opponent>] [-<flag>]`** | Get game schedules and scores.|
|**`official [<#>]`** | Get active officials information.|
|**`player [<year>] <name> [-<flag>]`** | Get player stats for active and inactive players.|
|**`standings [<year>] <table> [-<flag>]`** | Get current standings for any division, conference, or league.|
|**`team [<year>] [<team>] [-<flag>]`** | Get team stats or roster for active and former teams.|
|**`world [<date>] [-<flag>]`** | Get IIHF tournament schedules and scores.|

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