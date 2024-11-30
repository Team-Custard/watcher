import { ActivityType, Client, GatewayIntentBits, Options, PresenceUpdateStatus } from "discord.js";
import dotenv from "dotenv";

dotenv.config({
    path: '../.env'
})

export const client = new Client({
    intents: [
        GatewayIntentBits.GuildModeration,
    ],
    sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
            interval: 3_600, // Every hour.
            lifetime: 1_800, // Remove messages older than 30 minutes
        },
        users: {
			interval: 3_600, // Every hour.
			filter: () => user => user.bot && user.id !== user.client.user.id, // Remove all bots.
		},
    }
});

await client.login(process.env["token"]);

client.once("ready", async (client: Client) => {
    await import('./logger.js');
    await import('./commands.js');

    console.log(`[Ready] Logged into ${client.user?.tag} (${client.user?.id})`)
    client.user?.setPresence({
        status: PresenceUpdateStatus.Online,
        activities: [{
            type: ActivityType.Watching,
            name: "the logs"
        }, {
            type: ActivityType.Listening,
            name: "modlog"
        }, {
            type: ActivityType.Playing,
            name: "🕙"
        }]
    });
});


