const { sleep } = require("./rateLimit");

// ينفذ مهام واحدة واحدة مع تأخير بين كل مهمة
async function runQueue(tasks, delayMs) {
  for (const task of tasks) {
    try {
      await task();
    } catch (err) {
      // نتجاهل الخطأ ونكمل
    }
    await sleep(delayMs);
  }
}

module.exports = { runQueue };