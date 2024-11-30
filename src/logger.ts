import { QuickDB } from "quick.db";
import { client } from "./index.js";
import { APIRole, AuditLogEvent, Guild, GuildAuditLogsEntry, GuildBasedChannel, TextBasedChannel, TextChannel, Webhook } from "discord.js";

import { setTimeout } from "timers/promises";

const db = new QuickDB({ filePath: '../data/settings.sqlite' });

export async function get(guild: Guild) {
    let settings = await db.get(`${guild.id}_config`);
    if (!settings) {
        settings = {
            ...settings,
            guildId: guild.id,
            channel: null,
            startingCase: 0,
            style: 0,
            roles: [],
            cases: []
        }
        await db.set(`${guild.id}_config`, settings);
    }
    return settings;
};

export async function reset(guild: Guild) {
    let settings = await db.delete(`${guild.id}_config`);
    return settings;
};

export async function findWebhook(channel: TextChannel) {
    const webhooks = await channel.fetchWebhooks().catch(() => undefined);
    let webhook = webhooks?.find((wh : Webhook) => wh.token);
    if (!webhook) {
        const newwebhook = channel.createWebhook({
            name: client.user?.username || "Watcher",
            avatar: client.user?.displayAvatarURL({ extension: "png", size: 1024 }),
            reason: `Creating logging webhook`
        }).catch(() => undefined);
        return newwebhook;
    }
    else return webhook;
}

export async function set(guild: Guild, roles?: Array<String>, channel?: String, startingCase?: Number, style?: Number, caseInfo?: { casetype: string, messageId: string, target?: string, reason?: string, moderator?: string, role?: string }, updateCase?: Number) {
    const settings = await get(guild);
    if (roles) settings.roles = roles;
    if (channel) settings.channel = channel;
    if (startingCase && settings.startingCase > -1) settings.startingCase = startingCase;
    if (style) settings.style = style;
    if (caseInfo) {
        if (updateCase) {
            const thecase = settings.cases.at(updateCase);
            if (!thecase) settings.cases.push(caseInfo);
            else {
                thecase.reason = caseInfo.reason,
                thecase.moderator = caseInfo.moderator
            }
        }
        else settings.cases.push(caseInfo);
    }
    await db.set(`${guild.id}_config`, settings);
}

