const { logEvent } = require("../utils/logger");

const badWords = ["كسم", "كسمك","قحبه","متناكه","شرموطه","متناكة","شرموطة", "قحبة", "كحبة","كحبه","ابن المتناكة","ابن المتناكه","ابن متناكة","ابن متناكه",];

async function checkBadWords(message) {
  const content = message.content.toLowerCase();
  const found = badWords.some((word) => content.includes(word.toLowerCase()));
  if (!found) return;

  const guild = message.guild;
  const target = message.member;
  const botMember = guild.members.me;

  if (!target) return;

  const baseInfo = {
    guildName: guild.name,
    guildId: guild.id,
    userId: target.id,
    userTag: target.user.tag,
  };

  if (target.roles.highest.position >= botMember.roles.highest.position) {
    logEvent({
      type: "WARN",
      action: "تخطي حظر بسبب كلمة محظورة (الرتبة أعلى من البوت)",
      ...baseInfo,
      extra: `**الكلمة:** ||${message.content}||`,
    });
    return;
  }

  try {
    await target.ban({ reason: "استخدام كلمات محظورة" });
    await message.delete().catch(() => {});
    logEvent({
      type: "INFO",
      action: "حظر بسبب كلمة محظورة",
      ...baseInfo,
      extra: `**الرسالة:** ||${message.content}||`,
    });
  } catch (err) {
    logEvent({
      type: "ERROR",
      action: "فشل حظر بسبب كلمة محظورة",
      ...baseInfo,
      extra: `**السبب:** ${err.message}`,
    });
  }
}

module.exports = { checkBadWords };
