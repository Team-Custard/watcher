import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder, Guild, Interaction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageActionRowComponentBuilder, APIActionRowComponent, APIMessageActionRowComponent, ButtonInteraction, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, messageLink } from "discord.js";

import { client } from "./index.js";
import * as logger from "./logger.js"

const commands = [
    new SlashCommandBuilder()
    .setName('config')
    .setDescription("Configures the bot.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
    .setName('set_reason')
    .setDescription("Sets the reason for an entry.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(number => number
        .setName("entry")
        .setDescription("The entry to set. You can use \"latest\" or \"l\" for the latest case.")
        .setRequired(true)
    )
    .addStringOption(string => string
        .setName("reason")
        .setDescription("The new reason for the entry")
        .setRequired(true)
    ),
    new SlashCommandBuilder()
    .setName("recall")
    .setDescription("Gives info on a previously posted case.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(number => number
        .setName("entry")
        .setDescription("The entry to set. You can use \"latest\" or \"l\" for the latest case.")
        .setRequired(true)
    ),
    new SlashCommandBuilder()
    .setName('reset')
    .setDescription("Deletes the bot config and all cases captured by the bot.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];

client.application?.commands.set(commands).then(() => console.log(`[notice] Registered and updated commands.`)).catch((e) => console.error(`[error] Failed to register commands.`, e));


client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu()) {
        const customId = interaction.customId?.split('-')
        if (interaction.user.id != customId[1]) return interaction.reply({ content: `Not your message.`, ephemeral: true });
        await interaction.deferUpdate();
        if (customId[0] == "trackedRoles") {
            const settings = await logger.get(interaction.guild as Guild);

            const roles = interaction.values;

            await logger.set(interaction.guild as Guild, roles);

            const embed = new EmbedBuilder()
            .setTitle(`${client.user?.username} config`)
            .setDescription(`**Tracked roles:** ${roles.map((r : string) => interaction.guild?.roles?.cache.get(r)?.toString() || `<@&${r}>`)}\n`+
            `**Log channel:** ${interaction.guild?.channels.cache.get(settings.channel)?.toString() || "none"}\n`+
            `**Style:** ${settings.style || "0"}`)
            .setColor("Random")
            .setThumbnail(client.user?.displayAvatarURL({ size: 1024 }) || "")
            .setTimestamp(new Date());

            const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel("Tracked roles")
                .setCustomId(`trackedRolesBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                .setLabel("Log channel")
                .setCustomId(`logChannelBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                .setLabel("Log style")
                .setCustomId(`logstyleBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                .setLabel("Done")
                .setCustomId(`doneBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Success),
            )

            interaction.editReply({ embeds: [embed], components: [actionRow] });
        }
        else if (customId[0] == "logChannel") {
            const settings = await logger.get(interaction.guild as Guild);

            const channel = interaction.values[0];

            await logger.set(interaction.guild as Guild, undefined, channel);

            const embed = new EmbedBuilder()
            .setTitle(`${client.user?.username} config`)
            .setDescription(`**Tracked roles:** ${settings.roles.map((r : string) => interaction.guild?.roles?.cache.get(r)?.toString() || `<@&${r}>`)}\n`+
            `**Log channel:** ${interaction.guild?.channels.cache.get(channel)?.toString() || "none"}\n`+
            `**Style:** Coming soon`)
            .setColor("Random")
            .setThumbnail(client.user?.displayAvatarURL({ size: 1024 }) || "")
            .setTimestamp(new Date());

            const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
                new ButtonBuilder()
                .setLabel("Tracked roles")
                .setCustomId(`trackedRolesBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                .setLabel("Log channel")
                .setCustomId(`logChannelBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                .setLabel("Log style")
                .setCustomId(`logstyleBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
                new ButtonBuilder()
                .setLabel("Done")
                .setCustomId(`doneBtn-${interaction.user.id}`)
                .setStyle(ButtonStyle.Success),
            )

            interaction.editReply({ embeds: [embed], components: [actionRow] });
        }
    }

    if (interaction.isButton()) {
        const customId = interaction.customId?.split('-')
        if (interaction.user.id != customId[1]) return interaction.reply({ content: `Not your message.`, ephemeral: true });
        await interaction.deferUpdate();
        if (customId[0] == "doneBtn") {
            interaction.deleteReply();
        }
        else if (customId[0] == "trackedRolesBtn") {
            const settings = await logger.get(interaction.guild as Guild);

            const embed = new EmbedBuilder()
            .setTitle(`Tracked roles`)
            .setDescription("Choose the roles that should be tracked.")
            .setColor("Random");

            const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
                new RoleSelectMenuBuilder()
                .setCustomId(`trackedRoles-${interaction.user.id}`)
                .setDefaultRoles(settings.roles)
                .setMaxValues(16)
            )

            await interaction.editReply({ embeds: [embed], components: [actionRow] });
        }
        else if (customId[0] == "logChannelBtn") {
            const settings = await logger.get(interaction.guild as Guild);

            const embed = new EmbedBuilder()
            .setTitle(`Logging channel`)
            .setDescription("Choose the channel that logs should be tracked in.")
            .setColor("Random");

            const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
                new ChannelSelectMenuBuilder()
                .setChannelTypes(ChannelType.GuildText)
                .setCustomId(`logChannel-${interaction.user.id}`)
                .setMaxValues(1)
            )

            await interaction.editReply({ embeds: [embed], components: [actionRow] });
        }
    }
})

client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.command?.name == "config") {
        await interaction.deferReply({ ephemeral: false })
        const settings = await logger.get(interaction.guild as Guild);

        const embed = new EmbedBuilder()
        .setTitle(`${client.user?.username} config`)
        .setDescription(`**Tracked roles:** ${settings.roles.map((r : string) => interaction.guild?.roles?.cache.get(r)?.toString() || `<@&${r}>`)}\n`+
        `**Log channel:** ${interaction.guild?.channels.cache.get(settings.channel)?.toString() || "none"}\n`+
        `**Style:** Coming soon`)
        .setColor("Random")
        .setThumbnail(client.user?.displayAvatarURL({ size: 1024 }) || "")
        .setTimestamp(new Date());

        const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
            new ButtonBuilder()
            .setLabel("Tracked roles")
            .setCustomId(`trackedRolesBtn-${interaction.user.id}`)
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setLabel("Log channel")
            .setCustomId(`logChannelBtn-${interaction.user.id}`)
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setLabel("Log style")
            .setCustomId(`logstyleBtn-${interaction.user.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
            new ButtonBuilder()
            .setLabel("Done")
            .setCustomId(`doneBtn-${interaction.user.id}`)
            .setStyle(ButtonStyle.Success),
        )

        interaction.followUp({ embeds: [embed], ephemeral: true, components: [actionRow] });
    }
    else if (interaction.command?.name == "recall") {
        await interaction.deferReply({ ephemeral: false })
        const settings = await logger.get(interaction.guild as Guild);

        let caseid = await interaction.options.getString("entry");
        if (caseid?.toLowerCase() == "l" || caseid?.toLowerCase() == "latest") caseid = (settings.cases.length-1).toString();
        const reason = settings.cases.at(caseid);
        if (!reason) return interaction.followUp(`Case not found.`)
        
        const target = await client.users.fetch(reason.target as string).catch(() => undefined);
        const executer = await client.users.fetch(reason.moderator as string).catch(() => undefined);

        if (reason.role) {
            const role = await interaction.guild?.roles.fetch(reason.role as string).catch(() => undefined);
            interaction.followUp({ content: `**${reason.casetype}** | Case ${caseid}\n**User:** ${target?.tag || `Unknown`} (${target?.id}) (${target || `?`})\n**Role:** ${role?.name} (${role?.id}) \n**Reason:** ${reason.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] } })
        } else {
            interaction.followUp({ content: `**${reason.casetype}** | Case ${caseid}\n**User:** ${target?.tag || `Unknown`} (${target?.id}) (${target || `?`})\n**Reason:** ${reason.reason || `*No reason specified. Use ${`</set_reason:${client.application?.commands.cache.find(c => c.name == "set_reason")?.id}>` || `/set_reason`}  to set a reason.*`}\n**Responsible moderator:** ${executer?.tag || `Unknown`}`, allowedMentions: { parse: [] } })
        }
    } else if (interaction.command?.name == "reset") {
        await interaction.deferReply({ ephemeral: false });
        await logger.reset(interaction.guild as Guild);
        interaction.followUp(`Reset the configuration.`);
    }
    else interaction.reply({ content: `Command not implemented yet. Coming soon:tm: :^)`, ephemeral: true })
});