import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Typography, Row, Col, Statistic, Tag } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const Index: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const collectRef = useRef<TracingCore>();

  useEffect(() => {
    const collect = new TracingCore({
      plugins: [BuildPlugin()],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    collectRef.current = collect;
    collect.init();

    return () => {
      collect.destroy();
    };
  }, []);

  return (
    <>
      <Title level={3}>这里是 tracing 的演练场</Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        你可以在这里尽情地调试和测试。左侧为测试用例，点击触发历史可查看对应事件数据。
      </Paragraph>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Statistic title="最近事件" value={latestReport?.event || "暂无"} />
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
                暂无触发数据，点击下方按钮
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
                  [{log.time}] {log.event}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="测试用例">
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              直接使用 TracingCore 触发上报，用于验证数据流向和 BuildPlugin 拼接的 header 信息。
            </Paragraph>
            <Button
              type="primary"
              onClick={() => {
                collectRef.current?.report("manual_trigger", {
                  action: "click_home_test",
                  value: Date.now()
                });
              }}
              style={{ marginBottom: 8 }}
            >
              触发 manual_trigger
            </Button>
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

export default Index;
