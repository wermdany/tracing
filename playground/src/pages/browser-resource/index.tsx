import type { FC } from "react";

import { BrowserResourcePlugin } from "@tracing/browser-resource";
import { Button, Space } from "antd";

import { useTracing } from "../hooks";

const BrowserResource: FC = () => {
  useTracing({ plugins: [BrowserResourcePlugin()] });

  return (
    <>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            const img = document.createElement("img");
            img.src = "react.svg";
          }}
        >
          加载一个 image
        </Button>
        <Button
          type="primary"
          onClick={() => {
            const script = document.createElement("script");
            script.src = "/aa.js";
            document.head.appendChild(script);
          }}
        >
          加载一个 js
        </Button>
        <Button
          type="primary"
          onClick={() => {
            const link = document.createElement("link");
            link.href = "/aa.css";
            link.rel = "stylesheet";
            document.head.appendChild(link);
          }}
        >
          加载一个 css
        </Button>
      </Space>
    </>
  );
};

export default BrowserResource;
