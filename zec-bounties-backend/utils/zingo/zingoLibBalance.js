const { getZingo, invalidateZingo } = require("./getZingo");

async function executeZingoCliBalance(command, params) {
  try {
    const zingo = getZingo(params);
    if (typeof zingo.balance !== "function") {
      invalidateZingo(params);
      const fresh = getZingo(params);
      return await fresh.balance(command);
    }
    const result = await zingo.balance(command);
    console.log("Parsed balance:", result);
    return result;
  } catch (err) {
    console.error("[executeZingoCliBalance] Error:", err.message);
    throw err;
  }
}

module.exports = executeZingoCliBalance;