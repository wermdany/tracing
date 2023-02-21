import { createBrowserTracing } from "browser-tracing";

export const tracing = createBrowserTracing({
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000
});
