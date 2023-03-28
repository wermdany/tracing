import { rest } from "msw";
import { setupServer } from "msw/node";

const success = rest.post("/test/success", (req, res, ctx) => {
  return res(ctx.json(req.json()));
});

const error = rest.post("/test/error", (req, res, ctx) => {
  return res(ctx.status(400));
});

const timeout = rest.post("/test/timeout", (req, res, ctx) => {
  return res(ctx.delay(500));
});

export const mockServer = setupServer(success, error, timeout);
