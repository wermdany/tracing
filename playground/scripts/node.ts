import type { Plugin } from "vite";

export function TestPlugin(): Plugin {
  return {
    name: "vite:text",
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/apis/success" && req.method === "POST") {
            let post;
            req.on("data", (e: Buffer) => {
              post = e.toString("utf-8");
            });
            req.on("end", () => {
              res.statusCode = 200;
              res.end(post);
            });
          } else if (req.url === "/apis/error" && req.method === "POST") {
            res.statusCode = 402;
            res.end();
          } else {
            next();
          }
        });
      };
    }
  };
}
