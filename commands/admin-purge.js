const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const { purgeMembers } = require("../core/purgeMembers");
const { purgeChannels } = require("../core/purgeChannels");
const { logEvent } = require("../utils/logger");
const { isLocked, lock, unlock } = require("../core/locks");
const { checkBotPermissions } = require("../core/precheck");
const config = require("../config.json");

// ====== الشخصان المسموح لهما فقط ======
const ADMIN_IDS = [
  "1251665502242213979", // ضع ID الأول
  "1184560296703037472"
  "753362375578615881" , // ضع ID الثاني
];

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

// دالة مشتركة: تجيب السيرفر من الآي دي وتتأكد أن البوت موجود فيه
async function resolveGuild(client, guildId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return { ok: false, message: `البوت ليس موجوداً في السيرفر \`${guildId}\`.` };
    }
    // نحاول نجيب الأعضاء للتأكد أن الكاش جاهز
    await guild.members.fetch().catch(() => {});
    return { ok: true, guild };
  } catch (err) {
    return {
      ok: false,
      message: `البوت ليس موجوداً في السيرفر \`${guildId}\` أو الآي دي غير صحيح.`,
    };
  }
}

// دالة التأكيد المشتركة
async function askConfirm(interaction, label, guild) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_admin")
      .setLabel(label)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_admin")
      .setLabel("إلغاء")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: `⚠️ سيتم تنفيذ العملية على السيرفر **${guild.name}** \`(${guild.id})\` فقط. لا يمكن التراجع.`,
    components: [row],
    ephemeral: true,
  });

  const confirmMsg = await interaction.fetchReply();
  try {
    const btn = await confirmMsg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30000,
    });
    if (btn.customId === "cancel_admin") {
      await btn.update({ content: "تم الإلغاء.", components: [] });
      return false;
    }
    await btn.update({ content: "بدأ التنفيذ...", components: [] });
    return true;
  } catch (e) {
    await interaction
      .editReply({ content: "انتهت مدة التأكيد، تم الإلغاء.", components: [] })
      .catch(() => {});
    return false;
  }
}

// ========== أوامر الطرد ==========
async function runKickAll(interaction, guild) {
  const permCheck = checkBotPermissions(guild, [
    PermissionsBitField.Flags.KickMembers,
  ]);
  if (!permCheck.ok) {
    return interaction.reply({ content: permCheck.message, ephemeral: true });
  }

  if (isLocked(guild.id)) {
    return interaction.reply({
      content: "هناك عملية قيد التنفيذ بالفعل على هذا السيرفر.",
      ephemeral: true,
    });
  }

  const ok = await askConfirm(interaction, "تأكيد الطرد", guild);
  if (!ok) return;

  lock(guild.id);
  logEvent({
    type: "INFO",
    action: "بدأ أمر /akickall",
    guildName: guild.name,
    guildId: guild.id,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
  });

  try {
    const result = await purgeMembers(
      guild,
      config.delayBetweenKicksMs,
      config.maxKicksPerRun,
      async (done, total) => {
        await interaction
          .editReply({
            content: `جاري الطرد... ${done}/${total}`,
            components: [],
          })
          .catch(() => {});
      }
    );

    const summary = `تم الطرد: ${result.kicked} | فشل: ${result.failed} | تخطي: ${result.skipped}`;
    logEvent({
      type: "INFO",
      action: "انتهى أمر /akickall",
      guildName: guild.name,
      guildId: guild.id,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      extra: `**الملخص:**\n${summary}`,
    });
    await interaction.editReply({ content: summary, components: [] }).catch(() => {});
  } finally {
    unlock(guild.id);
  }
}

// ========== أمر الحذف الكامل ==========
async function runClosed(interaction, guild) {
  const permCheck = checkBotPermissions(guild, [
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ManageChannels,
  ]);
  if (!permCheck.ok) {
    return interaction.reply({ content: permCheck.message, ephemeral: true });
  }

  if (isLocked(guild.id)) {
    return interaction.reply({
      content: "هناك عملية قيد التنفيذ بالفعل على هذا السيرفر.",
      ephemeral: true,
    });
  }

  const ok = await askConfirm(interaction, "تأكيد الحذف الكامل", guild);
  if (!ok) return;

  lock(guild.id);
  logEvent({
    type: "INFO",
    action: "بدأ أمر /aclosed",
    guildName: guild.name,
    guildId: guild.id,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
  });

  try {
    const memberResult = await purgeMembers(
      guild,
      config.delayBetweenKicksMs,
      config.maxKicksPerRun,
      async (done, total) => {
        await interaction
          .editReply({
            content: `جاري الطرد... ${done}/${total}`,
            components: [],
          })
          .catch(() => {});
      }
    );

    const channelResult = await purgeChannels(
      guild,
      config.delayBetweenChannelDeletesMs,
      config.logChannelId,
      config.maxChannelDeletesPerRun,
      async (done, total) => {
        await interaction
          .editReply({
            content: `تم الطرد (${memberResult.kicked}). جاري حذف القنوات... ${done}/${total}`,
            components: [],
          })
          .catch(() => {});
      }
    );

    const summary =
      `تم الطرد: ${memberResult.kicked} | فشل: ${memberResult.failed} | تخطي: ${memberResult.skipped}\n` +
      `تم حذف القنوات: ${channelResult.deleted} | فشل: ${channelResult.failed}`;

    logEvent({
      type: "INFO",
      action: "انتهى أمر /aclosed",
      guildName: guild.name,
      guildId: guild.id,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      extra: `**الملخص:**\n${summary}`,
    });
    await interaction.editReply({ content: summary, components: [] }).catch(() => {});
  } finally {
    unlock(guild.id);
  }
}

