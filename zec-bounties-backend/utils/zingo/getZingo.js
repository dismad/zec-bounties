const ZingoProcess = require("./ZingoProcess");

function zingoKey({ chain, serverUrl, dataDir }) {
  return `${chain}::${serverUrl}::${dataDir}`;
}

const pool = new Map();

function getZingo(params = {}) {
  const normalized = {
    chain: params.chain || "mainnet",
    serverUrl: params.serverUrl || "http://127.0.0.1:8137",
    dataDir: params.dataDir || "./.zingo-data",
  };

  const key = zingoKey(normalized);

  if (pool.has(key)) {
    return pool.get(key);
  }

  const zingo = new ZingoProcess(normalized);
  pool.set(key, zingo);

  zingo.proc.on("exit", () => {
    pool.delete(key);
  });

  return zingo;
}

function invalidateZingo(params) {
  const key = zingoKey(params);
  const proc = pool.get(key);
  if (proc) {
    proc.destroy();
    pool.delete(key);
  }
}

module.exports = { getZingo, invalidateZingo };