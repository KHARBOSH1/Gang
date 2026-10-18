let logChannelId = "1491765751848370318";
let discordClient = null;

function initLogger(client) {
  discordClient = client;
}

function ts() {
  return new Date().toISOString();
}

function formatBlock(lines) {
  return lines.join("\n");
}

function logInfo(msg) {
  console.log(`[INFO] ${msg}`);
  sendToLogChannel(`🟢 **[INFO]** ${msg}`);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
  sendToLogChannel(`🔴 **[ERROR]** ${msg}`);
}

// رسالة لوق مخصصة بتفاصيل كاملة
function logEvent({
  type = "INFO",
  action,
  guildName,
  guildId,
  userId,
  userTag,
  extra,
}) {
  const lines = [
    `${type === "ERROR" ? "🔴" : type === "WARN" ? "🟡" : "🟢"} **[${type}] ${action}**`,
    `**السيرفر:** ${guildName || "غير معروف"} \`(${guildId || "?"})\``,
    `**المستخدم:** ${userTag || "غير معروف"} \`(${userId || "?"})\``,
  ];
  if (extra) lines.push(extra);
  lines.push(`**الوقت:** ${ts()}`);

  const text = formatBlock(lines);
  console.log(`[${type}] ${action} | ${guildName} | ${userTag}`);
  sendToLogChannel(text);
}

async function sendToLogChannel(text) {
  if (!discordClient || !logChannelId) return;
  try {
    const channel = await discordClient.channels.fetch(logChannelId);
    if (channel && channel.isTextBased()) {
      await channel.send(text.slice(0, 1900));
    }
  } catch (err) {
    // نتجاهل أخطاء اللوق عشان ما نعلقش البوت
  }
}

module.exports = { initLogger, logInfo, logError, logEvent };