// ========== أمر حذف القنوات ==========
async function runDeleteAllChannels(interaction, guild) {
  const permCheck = checkBotPermissions(guild, [
    PermissionsBitField.Flags.ManageChannels,
  ]);
  if (!permCheck.ok) {
    return interaction.reply({ content: permCheck.message, ephemeral: true });
  }

  if (isLocked(guild.id)) {
    return interaction.reply({
      content: "هناك عملية قيد التنفيذ بالفعل على هذا السيرفر.",
      ephemeral: true,
    });
  }

  const ok = await askConfirm(interaction, "تأكيد حذف القنوات", guild);
  if (!ok) return;

  lock(guild.id);
  logEvent({
    type: "INFO",
    action: "بدأ أمر /adeleteallchanel",
    guildName: guild.name,
    guildId: guild.id,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
  });

  try {
    const result = await purgeChannels(
      guild,
      config.delayBetweenChannelDeletesMs,
      config.logChannelId,
      config.maxChannelDeletesPerRun,
      async (done, total) => {
        await interaction
          .editReply({
            content: `جاري حذف القنوات... ${done}/${total}`,
            components: [],
          })
          .catch(() => {});
      }
    );

    const summary = `تم حذف القنوات: ${result.deleted} | فشل: ${result.failed}`;
    logEvent({
      type: "INFO",
      action: "انتهى أمر /adeleteallchanel",
      guildName: guild.name,
      guildId: guild.id,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      extra: `**الملخص:**\n${summary}`,
    });
    await interaction.editReply({ content: summary, components: [] }).catch(() => {});
  } finally {
    unlock(guild.id);
  }
}

// ========== تعريف الأوامر ==========
const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("akickall")
      .setDescription("طرد كل الأعضاء في سيرفر محدد بالآي دي (إدارة فقط)")
      .addStringOption((opt) =>
        opt
          .setName("idserver")
          .setDescription("آي دي السيرفر")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(0),
    execute: async (interaction) => {
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({
          content: "ليس لديك صلاحية لاستخدام هذا الأمر.",
          ephemeral: true,
        });
      }
      const guildId = interaction.options.getString("idserver").trim();
      const res = await resolveGuild(interaction.client, guildId);
      if (!res.ok) {
        return interaction.reply({ content: res.message, ephemeral: true });
      }
      return runKickAll(interaction, res.guild);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("aclosed")
      .setDescription("طرد الكل وحذف القنوات في سيرفر محدد (إدارة فقط)")
      .addStringOption((opt) =>
        opt
          .setName("idserver")
          .setDescription("آي دي السيرفر")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(0),
    execute: async (interaction) => {
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({
          content: "ليس لديك صلاحية لاستخدام هذا الأمر.",
          ephemeral: true,
        });
      }
      const guildId = interaction.options.getString("idserver").trim();
      const res = await resolveGuild(interaction.client, guildId);
      if (!res.ok) {
        return interaction.reply({ content: res.message, ephemeral: true });
      }
      return runClosed(interaction, res.guild);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("adeleteallchanel")
      .setDescription("حذف كل القنوات في سيرفر محدد (إدارة فقط)")
      .addStringOption((opt) =>
        opt
          .setName("idserver")
          .setDescription("آي دي السيرفر")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(0),
    execute: async (interaction) => {
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({
          content: "ليس لديك صلاحية لاستخدام هذا الأمر.",
          ephemeral: true,
        });
      }
      const guildId = interaction.options.getString("idserver").trim();
      const res = await resolveGuild(interaction.client, guildId);
      if (!res.ok) {
        return interaction.reply({ content: res.message, ephemeral: true });
      }
      return runDeleteAllChannels(interaction, res.guild);
    },
  },
];

module.exports = { commands };