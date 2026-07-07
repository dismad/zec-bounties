const { spawn } = require("child_process");
const { existsSync, mkdirSync } = require("fs");

function cleanAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function extractJsonArray(text) {
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return null;
}

class ZingoProcess {
  constructor(params = {}) {
    this.zingoPath = process.env.ZINGO_CLI;

    if (!this.zingoPath || !existsSync(this.zingoPath)) {
      throw new Error(`zingo-cli binary not found at: ${this.zingoPath}`);
    }

    const dataDir = params.dataDir || "./.zingo-data";

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[ZingoProcess] Created data directory: ${dataDir}`);
    }

    const args = [
      "--chain", params.chain || "mainnet",
      "--server", params.serverUrl || "http://127.0.0.1:8137",
      "--data-dir", dataDir,
    ];

    this.proc = spawn(this.zingoPath, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.buffer = "";
    this.waiters = [];
    this.isAlive = true;

    this.proc.stdout.on("data", (data) => {
      this.buffer += data.toString();
      this.waiters.forEach((w) => w());
    });

    this.proc.stderr.on("data", (data) => {
      console.error("[ZINGO STDERR]", data.toString());
    });

    this.proc.on("exit", (code, signal) => {
      this.isAlive = false;
      console.error(`[ZingoProcess] Process exited with code: ${code}, signal: ${signal}`);
    });
  }

  async rescan(command = "rescan", timeout = 300000) {
    if (!this.isAlive) throw new Error("Zingo process is not running");

    return new Promise((resolve, reject) => {
      let buffer = "";
      let resolved = false;

      const onData = (chunk) => {
        buffer += chunk.toString();
        const clean = cleanAnsi(buffer);

        if (clean.includes("Launching rescan...") && !resolved) {
          resolved = true;
          setTimeout(() => {
            resolve({ success: true, message: "Rescan launched successfully" });
          }, 2000);
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.proc.stdout.off("data", onData);
        this.proc.stderr.off("data", onError);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Rescan command timed out"));
      }, timeout);

      this.proc.stdout.on("data", onData);
      this.proc.stderr.on("data", onError);
      this.proc.stdin.write(command + "\n");
    });
  }

  async sync(command, timeout = 10000) {
    if (!this.isAlive) throw new Error("Zingo process is not running");

    return new Promise((resolve, reject) => {
      let buffer = "";

      const onData = (chunk) => {
        buffer += chunk.toString();
        const clean = cleanAnsi(buffer);

        if (clean.length > 30) {
          cleanup();
          resolve({ raw: clean.trim() });
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.proc.stdout.off("data", onData);
        this.proc.stderr.off("data", onError);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Zingo sync command timeout"));
      }, timeout);

      this.proc.stdout.on("data", onData);
      this.proc.stderr.on("data", onError);
      this.proc.stdin.write(command + "\n");
    });
  }

  async balance(command, timeout = 10000) {
    if (!this.isAlive) throw new Error("Zingo process is not running");

    return new Promise((resolve, reject) => {
      let buffer = "";

      const onData = (chunk) => {
        buffer += chunk.toString();
        const clean = cleanAnsi(buffer);

        if (clean.includes("orchard") || clean.includes("sapling") || clean.includes("transparent")) {
          cleanup();
          resolve({ raw: clean.trim() });
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.proc.stdout.off("data", onData);
        this.proc.stderr.off("data", onError);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Zingo balance command timeout"));
      }, timeout);

      this.proc.stdout.on("data", onData);
      this.proc.stderr.on("data", onError);
      this.proc.stdin.write(command + "\n");
    });
  }

  async addresses(command = "addresses", timeout = 10000) {
    if (!this.isAlive) throw new Error("Zingo process is not running");

    return new Promise((resolve, reject) => {
      let buffer = "";

      const onData = (chunk) => {
        buffer += chunk.toString();
        const clean = cleanAnsi(buffer);
        const jsonText = extractJsonArray(clean);

        if (jsonText) {
          try {
            const parsed = JSON.parse(jsonText);
            cleanup();
            resolve(parsed);
          } catch (e) {
            // keep waiting
          }
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.proc.stdout.off("data", onData);
        this.proc.stderr.off("data", onError);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Zingo addresses command timeout"));
      }, timeout);

      this.proc.stdout.on("data", onData);
      this.proc.stderr.on("data", onError);
      this.proc.stdin.write(command + "\n");
    });
  }

  destroy() {
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
  }
}

module.exports = ZingoProcess;
