const { SlashCommandBuilder } = require("discord.js");
const { isAllowed } = require("../utils/permissions");
const { purgeMembers } = require("../core/purgeMembers");
const { purgeChannels } = require("../core/purgeChannels");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("طرد كل الأعضاء وحذف كل الرومات (للمسؤولين فقط)")
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    if (!isAllowed(interaction.user.id)) {
      return interaction.reply({
        content: "ما عندك صلاحية تنفيذ هذا الأمر.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: "بدأ التنفيذ... راح يستغرق وقت.",
      ephemeral: true,
    });

    const guild = interaction.guild;

    const memberResult = await purgeMembers(
      guild,
      config.delayBetweenKicksMs
    );

    const channelResult = await purgeChannels(
      guild,
      config.delayBetweenChannelDeletesMs,
      config.logChannelId
    );

    const summary =
      `تم الطرد: ${memberResult.kicked} | فشل: ${memberResult.failed}\n` +
      `تم الحذف: ${channelResult.deleted} | فشل: ${channelResult.failed}`;

    await interaction.followUp({ content: summary, ephemeral: true });
  },
};