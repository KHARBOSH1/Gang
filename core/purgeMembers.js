const { withBackoff } = require("./rateLimit");
const { runQueue } = require("./queue");
const { logInfo, logError } = require("../utils/logger");

async function purgeMembers(guild, delayMs, maxKicks, onProgress) {
  const members = await guild.members.fetch();
  const botMember = guild.members.me;

  let targets = members.filter(
    (m) => !m.user.bot && m.id !== guild.ownerId && m.id !== botMember.id
  );

  // تطبيق الحد الأقصى
  if (maxKicks && targets.size > maxKicks) {
    targets = targets.first(maxKicks);
  }

  const total = targets.size;
  let kicked = 0;
  let failed = 0;
  let skipped = 0;
  let processed = 0;

  const tasks = targets.map((member) => async () => {
    processed++;

    if (member.roles.highest.position >= botMember.roles.highest.position) {
      skipped++;
      logInfo(
        `تخطي طرد ${member.user.tag} في ${guild.name}: الرتبة مرتفعة جدًا`
      );
    } else {
      try {
        await withBackoff(() => member.kick("purge"));
        kicked++;
        logInfo(`تم طرد ${member.user.tag} من ${guild.name}`);
      } catch (err) {
        failed++;
        logError(
          `فشل طرد ${member.user.tag} من ${guild.name}: ${err.message}`
        );
      }
    }

    // إشعار حي كل 10 عمليات
    if (onProgress && (processed % 10 === 0 || processed === total)) {
      await onProgress(processed, total);
    }
  });

  await runQueue(tasks, delayMs);
  return { kicked, failed, skipped, total };
}

module.exports = { purgeMembers };