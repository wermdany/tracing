import type { FC } from "react";

import { Button, Space, message } from "antd";

import { TracingCore } from "@tracing/core";

import type { BaseSenderFactory } from "@tracing/browser-sender";
import {
  createXhrSenderFactory,
  SenderError,
  createBeaconSenderFactory,
  createFetchSenderFactory,
  ErrorRetryMiddleware,
  BatchSendMiddleware,
  XhrSenderPlugin
} from "@tracing/browser-sender";

type FactoryType = "success" | "error" | "timeout" | "other";

function createFactory(instance: BaseSenderFactory<Record<string, any>>, type: FactoryType) {
  const request = instance({
    url: "/apis/" + type,
    timeout: 800
  });

  request(
    "Test",
    { test: 1 },
    (event, build, code) => {
      message.error("失败：" + type + "-" + SenderError[code]);
    },
    () => {
      message.success("成功：" + type);
    }
  );
}

const instanceSuccess = new TracingCore({
  plugins: [
    XhrSenderPlugin({
      url: "apis/success",
      middleware: [BatchSendMiddleware, ErrorRetryMiddleware],
      error(event, _build, code) {
        message.error("失败：" + event + "-" + SenderError[code]);
      },
      success(event, _build) {
        message.success("成功：" + event);
      }
    }),
    {
      name: "test-build",
      build(event, record) {
        return {
          event,
          body: record
        };
      }
    }
  ]
});
const instanceError = new TracingCore({
  plugins: [
    XhrSenderPlugin({
      url: "apis/error",
      middleware: [BatchSendMiddleware, ErrorRetryMiddleware],
      error(event, _build, code) {
        message.error("失败：" + event + "-" + SenderError[code]);
      },
      success(event, _build) {
        message.success("成功：" + event);
      }
    }),
    {
      name: "test-build",
      build(event, record) {
        return {
          event,
          body: record
        };
      }
    }
  ]
});

instanceSuccess.init();
instanceError.init();

const Sender: FC = () => {
  return (
    <>
      <p>XHR 发送</p>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            createFactory(createXhrSenderFactory, "success");
          }}
        >
          发送成功
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createXhrSenderFactory, "error");
          }}
        >
          发送失败
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createXhrSenderFactory, "timeout");
          }}
        >
          发送超时
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createXhrSenderFactory, "other");
          }}
        >
          发送其他错误
        </Button>
      </Space>
      <p>Beacon 发送</p>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            createFactory(createBeaconSenderFactory, "success");
          }}
        >
          发送成功
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createBeaconSenderFactory, "error");
          }}
        >
          发送失败
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createBeaconSenderFactory, "timeout");
          }}
        >
          发送超时
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createBeaconSenderFactory, "other");
          }}
        >
          发送其他错误
        </Button>
      </Space>
      <p>Fetch 发送</p>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            createFactory(createFetchSenderFactory, "success");
          }}
        >
          发送成功
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createFetchSenderFactory, "error");
          }}
        >
          发送失败
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createFetchSenderFactory, "timeout");
          }}
        >
          发送超时
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            createFactory(createFetchSenderFactory, "other");
          }}
        >
          发送其他错误
        </Button>
      </Space>
      <p>使用中间件发送</p>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            instanceSuccess.report("ddd", { a: 1 });
          }}
        >
          发送成功
        </Button>
        <Button
          type="primary"
          onClick={() => {
            instanceSuccess.destroy();
          }}
        >
          销毁成功发送
        </Button>
        <Button
          type="primary"
          danger
          onClick={() => {
            instanceError.report("ddd", { a: 1 });
          }}
        >
          发送失败
        </Button>
        <Button
          type="primary"
          onClick={() => {
            instanceError.destroy();
          }}
        >
          销毁失败发送
        </Button>
      </Space>
    </>
  );
};

export default Sender;
