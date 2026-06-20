import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Row, Col, Statistic, Space, Typography, Tag } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserErrorPlugin } from "@tracing/browser-error";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const sourceTagColor: Record<string, string> = {
  uncaught_error: "red",
  unhandled_rejection: "orange",
  resource_error: "gold",
  console_error: "purple"
};

const BrowserError: FC = () => {
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
      plugins: [BrowserErrorPlugin(), BuildPlugin()],
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

  const body = latestReport?.record?.body || {};
  const header = latestReport?.record?.header || {};
  const framesCount = body.frames?.length || 0;
  const causesCount = body.causes?.length || 0;

  return (
    <>
      <Title level={3}>错误监控（browser-error）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="错误类型" value={body.type || "-"} valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="来源"
                  valueRender={() =>
                    body.source ? (
                      <Tag color={sourceTagColor[body.source] || "default"}>{body.source}</Tag>
                    ) : (
                      "-"
                    )
                  }
                />
              </Col>
              <Col span={12}>
                <Statistic title="堆栈帧数" value={framesCount} />
              </Col>
              <Col span={12}>
                <Statistic title="错误链深度" value={causesCount} />
              </Col>
              <Col span={24}>
                <Statistic title="错误消息" value={body.message || "-"} valueStyle={{ fontSize: 14 }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" title="页面信息 (header)">
            <Paragraph style={{ fontSize: 12, marginBottom: 4 }}>
              <Tag style={{ fontSize: 10 }}>URL</Tag> {(header.url || "-").substring(0, 30)}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, marginBottom: 4 }}>
              <Tag style={{ fontSize: 10 }}>Path</Tag> {header.path || "-"}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, marginBottom: 0 }}>
              <Tag style={{ fontSize: 10 }}>Title</Tag> {(header.title || "-").substring(0, 18)}
            </Paragraph>
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
                暂无采集数据，点击下方按钮触发错误
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
                  [{log.time}]
                  <Tag
                    color={sourceTagColor[log.build?.body?.source] || "default"}
                    style={{ fontSize: 10, lineHeight: "16px", marginLeft: 4 }}
                  >
                    {log.build?.body?.source || log.build?.body?.type}
                  </Tag>{" "}
                  {log.build?.body?.message?.substring(0, 40)}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="测试用例" style={{ marginBottom: 16 }}>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              点击按钮触发不同类型错误，错误将被自动捕获并上报。
            </Paragraph>
            <Space wrap>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    (({} as any).foo.bar());
                  }, 0);
                }}
              >
                抛出 TypeError
              </Button>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    eval("nonexistentVar");
                  }, 0);
                }}
              >
                抛出 ReferenceError
              </Button>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    new Array(-1);
                  }, 0);
                }}
              >
                抛出 RangeError
              </Button>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    Promise.reject(new Error("Promise rejected with Error"));
                  }, 0);
                }}
              >
                Promise reject(Error)
              </Button>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    Promise.reject("手动拒绝的字符串");
                  }, 0);
                }}
              >
                Promise reject(String)
              </Button>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    Promise.reject({ code: 500, msg: "服务器繁忙" });
                  }, 0);
                }}
              >
                Promise reject(Object)
              </Button>
              <Button
                danger
                onClick={() => {
                  const img = document.createElement("img");
                  img.src = "/not-exist.png";
                }}
              >
                加载失败资源 (404 img)
              </Button>
              <Button
                danger
                onClick={() => {
                  const script = document.createElement("script");
                  script.src = "/not-exist.js";
                  document.head.appendChild(script);
                }}
              >
                加载失败 JS (404)
              </Button>
              <Button
                danger
                onClick={() => {
                  setTimeout(() => {
                    const inner = new Error("内层错误");
                    const outer = new Error("外层错误", { cause: inner });
                    throw outer;
                  }, 0);
                }}
              >
                Cause 链错误
              </Button>
              <Button
                danger
                onClick={() => {
                  console.error("自定义错误日志", new Error("详细错误信息"));
                }}
              >
                console.error（默认禁用）
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

export default BrowserError;
