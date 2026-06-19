import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Row, Col, Statistic, Space, Typography, Tag } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserResourcePlugin } from "@tracing/browser-resource";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const BrowserResource: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    const collect = new TracingCore({
      plugins: [BrowserResourcePlugin(), BuildPlugin()],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    collect.init();

    return () => {
      collect.destroy();
    };
  }, []);

  const latest = latestReport?.record || {};

  return (
    <>
      <Title level={3}>监控资源加载（browser-resource）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="最近耗时" value={latest.body?.duration ?? 0} suffix="ms" />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最近 DNS"
                  value={latest.body?.domainLookupEnd - latest.body?.domainLookupStart || 0}
                  suffix="ms"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最近请求"
                  value={latest.body?.responseEnd - latest.body?.requestStart || 0}
                  suffix="ms"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最近名称"
                  value={
                    latest.body?.name
                      ? latest.body?.name.substring(latest.body?.name.lastIndexOf("/") + 1).substring(0, 15)
                      : "-"
                  }
                />
              </Col>
            </Row>
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
                暂无采集数据，点击按钮加载资源
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
                  [{log.time}] {log.event} — 耗时 {log.build?.body?.duration}ms
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="测试用例" style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button
                type="primary"
                onClick={() => {
                  const img = document.createElement("img");
                  img.src = "/react.svg";
                }}
              >
                加载 image (react.svg)
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  const img2 = document.createElement("img");
                  img2.src = "/vite.svg";
                }}
              >
                加载 image (vite.svg)
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  const script = document.createElement("script");
                  script.src = "/aa.js";
                  document.head.appendChild(script);
                }}
              >
                加载 JS (aa.js)
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
                加载 CSS (aa.css)
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  const iframe = document.createElement("iframe");
                  iframe.src = "/";
                  iframe.style.display = "none";
                  document.body.appendChild(iframe);
                }}
              >
                加载 iframe (/)
              </Button>
              <Button
                danger
                onClick={() => {
                  const imgFail = document.createElement("img");
                  imgFail.src = "/not-exist.png";
                }}
              >
                加载失败资源 (404)
              </Button>
              <Button
                danger
                onClick={() => {
                  const scriptFail = document.createElement("script");
                  scriptFail.src = "/not-exist.js";
                  document.head.appendChild(scriptFail);
                }}
              >
                加载失败 JS (404)
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

export default BrowserResource;
