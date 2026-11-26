import {spawn} from "node:child_process";
import {once} from "node:events";
import net from "node:net";
import {E2eTargetError, REPO_ROOT} from "./module-loader.mjs";

const delay = ms => new Promise(resolve => {
  const t = setTimeout(resolve, ms);
  if (typeof t.unref === "function") t.unref();
});

export async function findFreeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : NaN;
      srv.close(closeErr => {
        if (closeErr) {
          reject(closeErr);
          return;
        }
        if (!Number.isInteger(port) || port < 1024 || port > 65535) {
          reject(new Error(`Allocated loopback port out of allowed tools/server.mjs range (1024..65535): ${port}`));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function terminateProcess(child) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.kill("SIGTERM");
  } catch {
    return;
  }
  const exited = Promise.race([
    once(child, "exit").then(() => true),
    delay(1500).then(() => false),
  ]);
  if (!(await exited) && child.exitCode === null && child.signalCode === null) {
    try {
      child.kill("SIGKILL");
    } catch {
      return;
    }
    await Promise.race([once(child, "exit"), delay(1500)]);
  }
}

export async function startLoopbackServer({
  rootDir = REPO_ROOT,
  readinessTimeoutMs = 8000,
  maxPortRetries = 3,
} = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxPortRetries; attempt++) {
    const port = await findFreeLoopbackPort();
    const origin = `http://127.0.0.1:${port}`;
    const env = {...process.env, PORT: String(port)};
    const child = spawn(process.execPath, ["tools/server.mjs"], {
      cwd: rootDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let exitedEarly = false;
    let exitInfo = null;
    let spawnError = null;
    child.once("error", err => {
      spawnError = err;
      exitedEarly = true;
    });
    child.stdout.on("data", chunk => {
      stdout += String(chunk);
    });
    child.stderr.on("data", chunk => {
      stderr += String(chunk);
    });
    child.once("exit", (code, signal) => {
      exitedEarly = true;
      exitInfo = {code, signal};
    });

    const deadline = Date.now() + readinessTimeoutMs;
    let ready = false;
    while (Date.now() < deadline && !exitedEarly && !spawnError) {
      try {
        const fetchTimeoutMs = Math.max(200, Math.min(2000, deadline - Date.now()));
        const res = await fetch(`${origin}/`, {
          redirect: "manual",
          signal: AbortSignal.timeout(fetchTimeoutMs),
        });
        if (res.status === 200) {
          await res.arrayBuffer();
          ready = true;
          break;
        }
        await res.arrayBuffer();
      } catch {
        // Server still binding or timed out on probe
      }
      if (!exitedEarly && !spawnError) {
        await delay(50);
      }
    }

    if (ready) {
      let closed = false;
      const url = (pathname = "/") => `${origin}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
      return {
        port,
        origin,
        url,
        async fetchPath(pathname, init = {}) {
          return fetch(url(pathname), {redirect: "manual", ...init});
        },
        async assertHttpOk(pathname) {
          const res = await fetch(url(pathname), {redirect: "manual"});
          const text = await res.text();
          if (res.status !== 200) {
            throw new E2eTargetError(
              "E2E_HTTP_STATUS",
              `Expected HTTP 200 for ${pathname} on ${origin}, received ${res.status}`,
              {pathname, url: url(pathname), status: res.status},
            );
          }
          return {status: res.status, headers: res.headers, text};
        },
        async close() {
          if (closed) return;
          closed = true;
          await terminateProcess(child);
        },
      };
    }

    await terminateProcess(child);
    if (spawnError) {
      throw new Error(
        `Failed to spawn loopback server (cwd=${rootDir}): ${spawnError.message}`,
        {cause: spawnError},
      );
    }
    const addrInUse = /EADDRINUSE/i.test(stderr);
    lastError = new Error(
      `Loopback server failed to start on ${origin} (attempt ${attempt}/${maxPortRetries}; exit=${JSON.stringify(exitInfo)}). stderr=${stderr.trim()} stdout=${stdout.trim()}`,
    );
    if (addrInUse && attempt < maxPortRetries) {
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new Error("Failed to start loopback server");
}

export async function withLoopbackServer(fn, opts = {}) {
  const server = await startLoopbackServer(opts);
  try {
    return await fn(server);
  } finally {
    await server.close();
  }
}
