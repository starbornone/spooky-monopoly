import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import next from "next";

test("the production server preserves the game page and statistics URLs", async () => {
  delete process.env.NEXT_HALLOWOPOLY_SUPABASE_PROJECT_ID;
  delete process.env.NEXT_HALLOWOPOLY_SUPABASE_KEY;

  const socketName = `spooky-monopoly-${randomUUID()}`;
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\${socketName}`
    : join(tmpdir(), `${socketName}.sock`);
  const app = next({ dev: false, hostname: "localhost", port: 3000 });
  const server = createServer(app.getRequestHandler());

  function read(path, method = "GET") {
    return new Promise((resolve, reject) => {
      const req = request({ socketPath, path, method, headers: { host: "localhost:3000" } }, response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => { body += chunk; });
        response.on("error", reject);
        response.on("end", () => resolve({ status: response.statusCode, body }));
      });
      req.on("error", reject);
      req.end();
    });
  }

  try {
    await app.prepare();
    const listening = once(server, "listening");
    server.listen(socketPath);
    await listening;

    for (const path of ["/", "/2025/spooky"]) {
      const page = await read(path);
      assert.equal(page.status, 200, path);
      assert.match(page.body, /Choose Your Token/, path);
      assert.match(page.body, /<title>Spooky Monopoly<\/title>/, path);
      assert.match(page.body, /<link rel="icon" href="\/favicon\.ico(?:\?[^"\s]*)?"/, path);
    }

    assert.equal((await read("/favicon.ico")).status, 200);

    for (const prefix of ["", "/2025/spooky"]) {
      for (const [path, method] of [["/api/stats", "GET"], ["/api/submit", "POST"]]) {
        const result = await read(prefix + path, method);
        assert.equal(result.status, 503, prefix + path);
        const payload = { success: false, error: "Global statistics are unavailable" };
        if (path === "/api/stats") payload.code = "STATS_UNCONFIGURED";
        assert.deepEqual(JSON.parse(result.body), payload);
        const wrongMethod = await read(prefix + path, method === "GET" ? "POST" : "GET");
        assert.equal(wrongMethod.status, 405, prefix + path);
      }
    }
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await app.close();
  }
});
