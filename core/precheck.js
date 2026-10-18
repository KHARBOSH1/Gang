const { PermissionsBitField } = require("discord.js");

// يتأكد أن الأمر انكتب داخل سيرفر وليس في DM
function ensureGuild(interaction) {
  if (!interaction.guild) {
    return { ok: false, message: "هذا الأمر يعمل فقط داخل السيرفر." };
  }
  return { ok: true };
}

// يتأكد أن البوت يملك الصلاحيات المطلوبة
function checkBotPermissions(guild, required) {
  const me = guild.members.me;
  const missing = [];

  for (const perm of required) {
    if (!me.permissions.has(perm)) {
      missing.push(perm);
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      message: `البوت ينقصه الصلاحيات التالية: ${missing.join(", ")}. أضفها ثم أعد المحاولة.`,
    };
  }
  return { ok: true };
}

module.exports = { ensureGuild, checkBotPermissions, PermissionsBitField };