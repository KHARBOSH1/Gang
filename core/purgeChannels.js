const { withBackoff } = require("./rateLimit");
const { runQueue } = require("./queue");
const { logError } = require("../utils/logger");

async function purgeChannels(guild, delayMs, keepChannelId, maxDeletes, onProgress) {
  const channels = await guild.channels.fetch();

  let list = [];
  channels.forEach((channel) => {
    if (!channel) return;
    if (keepChannelId && channel.id === keepChannelId) return;
    list.push(channel);
  });

  if (maxDeletes && list.length > maxDeletes) {
    list = list.slice(0, maxDeletes);
  }

  const total = list.length;
  let deleted = 0;
  let failed = 0;
  let processed = 0;
  const errorMessages = [];

  const tasks = [];

  for (const channel of list) {
    tasks.push(async () => {
      processed++;
      try {
        await withBackoff(() => channel.delete("purge"));
        deleted++;
      } catch (err) {
        failed++;
        const msg = `فشل حذف القناة ${channel.name} (${channel.id}) في ${guild.name}: ${err.message}`;
        logError(msg);
        errorMessages.push(msg);
      }

      if (onProgress && processed % 25 === 0) {
        await onProgress(processed, total);
      }
    });
  }

  await runQueue(tasks, delayMs);

  if (onProgress && processed > 0 && processed % 25 !== 0) {
    await onProgress(processed, total);
  }

  return { deleted, failed, total, errorMessages };
}

module.exports = { purgeChannels };