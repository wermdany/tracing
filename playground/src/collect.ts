import { createBrowserTracker } from "browser-tracker";

export const tracker = createBrowserTracker({
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000
});
