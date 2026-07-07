const { getZingo, invalidateZingo } = require("./getZingo");

async function executeZingoCliSync(command, params) {
  try {
    const zingo = getZingo(params);

    // Safety check
    if (typeof zingo.sync !== "function") {
      console.warn("Invalid zingo instance, recreating...");
      invalidateZingo(params);
      const freshZingo = getZingo(params);
      return await freshZingo.sync(command);
    }

    return await zingo.sync(command);
  } catch (err) {
    console.error("[executeZingoCliSync] Error:", err.message);
    throw err;
  }
}

module.exports = executeZingoCliSync;