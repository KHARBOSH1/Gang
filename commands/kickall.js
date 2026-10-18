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
const { logEvent } = require("../utils/logger");
const { isLocked, lock, unlock } = require("../core/locks");
const { ensureGuild, checkBotPermissions } = require("../core/precheck");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kickall")
    .setDescription("طرد جميع الأعضاء في هذا السيرفر فقط")
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
    ]);
    if (!permCheck.ok) {
      return interaction.reply({ content: permCheck.message, ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_kickall")
        .setLabel("تأكيد الطرد")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_kickall")
        .setLabel("إلغاء")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: `⚠️ سيتم طرد الأعضاء في **${guild.name}** فقط.`,
      components: [row],
      ephemeral: true,
    });

    const confirmMsg = await interaction.fetchReply();

    try {
      const btn = await confirmMsg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30000,
      });

      if (btn.customId === "cancel_kickall") {
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
      action: "بدأ أمر /kickall",
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
        action: "انتهى أمر /kickall",
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