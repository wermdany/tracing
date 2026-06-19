import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Space, message, Card, Row, Col, Statistic, Typography, Tag } from "antd";

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
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

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

const BrowserSender: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const instanceSuccessRef = useRef<TracingCore>();
  const instanceErrorRef = useRef<TracingCore>();

  useEffect(() => {
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
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
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
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    instanceSuccess.init();
    instanceError.init();

    instanceSuccessRef.current = instanceSuccess;
    instanceErrorRef.current = instanceError;

    return () => {
      instanceSuccess.destroy();
      instanceError.destroy();
    };
  }, []);

  return (
    <>
      <Title level={3}>发送数据（browser-sender）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Statistic title="最近事件" value={latestReport?.event || "-"} />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title="触发历史记录"
            bodyStyle={{ padding: 8, maxHeight: 200, overflow: "auto" }}
          >
            {logs.length === 0 ? (
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                暂无发送数据，点击按钮触发
              </Paragraph>
            ) : (
              logs.map((log, i) => (
                <Paragraph
                  key={i}
                  onClick={() => {
                    setSelectedIndex(i);
                    const { time, event, build } = log;
                    setLatestReport({ event, record: build, time });
                  }}
                  style={{
                    fontSize: 12,
                    marginBottom: 2,
                    fontFamily: "monospace",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: i === selectedIndex ? "#e6f4ff" : "transparent"
                  }}
                >
                  <Tag
                    color={i === selectedIndex ? "blue" : "default"}
                    style={{ marginRight: 4, fontSize: 10, lineHeight: "16px" }}
                  >
                    #{logs.length - i}
                  </Tag>
                  [{log.time}] {log.event} — {JSON.stringify(log.build).substring(0, 40)}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="XHR 发送" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button type="primary" onClick={() => createFactory(createXhrSenderFactory, "success")}>
                发送成功
              </Button>
              <Button danger onClick={() => createFactory(createXhrSenderFactory, "error")}>
                发送失败
              </Button>
              <Button danger onClick={() => createFactory(createXhrSenderFactory, "timeout")}>
                发送超时
              </Button>
              <Button danger onClick={() => createFactory(createXhrSenderFactory, "other")}>
                其他错误
              </Button>
            </Space>
          </Card>

          <Card size="small" title="Beacon 发送" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button type="primary" onClick={() => createFactory(createBeaconSenderFactory, "success")}>
                发送成功
              </Button>
              <Button danger onClick={() => createFactory(createBeaconSenderFactory, "error")}>
                发送失败
              </Button>
              <Button danger onClick={() => createFactory(createBeaconSenderFactory, "timeout")}>
                发送超时
              </Button>
              <Button danger onClick={() => createFactory(createBeaconSenderFactory, "other")}>
                其他错误
              </Button>
            </Space>
          </Card>

          <Card size="small" title="Fetch 发送" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button type="primary" onClick={() => createFactory(createFetchSenderFactory, "success")}>
                发送成功
              </Button>
              <Button danger onClick={() => createFactory(createFetchSenderFactory, "error")}>
                发送失败
              </Button>
              <Button danger onClick={() => createFactory(createFetchSenderFactory, "timeout")}>
                发送超时
              </Button>
              <Button danger onClick={() => createFactory(createFetchSenderFactory, "other")}>
                其他错误
              </Button>
            </Space>
          </Card>

          <Card size="small" title="使用中间件发送" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button type="primary" onClick={() => instanceSuccessRef.current?.report("ddd", { a: 1 })}>
                发送成功
              </Button>
              <Button onClick={() => instanceSuccessRef.current?.destroy()}>销毁成功发送</Button>
              <Button danger onClick={() => instanceErrorRef.current?.report("ddd", { a: 1 })}>
                发送失败
              </Button>
              <Button onClick={() => instanceErrorRef.current?.destroy()}>销毁失败发送</Button>
            </Space>
          </Card>

          <Card size="small" title="模拟事件">
            <Space wrap>
              <Button
                onClick={() =>
                  instanceSuccessRef.current?.report("custom_click", {
                    type: "click",
                    x: 100,
                    y: 200,
                    target: "btn-submit"
                  })
                }
              >
                模拟点击
              </Button>
              <Button
                onClick={() =>
                  instanceSuccessRef.current?.report("custom_pageview", {
                    type: "pageview",
                    path: "/home",
                    referrer: "https://example.com",
                    stayTime: 1200
                  })
                }
              >
                模拟页面浏览
              </Button>
              <Button
                danger
                onClick={() =>
                  instanceSuccessRef.current?.report("custom_error", {
                    type: "error",
                    message: "TypeError: Cannot read property of undefined",
                    stack: "at foo (bar.js:42)"
                  })
                }
              >
                模拟错误
              </Button>
              <Button
                onClick={() =>
                  instanceSuccessRef.current?.report("batch_big", {
                    type: "batch",
                    items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `data_${i}` }))
                  })
                }
              >
                模拟大批量
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <ReportPanel
            event={latestReport?.event}
            record={latestReport?.record}
            time={latestReport?.time}
            fromHistory={selectedIndex >= 0}
          />
        </Col>
      </Row>
    </>
  );
};

export default BrowserSender;
