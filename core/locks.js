const activeGuilds = new Set();

function isLocked(guildId) {
  return activeGuilds.has(guildId);
}

function lock(guildId) {
  activeGuilds.add(guildId);
}

function unlock(guildId) {
  activeGuilds.delete(guildId);
}

module.exports = { isLocked, lock, unlock };