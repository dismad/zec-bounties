const { getZingo, invalidateZingo } = require("./getZingo");

async function executeZingoCliAddresses(command, params) {
  try {
    const zingo = getZingo(params);
    if (typeof zingo.addresses !== "function") {
      invalidateZingo(params);
      const fresh = getZingo(params);
      return await fresh.addresses(command);
    }
    return await zingo.addresses(command);
  } catch (err) {
    console.error("[executeZingoCliAddresses] Error:", err.message);
    throw err;
  }
}

module.exports = executeZingoCliAddresses;