# ctfbot
Discord bot to facilitate an entire Capture the Flag competition internally. Official CTF platform of [San Diego CTF](https://sdc.tf).

## getting started

Before you run the project, you'll need to have a postgres instance to connect to.
You can configure the connection parameters with the [usual environment variables](https://node-postgres.com/features/connecting),
or if you have docker installed, you can spin up a postgres server that the development version can connect to with **no configuration**
with the following command:

```bash
docker run --name ctfbot-postgres -p 5432:5432 -e POSTGRES_PASSWORD=dAf1bjOwYUrVse8DsAZZBh2fkxXQwAbGrmE7EHUA -e POSTGRES_USER=ctfbot -d postgres
```

From here, you'll need [node-gyp installed](https://github.com/nodejs/node-gyp#installation) and all the build tools to compile native bindings.

Lastly, to clone the project, build the dependencies, compile the code, and execute:

```bash
git clone https://github.com/acmucsd/ctfbot.git
npm install # may require postgres to be installed
npm start # run development mode, changes trigger a reload
```

## user flow

This section walks through the experience of a new user joining your discord-based CTF.

### 1 - joining the main guild
First, the hopeful player will join the **main guild** registered to the CTF.
Nothing happens, but they get access to the **Terms of Service channel**, which is generated when a CTF is created.
They will need to agree to these terms in order to participate.

### 2 - accepting the terms of service
Once the user reacts affirmatively to the **Terms of Service**, ctfbot will automatically grant that user:
1. a **User** registration in the CTF
2. a **Team** registration that contains only the user and is assigned to the least full Team Server
3. the `@Competitor` role, that grants access to challenge channels and user commands
4. a role that corresponds to the team server they have been added to, granting access to their team server channel
5. a channel in that team server corresponding to their team

### 3 - joining their team server
When the user joins their team server, they will arrive in a landing channel with a short
explanation on where to find challenges and how to change team servers.
They will immediately be granted their team role and have access to their team channel, where they can submit challenges.

If they join the wrong team server, they will be kicked and directed to their real team server.

### 4 - adding people to their team
The original member of a team can expand their team by using the `/team invite DISCORD_USER` command.
You may only invite users that have already accepted TOS.
The invited user will receive your invitation in their team chat, and they can accept by either reacting
or using the command `/team join TEAM_NAME`.

Once you have added a user to your team, they will be kicked out of their channels, chats, and roles and added to your team's resources.

### 5 - submitting challenges
The user can attempt a challenge by viewing the **challenge channel** in the **main guild**,
and reacting to it to get the prompt sent to their team channel.

Once the challenge is complete, they should submit the flag using the `/submit` command, preferably in their team channel.
If they attempt to use this command in another channel, or if a flag is detected in any channel,
the message will be deleted and the user will be warned.

When a challenge is submitted, the solve will be announced,
and the user may be granted access to an additional challenge channel, if another challenge was unlocked.

### 6 - checking status
The user can always view the leaderboard chats in the **main guild**. 
There is a top-in-each-category leaderboard, and there is an overall leaderboard.
These are updated every couple of minutes.

The user can request their own standing in their team channel with `/scoreboard standing`.

## commands

The bot is controlled primarily through [Slash Commands](https://discord.com/developers/docs/interactions/slash-commands). 

There are two kinds of commands, administrative commands and user commands.

Discord also makes a distinction between globally registered commands and per-guild commands. Most commands provided are per-guild commands, the bot will not respond to commands outside of a guild with which it is registered.

The only global commands are:
1. `/addctf`
2. `/addserver`

Once these commands are run in a particular server, the remaining per-guild commands will be added.

### administrative commands

To use the commands detailed in this section, your Discord user needs to have the admin role in the CTF settings. 

#### adding a new CTF
```java
/addctf NAME [DESCRIPTION]
```

This creates a new CTF in the guild you're currently in. It will create all of the channel categories it will add competition channels to, as well as some meta channels for announcements and logging. Avoid deleting these categories and channels, but you can otherwise name them / rearrange them freely.

**Note**: there is a limit of one CTF per guild.

**Note 2**: until you *publish* the CTF by setting the start date and end date, challenges cannot be submitted by players.

**Note 3**: creating a ctf will also create an Admin role that the calling user will be added to.

#### editing a CTF
```java
/ctf set name NAME
/ctf set description DESCRIPTION
/ctf set admin ADMIN_ROLE
/ctf set start [START_DATE]
/ctf set end [END_DATE]
```

Edit various parameters of the current CTF.

Using `set start` without specifying a start date will cause the startdate to be set to "now". This effectively *publishes* a CTF. Likewise, using `set end` without specifying an end date will cause the current CTF to be closed immediately.

#### managing a CTF
```java
/ctf announce MESSAGE
```

Posts the message you provide in the official CTF #announcements channel. More formatting and details to come soon.

#### removing a CTF
```java
/ctf del
```

This causes the removal of the current guild's CTF *and all associated Teams, Categories, and Challenges*. There is no going back.

#### managing team servers
```java
/addserver NAME LIMIT CTF_NAME
/ctf server get [CTF_NAME]
/ctf server del NAME [CTF_NAME]
```

The first command will add the current guild as a team server for the indicated CTF. Again, you must be an admin on the main CTF guild to run this command.

The second command will list all of the team servers belonging to the indicated CTF. The current CTF will be inferred if you are already on the main CTF guild or a team server.

The third command will remove the indicated team server from the indicated CTF. The CTF can also be inferred by the guild you are on. 

#### creating a team
```java
/team add NAME [SERVER_NAME]
```

Creating a team this way does not add anybody to the team, it is an *empty team*, initially. *This is the only command that technically creates invalid data.*

**Note**: this will add a team to the indicated team server, or the server will be inferred from the current guild. If you are not in a team server, or the team server is full, even if there are other available team servers, the command will fail.

**Note 2**: creating a team will always cause the creation of an associated *team role* and *team channel*.

#### editing a team
```java
/team set name NAME [TEAM_ROLE]
/team set description DESCRIPTION [TEAM_ROLE]
/team set color COLOR [TEAM_ROLE]
/team set captain USER [TEAM_ROLE]
/team set server SERVER_NAME [TEAM_ROLE]
```

Edit the name, description, role color, and captain of the associated team. If no team role is provided, the team to edit will be inferred, firstly from the current channel, and secondarily from the current user's team.

**Note**: when setting the team server of a team, the target team server must not be full. Also, the current team's channels will be deleted, message history will be lost, and current members will be given an invite to the new server where their new team channels await.

#### managing teams
```java
/team get
```

Returns a list of all teams currently in the CTF.

#### managing team users
```java
/team user get [TEAM_ROLE]
/team user add USER [TEAM_ROLE]
/team user del USER [TEAM_ROLE]
```

Allows you to list the users in a team, add a user to a team, and delete a user from a team respectively. If no team role is provided, the team to edit will be inferred firstly from the current channel, and secondarily from the current user's team.

**Note**: The usual restrictions apply; adding a user to a team will remove them from their previous team, removing a user from a team will add them to an individual team, and removing all the users from a team will cause that team to be deleted.

**Note 2**: Removing a user from a team will cause that team to lose the points that the user earned on behalf of the team. The user will keep credit for the flags they've submitted, and if you add them to a different team, their new team will gain points accordingly. 

**Note 3**: Removing a user from a team that is the team captain will *not* cause the captain to be reassigned, that must be done separately.

#### removing teams
```java
/team del [TEAM_ROLE]
```

Deletes the team indicated, or infers the team to delete, firstly from the current channel, and secondarily from the current user's team. 

**Note**: This command kicks all the users off the team and adds each of them to individual teams.

**Note 2**: This will also cause the permanent deletion of the team role and the team channels.

#### creating new categories
```java
/category add NAME [DESCRIPTION]
```

Creates a new category with the provided name and description. This automatically creates a channel category with the same name in the main CTF guild.

**Note**: Category names are **unique** per CTF.

#### editing categories
```java
/category set name NEW_NAME NAME
/category set description DESCRIPTION NAME
```

Edit the name and description of a category you identify by name.

#### managing categories
```java
/category get [NAME]
```
Without arguments, returns a list of all categories currently in the CTF.
Will also return a list of all the challenges in an indicated category.

#### removing categories
```java
/category del NAME
```
Removes the provided category from the current CTF. *This will also delete all challenges associated with this category*.

#### creating new challenges
```java
/challenge add NAME CATEGORY
```

Creates a new CTF challenge. This also creates a challenge text channel in its category. Lots of important defaults are set when a challenge is first created:

* **Author** defaults to the Discord Username of the user executing the command.
* **Prompt** defaults to an empty string.
* **Difficulty** defaults to *Baby*.
* **Initial Points** defaults to 100 points.
* **Minimum Points** defaults to 100 points. This means this challenge is statically scored by default.
* **Point Decay** defaults to 100. This means, if Initial Points and Minimum Points are different, it will take 100 solves for the points this challenge awards to fall to the value of Minimum Points.
* **Flag** defaults to a randomly generated string resembling `flag{9a39mHrasu8MVZ32x4Kg}`.

All of these settings can be changed in further commands.

**Note**: Challenge names are **unique** per CTF.

#### editing challenges
```java
/challenge set name NAME [CHALLENGE_NAME]
/challenge set author AUTHOR [CHALLENGE_NAME]
/challenge set prompt PROMPT [CHALLENGE_NAME]
/challenge set difficulty DIFFICULTY [CHALLENGE_NAME]
/challenge set points POINTS [CHALLENGE_NAME]
/challenge set initialpoints POINTS [CHALLENGE_NAME]
/challenge set minimumpoints POINTS [CHALLENGE_NAME]
/challenge set pointdecay DECAY [CHALLENGE_NAME]
/challenge set flag FLAG [CHALLENGE_NAME]
/challenge set publish [PUBLISH_TIME] [CHALLENGE_NAME]
```

Edits the challenge variables in a predictable way. Each command allows specifying the challenge to modify, but will otherwise attempt to infer this information if you are in a challenge channel.

**Note**: `set points 500` is an alias for `set initialpoints 500` and `set minimumpoints 500`. This allows setting static points with a single command.

**Note 2**: Using `set publish` without specifying a publish time will set it to "now", publishing the challenge instantly.


#### managing challenges
```java
/challenge get [NAME]
```

Without arguments, returns a list of all challenges in the CTF.
While indicating a particular challenge, returns all available information about that challenge.

#### removing challenges
```java
/challenge del [CHALLENGE_NAME]
```

Removes the challenge indicated, or infers it from the current challenge channel if its missing. *This causes all recorded attempts to solve this challenge to be deleted forever*.

#### managing attachments
```java
/challenge attach get [CHALLENGE_NAME]
/challenge attach add NAME URL [CHALLENGE_NAME]
/challenge attach del NAME [CHALLENGE_NAME]
```

The first command will list all file attachments of a particular challenge. The current challenge can also be inferred if you are in a challenge channel.

The second command will add a file attachment to an existing challenge. 

The third command will delete a file attachment from a challenge.

### user commands

All users in the server are able to use these commands regardless of admin status

#### joining a team
```java
/invite DISCORD_USERNAME
/join TEAM_NAME // NOT ADDED ATM
```

Invite allows for the owner of a team to invite a user within the CTF to their current 
team. Only succeeds if the username is valid, if the user has accepted ToS, and is on a team by themselves.

Join works similarly to this, attempting to join a team but only succeeding if the 
team name is valid, if the user attempting to join a team hasn't already joined another
team, and as long as the user attempting to join has been invited to the team they
are trying to join. If the user has yet to be invited, the bot will DM the team owner
a message in which they can react to accept this invite. The message will only be sent once regardless of the times invited, and thus an ignore / "no reaction" is equivalent to a reject.

**Note 1:** check for individuals being on a team of one through the database, not the server

**Note 2:** if these are used outside the main server, the user is given instructions on 
how to do it properly in the main server


#### team management
```java
/setname NAME
/setcolor COLOR
```

Similar to the admin only commands, these take in no argument for team and will only affect
the user's current team. Non-admins will only be allowed to use this command in their specific
team channel, but the functionality will carry over.

#### scoreboard
```java
/scoreboard top [CATEGORY]
/scoreboard team [TEAM_NAME]
/scoreboard standing [TEAM_NAME]
```

First command prints a scoreboard detailing the top 20 teams and their total points in the specified
category. If no category is specified, it will instead list the top 20 teams overall in the CTF.

Second command gives info about a specific team, detailing their info (name, description, members,
etc.) and their standing along with total points and attempt correct percentage. If no team is specified,
it bases it on the user's current team.

Third command gives a view similar to top for the specified team, listing the 9 teams above and below
the specified team overall and their names, points, and place values. If no team is specified, the user's
team will be inferred.

#### challenges
```java
/submit CHALLENGE_NAME FLAG
```

Allows a user to submit a flag for a specified challenge, only counting the attempt as valid if the 
challenge name is valid. If the name is a valid challenge, then the bot checks to assure the flag is
correct, adjusting the user's attempts total accordingly with correct and incorrect attempts. If correct,
first blood checks are done along with adjusting of points for that challenge.

## notes

A quick note about Slash Command support: We got tired of waiting for discord.js to support Slash Commands,
so we've used [this PR](https://github.com/discordjs/discord.js/pull/5106/files) as a reference for creating
our workarounds until it IS officially supported.
