import type { FC } from "react";

import { useEffect } from "react";
import { Button, Typography, Input } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserClickPlugin } from "@tracing/browser-click";

const Link = Typography.Link;

const BrowserClick: FC = () => {
  useEffect(() => {
    const collect = new TracingCore({
      plugins: [BrowserClickPlugin(), BuildPlugin()]
    });

    collect.init();

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
      <p auto-watch-browser-click="true">自定义 Attrs</p>

      <p>
        <Input placeholder="测试输入框" />
      </p>
      <p>
        <Input.TextArea placeholder="测试文本域"></Input.TextArea>
      </p>
    </>
  );
};

export default BrowserClick;
