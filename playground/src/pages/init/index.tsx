import type { FC } from "react";
import { createBrowserTracker } from "browser-tracker";

import { useEffect, useRef } from "react";
import { Space, Button } from "antd";
import axios from "axios";

const config = {
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000
} as const;

const Init: FC = () => {
  const tracker = useRef<any>();
  useEffect(() => {
    tracker.current = createBrowserTracker({ ...config });
    return () => tracker.current.destroy();
  }, []);

  let number = 1;

  return (
    <>
      <p>配置项</p>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <Space>
        <Button
          onClick={() => {
            tracker.current.report("test", { a: number++ });
          }}
        >
          发送成功请求
        </Button>
        <Button
          onClick={() => {
            axios.post("/apis/error", { a: 1 });
          }}
        >
          发送Axios请求
        </Button>
      </Space>
    </>
  );
};

export default Init;
