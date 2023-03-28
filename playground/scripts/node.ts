import type { ServerResponse, IncomingMessage } from "http";
import type { Plugin } from "vite";

interface MockAPI {
  url: string;
  call: (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => void;
}

const middleware: MockAPI[] = [
  {
    url: "/apis/success",
    call(req, res) {
      let post;
      req.on("data", (e: Buffer) => {
        post = e.toString("utf-8");
      });
      req.on("end", () => {
        res.statusCode = 200;
        res.end(post);
      });
    }
  },
  {
    url: "/apis/error",
    call(req, res) {
      res.statusCode = 402;
      res.end();
    }
  },
  {
    url: "/apis/timeout",
    call(req, res) {
      setTimeout(() => {
        res.statusCode = 402;
        res.end();
      }, 1000);
    }
  }
];

export function MockServerPlugin(): Plugin {
  return {
    name: "vite:text",
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const url = req.url;
          const item = middleware.find(item => item.url === url);
          if (item) {
            item.call(req, res);
          } else {
            next();
          }
        });
      };
    }
  };
}
