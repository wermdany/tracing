import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Typography, Input, Card, Row, Col, Statistic, Space, Tag } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserClickPlugin } from "@tracing/browser-click";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;
const { Link } = Typography;

const BrowserClick: FC = () => {
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
      plugins: [BuildPlugin(), BrowserClickPlugin()],
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
      <Title level={3}>点击事件（browser-click）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="最近标签" value={latest.body?.elementTagName || "-"} />
              </Col>
              <Col span={12}>
                <Statistic title="最近 Class" value={latest.body?.elementClassName || "-"} />
              </Col>
              <Col span={24}>
                <Statistic
                  title="最近选择器"
                  value={latest.body?.elementSelector ? latest.body?.elementSelector.substring(0, 30) : "-"}
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
                暂无采集数据，点击测试元素触发
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
                  [{log.time}] {log.event} — {log.build?.body?.elementTagName} {log.build?.body?.elementClassName}
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
              <Button>普通按钮</Button>
              <Button type="primary">主要按钮</Button>
              <Button type="dashed">虚线按钮</Button>
              <Button danger>危险按钮</Button>
              <Link href="https://www.baidu.com/" target="_blank">
                超链接 A 标签
              </Link>
              <span auto-watch-browser-click="true" style={{ cursor: "pointer", color: "#1677ff" }}>
                自定义 Attrs
              </span>
              <Input placeholder="测试输入框" style={{ width: 180 }} />
              <Input.TextArea placeholder="测试文本域" style={{ width: 180 }} />
              <Button type="link" auto-watch-browser-click="true">
                带 attrs 的 Link 按钮
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

export default BrowserClick;
