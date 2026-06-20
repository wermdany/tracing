import type { ServerResponse, IncomingMessage } from "http";
import type { Plugin } from "vite";

interface MockAPI {
  url: string;
  call: (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => void;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf-8");
    });
    req.on("end", () => resolve(body));
  });
}

const middleware: MockAPI[] = [
  {
    url: "/apis/success",
    async call(req, res) {
      const body = await readBody(req);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          body: body || null,
          timestamp: Date.now()
        })
      );
    }
  },
  {
    url: "/apis/error",
    call(_req, res) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error", code: 500 }));
    }
  },
  {
    url: "/apis/timeout",
    call(_req, res) {
      setTimeout(() => {
        res.statusCode = 408;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Request Timeout", code: 408 }));
      }, 1500);
    }
  },
  {
    url: "/apis/not-exist",
    call(_req, res) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not Found", code: 404 }));
    }
  },
  {
    url: "/apis/status/201",
    call(_req, res) {
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Created", code: 201 }));
    }
  },
  {
    url: "/apis/status/301",
    call(_req, res) {
      res.statusCode = 301;
      res.setHeader("Location", "/apis/success");
      res.end();
    }
  },
  {
    url: "/apis/status/403",
    call(_req, res) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden", code: 403 }));
    }
  },
  {
    url: "/apis/status/502",
    call(_req, res) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Bad Gateway", code: 502 }));
    }
  },
  {
    url: "/apis/slow",
    call(_req, res) {
      setTimeout(() => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ message: "Slow response", delay: 3000 }));
      }, 3000);
    }
  },
  {
    url: "/apis/collect",
    async call(req, res) {
      const body = await readBody(req);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "ok", received: body || null }));
    }
  }
];

export function MockServerPlugin(): Plugin {
  return {
    name: "vite:text",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        const item = middleware.find(item => item.url === url);
        if (item) {
          item.call(req, res);
        } else {
          next();
        }
      });
    }
  };
}
