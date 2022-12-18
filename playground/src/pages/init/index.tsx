import type { FC } from "react";
import type {} from "track-collect";
import { createCollectReport } from "track-collect";

import { useEffect, useRef } from "react";
import { Space, Button } from "antd";
import axios from "axios";

const config = {
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000
} as const;

const Init: FC = () => {
  const collect = useRef<any>();
  useEffect(() => {
    collect.current = createCollectReport({ ...config });
    return () => collect.current.destroy();
  }, []);

  let number = 1;

  return (
    <>
      <p>配置项</p>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <Space>
        <Button
          onClick={() => {
            collect.current.report("test", { a: number++ });
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
