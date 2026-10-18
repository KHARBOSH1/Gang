const config = require("../config.json");

function isAllowed(userId) {
  return config.allowedUserIds.includes(userId);
}

module.exports = { isAllowed };