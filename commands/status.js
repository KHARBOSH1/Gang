const { SlashCommandBuilder } = require("discord.js");
const { isAllowed } = require("../utils/permissions");
const { isLocked } = require("../core/locks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("حالة البوت والسيرفر الحالي")
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "هذا الأمر يعمل فقط داخل السيرفر.",
        ephemeral: true,
      });
    }

    if (!isAllowed(interaction.user.id)) {
      return interaction.reply({
        content: "ليس لديك صلاحية لاستخدام هذا الأمر.",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const busy = isLocked(guild.id);

    const text =
      `**السيرفر:** ${guild.name}\n` +
      `**عدد السيرفرات التي فيها البوت:** ${interaction.client.guilds.cache.size}\n` +
      `**حالة السيرفر الحالي:** ${busy ? "عملية قيد التنفيذ" : "لا توجد عملية"}`;

    await interaction.reply({ content: text, ephemeral: true });
  },
};