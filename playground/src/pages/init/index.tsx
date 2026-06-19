import type { FC } from "react";
import type { BrowserTracingConfig } from "browser-tracing";
import { createBrowserTracing } from "browser-tracing";

import { useEffect, useRef, useState } from "react";
import { Space, Button, Card, Row, Col, Statistic, Typography, Tag } from "antd";
import axios from "axios";

import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const config: BrowserTracingConfig = {
  url: "/apis/success",
  middleware: [],
  xhr: {
    excludes: []
  }
};

const Init: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const tracing = useRef<any>();
  const numberRef = useRef(1);

  useEffect(() => {
    tracing.current = createBrowserTracing({
      ...config,
      sendLog: (event: string, build: Record<string, any>) => {
        const time = new Date().toLocaleTimeString();
        const log = { time, event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time });
      }
    });

    return () => tracing.current.destroy();
  }, []);

  return (
    <>
      <Title level={3}>初始化（init）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="最近事件" value={latestReport?.event || "-"} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="配置 URL"
                  value={typeof config.url === "function" ? "(动态)" : config.url}
                />
              </Col>
            </Row>
            <Card size="small" title="配置项" style={{ marginTop: 8 }} bodyStyle={{ padding: 8 }}>
              <pre style={{ fontSize: 11, margin: 0, maxHeight: 100, overflow: "auto" }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </Card>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title="触发历史记录"
            bodyStyle={{ padding: 8, maxHeight: 250, overflow: "auto" }}
          >
            {logs.length === 0 ? (
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                暂无上报数据，点击按钮触发
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
                  [{log.time}] {log.event} —{" "}
                  {JSON.stringify(log.build).substring(0, 40)}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="测试用例">
            <Space wrap>
              <Button
                onClick={() => {
                  tracing.current.report("test", { a: numberRef.current++ });
                }}
              >
                发送成功请求
              </Button>
              <Button
                onClick={() => {
                  axios.post("/apis/error", { a: 1 });
                }}
              >
                发送 Axios 请求
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  tracing.current.report("page_view", { path: "/home", title: "首页", stayMs: 5000 });
                }}
              >
                模拟 page_view
              </Button>
              <Button
                type="primary"
                danger
                onClick={() => {
                  tracing.current.report("js_error", {
                    message: "Uncaught TypeError: x is not a function",
                    filename: "app.js",
                    lineno: 42,
                    colno: 15
                  });
                }}
              >
                模拟 js_error
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  tracing.current.report("performance", { fcp: 120, lcp: 350, tti: 800, cls: 0.02 });
                }}
              >
                模拟 performance
              </Button>
              <Button
                onClick={() => {
                  tracing.current.report("api_call", {
                    method: "GET",
                    url: "/api/users",
                    status: 200,
                    duration: 320
                  });
                }}
              >
                模拟 api_call
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

export default Init;
