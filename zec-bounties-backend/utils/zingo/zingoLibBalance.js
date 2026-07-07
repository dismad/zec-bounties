const { getZingo } = require("./getZingo");

function parseBalanceText(text) {
  const result = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(.+?):\s*([\d_]+)/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
      const value = parseInt(match[2].replace(/_/g, ""), 10);
      result[key] = value;
    }
  }
  return result;
}

async function executeZingoCliBalance(command, params) {
  try {
    const zingo = getZingo(params);
    const result = await zingo.balance(command);

    if (result.raw) {
      const parsed = parseBalanceText(result.raw);
      console.log("Parsed balance:", parsed);
      return parsed;
    }

    return result;
  } catch (err) {
    console.error("[executeZingoCliBalance] Error:", err.message);
    throw err;
  }
}

module.exports = executeZingoCliBalance;