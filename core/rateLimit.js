function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// يغلف أي عملية ديسكورد، وإذا صار rate limit ينتظر ويعيد المحاولة
async function withBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err && err.status === 429) {
      const wait = (err.retryAfter || 5) * 1000;
      await sleep(wait);
      return await fn();
    }
    throw err;
  }
}

module.exports = { sleep, withBackoff };