client.on(`guildAuditLogEntryCreate`, async (entry: GuildAuditLogsEntry, guild: Guild) => {
    const settings = await get(guild);

    if (settings.channel) {
        if (entry.action == AuditLogEvent.MemberRoleUpdate) {
            const roles = entry.changes;

            let channel = await guild.channels.fetch(settings.channel).catch(() => console.log(`[Error] Unknown channel.`)); if (!channel) return;
            const webhook = await findWebhook(channel as TextChannel);

            for (let changeIndex in entry.changes) {
                for (let addIndex in entry.changes[changeIndex]?.new as any) {
                    if (entry.changes[changeIndex]?.key == "$add") {
                        const role = await guild.roles.fetch(entry.changes[changeIndex].new?.at(0)?.id as string).catch(() => undefined);

                        if (settings.roles.includes(role?.id)) {
                            const target = await client.users.fetch(entry.targetId as string).catch(() => undefined);
                            const executer = await client.users.fetch(entry.executorId as string).catch(() => undefined);
                            if (target) {
                                await webhook?.send({ username: (client.user?.username || "Watcher"), avatarURL: client.user?.displayAvatarURL({ extension: "png", size: 1024 }), content: `**Special role added** | Case ${settings.cases.length}\n**User:** ${target?.tag || `Unknown`} (${entry.targetId}) (${target || `?`})\n**Role:** ${role?.name} (${role?.id}) \n**Reason:** ${entry.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] }})
                                .then(async msg => {
                                    await set(guild, undefined, undefined, -1, undefined, { casetype: `Special role added`, messageId: msg.id, target: target?.id, reason: entry.reason || undefined, moderator: executer?.id, role: role?.id});
                                })
                            }
                        }
                    }
                    if (entry.changes[changeIndex]?.key == "$remove") {
                        const role = await guild.roles.fetch(entry.changes[changeIndex].new?.at(0)?.id as string).catch(() => undefined);

                        if (settings.roles.includes(role?.id)) {
                            const target = await client.users.fetch(entry.targetId as string).catch(() => undefined);
                            const executer = await client.users.fetch(entry.executorId as string).catch(() => undefined);
                            if (target) await webhook?.send({ username: (client.user?.username || "Watcher"), avatarURL: client.user?.displayAvatarURL({ extension: "png", size: 1024 }), content: `**Special role removed** | Case ${settings.cases.length}\n**User:** ${target?.tag || `Unknown`} (${entry.targetId}) (${target || `?`})\n**Role:** ${role?.name} (${role?.id}) \n**Reason:** ${entry.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] }})
                            .then(async msg => {
                                await set(guild, undefined, undefined, -1, undefined, { casetype: `Special role removed`, messageId: msg.id, target: target?.id, reason: entry.reason || undefined, moderator: executer?.id, role: role?.id });
                            })
                        }
                    }
                }

            }
        } else if (entry.action === AuditLogEvent.MemberBanAdd) {

            let channel = await guild.channels.fetch(settings.channel).catch(() => console.log(`[Error] Unknown channel.`)); if (!channel) return;
            const webhook = await findWebhook(channel as TextChannel);

            const target = await client.users.fetch(entry.targetId as string).catch(() => undefined);
            const executer = await client.users.fetch(entry.executorId as string).catch(() => undefined);
            if (target) {
                await webhook?.send({ username: (client.user?.username || "Watcher"), avatarURL: client.user?.displayAvatarURL({ extension: "png", size: 1024 }), content: `**Ban** | Case ${settings.cases.length}\n**User:** ${target?.tag || `Unknown`} (${entry.targetId}) (${target || `?`})\n**Reason:** ${entry.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] }})
                .then(async msg => {
                    await set(guild, undefined, undefined, -1, undefined, { casetype: `Ban`, messageId: msg.id, target: target?.id, reason: entry.reason || undefined, moderator: executer?.id});
                })
            }
        } else if (entry.action === AuditLogEvent.MemberBanRemove) {

            let channel = await guild.channels.fetch(settings.channel).catch(() => console.log(`[Error] Unknown channel.`)); if (!channel) return;
            const webhook = await findWebhook(channel as TextChannel);

            const target = await client.users.fetch(entry.targetId as string).catch(() => undefined);
            const executer = await client.users.fetch(entry.executorId as string).catch(() => undefined);
            if (target) {
                await webhook?.send({ username: (client.user?.username || "Watcher"), avatarURL: client.user?.displayAvatarURL({ extension: "png", size: 1024 }), content: `**Unban** | Case ${settings.cases.length}\n**User:** ${target?.tag || `Unknown`} (${entry.targetId}) (${target || `?`})\n**Reason:** ${entry.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] }})
                .then(async msg => {
                    await set(guild, undefined, undefined, -1, undefined, { casetype: `Unban`, messageId: msg.id, target: target?.id, reason: entry.reason || undefined, moderator: executer?.id});
                })
            }
        } else if (entry.action === AuditLogEvent.MemberKick) {

            let channel = await guild.channels.fetch(settings.channel).catch(() => console.log(`[Error] Unknown channel.`)); if (!channel) return;
            const webhook = await findWebhook(channel as TextChannel);

            const target = await client.users.fetch(entry.targetId as string).catch(() => undefined);
            const executer = await client.users.fetch(entry.executorId as string).catch(() => undefined);
            if (target) {
                await webhook?.send({ username: (client.user?.username || "Watcher"), avatarURL: client.user?.displayAvatarURL({ extension: "png", size: 1024 }), content: `**Kick** | Case ${settings.cases.length}\n**User:** ${target?.tag || `Unknown`} (${entry.targetId}) (${target || `?`})\n**Reason:** ${entry.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] }})
                .then(async msg => {
                    await set(guild, undefined, undefined, -1, undefined, { casetype: `Kick`, messageId: msg.id, target: target?.id, reason: entry.reason || undefined, moderator: executer?.id});
                })
            }
        }
        
    }
});