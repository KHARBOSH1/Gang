const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
} = require("discord.js");
const { isAllowed } = require("../utils/permissions");
const { purgeMembers } = require("../core/purgeMembers");
const { purgeChannels } = require("../core/purgeChannels");
const { logEvent } = require("../utils/logger");
const { isLocked, lock, unlock } = require("../core/locks");
const { ensureGuild, checkBotPermissions } = require("../core/precheck");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("closed")
    .setDescription("طرد جميع الأعضاء وحذف جميع القنوات في هذا السيرفر فقط")
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    const guildCheck = ensureGuild(interaction);
    if (!guildCheck.ok) {
      return interaction.reply({ content: guildCheck.message, ephemeral: true });
    }

    if (!isAllowed(interaction.user.id)) {
      return interaction.reply({
        content: "ليس لديك صلاحية لاستخدام هذا الأمر.",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;

    if (isLocked(guild.id)) {
      return interaction.reply({
        content: "هناك عملية قيد التنفيذ بالفعل على هذا السيرفر.",
        ephemeral: true,
      });
    }

    const permCheck = checkBotPermissions(guild, [
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.ManageChannels,
    ]);
    if (!permCheck.ok) {
      return interaction.reply({ content: permCheck.message, ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_closed")
        .setLabel("تأكيد الحذف")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_closed")
        .setLabel("إلغاء")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: `⚠️ سيتم طرد الأعضاء وحذف القنوات في **${guild.name}** فقط. هذا الإجراء لا يمكن التراجع عنه.`,
      components: [row],
      ephemeral: true,
    });

    const confirmMsg = await interaction.fetchReply();

    try {
      const btn = await confirmMsg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30000,
      });

      if (btn.customId === "cancel_closed") {
        return btn.update({ content: "تم الإلغاء.", components: [] });
      }

      await btn.update({ content: "بدأ التنفيذ...", components: [] });
    } catch (e) {
      return interaction.editReply({
        content: "انتهت مدة التأكيد، تم الإلغاء.",
        components: [],
      });
    }

    lock(guild.id);
    logEvent({
      type: "INFO",
      action: "بدأ أمر /closed",
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
        action: "انتهى أمر /closed",
        guildName: guild.name,
        guildId: guild.id,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        extra: `**الملخص:**\n${summary}`,
      });

      await interaction
        .editReply({ content: summary, components: [] })
        .catch(() => {});
    } finally {
      unlock(guild.id);
    }
  },
};