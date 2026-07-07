const { getZingo } = require("./getZingo");

async function executeZingoCliRescan(command = "rescan", params = {}) {
  try {
    const zingo = getZingo(params);
    const result = await zingo.rescan(command, 300000); // 5 min timeout
    return result;
  } catch (err) {
    console.error("[executeZingoCliRescan] Error:", err.message);
    throw err;
  }
}

module.exports = executeZingoCliRescan;