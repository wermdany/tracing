import { createCollectReport } from "track-collect";

export const collect = createCollectReport({
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000
});
