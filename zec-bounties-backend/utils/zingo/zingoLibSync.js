const { getZingo, invalidateZingo } = require("./getZingo");

async function executeZingoCliSync(command, params) {
  try {
    const zingo = getZingo(params);
    if (typeof zingo.sync !== "function") {
      invalidateZingo(params);
      const fresh = getZingo(params);
      return await fresh.sync(command);
    }
    return await zingo.sync(command);
  } catch (err) {
    console.error("[executeZingoCliSync] Error:", err.message);
    throw err;
  }
}

module.exports = executeZingoCliSync;