import type { FC } from "react";
import type { BrowserTracingConfig } from "browser-tracing";
import { createBrowserTracing } from "browser-tracing";

import { useEffect, useRef } from "react";
import { Space, Button } from "antd";
import axios from "axios";

const config: BrowserTracingConfig = {
  url: "/apis/success",
  middleware: [],
  xhr: {
    includes: ["browser-click"]
  }
};

const Init: FC = () => {
  const tracing = useRef<any>();
  useEffect(() => {
    tracing.current = createBrowserTracing({ ...config });
    return () => tracing.current.destroy();
  }, []);

  let number = 1;

  return (
    <>
      <p>配置项</p>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <Space>
        <Button
          onClick={() => {
            tracing.current.report("test", { a: number++ });
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
