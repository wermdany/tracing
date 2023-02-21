import type { FC } from "react";

import { useEffect } from "react";
import { Button, Typography, Input } from "antd";

import { createBrowserTracing } from "browser-tracing";
import { WebClickPlugin } from "@tracing/web-click";

const Link = Typography.Link;

const WebClick: FC = () => {
  useEffect(() => {
    const collect = createBrowserTracing({
      url: "apis/success",
      plugins: [WebClickPlugin()]
    });

    return () => {
      collect.destroy();
    };
  }, []);

  return (
    <>
      <Button>点击按钮</Button>
      <p>
        <Link href="https://www.baidu.com/" target="_blank">
          A标签
        </Link>
      </p>
      <p auto-watch-web-click="true">自定义 Attrs</p>

      <p>
        <Input placeholder="测试输入框" />
      </p>
      <p>
        <Input.TextArea placeholder="测试文本域"></Input.TextArea>
      </p>
    </>
  );
};

export default WebClick;
