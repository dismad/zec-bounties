const ZingoProcess = require("./ZingoProcess");
const { existsSync, mkdirSync } = require("fs");

/**
 * Generate a stable key for a zingo process instance
 */
function zingoKey({ chain, serverUrl, dataDir }) {
  return `${chain}::${serverUrl}::${dataDir}`;
}

/**
 * Pool to keep warm Zingo CLI processes
 * One process per unique (chain + serverUrl + dataDir) combination
 */
const pool = new Map();

/**
 * Get (or create) a ZingoProcess instance
 */
function getZingo(params = {}) {
  const normalized = {
    chain: params.chain || "mainnet",
    serverUrl: params.serverUrl || "http://127.0.0.1:8137",
    dataDir: params.dataDir || "./.zingo-data",
  };

  // Ensure data directory exists
  if (!existsSync(normalized.dataDir)) {
    mkdirSync(normalized.dataDir, { recursive: true });
    console.log(`[getZingo] Created data directory: ${normalized.dataDir}`);
  }

  const key = zingoKey(normalized);

  // Return existing warm process if available
  if (pool.has(key)) {
    const existing = pool.get(key);
    if (existing.isAlive) {
      return existing;
    } else {
      // Process died, remove it from pool
      pool.delete(key);
    }
  }

  // Create new ZingoProcess instance
  try {
    const zingo = new ZingoProcess(normalized);
    pool.set(key, zingo);

    // Auto-cleanup when process exits
    zingo.proc.on("exit", () => {
      pool.delete(key);
    });

    return zingo;
  } catch (err) {
    console.error("[getZingo] Failed to create ZingoProcess:", err.message);
    throw err;
  }
}

/**
 * Invalidate (kill + remove) a ZingoProcess from the pool
 */
function invalidateZingo(params) {
  const normalized = {
    chain: params.chain || "mainnet",
    serverUrl: params.serverUrl || "http://127.0.0.1:8137",
    dataDir: params.dataDir || "./.zingo-data",
  };

  const key = zingoKey(normalized);
  const proc = pool.get(key);

  if (proc) {
    try {
      proc.destroy();
    } catch (e) {
      console.warn("[getZingo] Error destroying process:", e.message);
    }
    pool.delete(key);
  }
}

/**
 * Clear all cached Zingo processes (useful on shutdown or major config change)
 */
function clearZingoPool() {
  for (const [key, proc] of pool.entries()) {
    try {
      proc.destroy();
    } catch (e) {}
    pool.delete(key);
  }
}

module.exports = {
  getZingo,
  invalidateZingo,
  clearZingoPool,
};