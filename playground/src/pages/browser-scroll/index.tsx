import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Typography, Card, Statistic, Row, Col, Tag, Table } from "antd";

import type { ScrollData, ScrollElementInfo } from "@tracing/browser-scroll";
import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserScrollPlugin } from "@tracing/browser-scroll";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const elementColumns = [
  { title: "标签", dataIndex: "elementTagName", key: "tag", width: 80 },
  { title: "类名", dataIndex: "elementClassName", key: "cls", ellipsis: true, width: 120 },
  { title: "最大深度", dataIndex: "maxScrollDepth", key: "depth", width: 90 },
  { title: "深度百分比", dataIndex: "maxScrollDepthPercent", key: "pct", width: 100, render: (v: number) => `${v}%` },
  { title: "元素路径", dataIndex: "elementPath", key: "path", ellipsis: true },
];

const BrowserScroll: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const collect = new TracingCore({
      plugins: [
        BrowserScrollPlugin({
          document: container,
          debounceMs: 500,
          genRecord(data: ScrollData) {
            return {
              totalDwellTime: data.totalDwellTime,
              scrollSegments: data.scrollSegments,
              maxScrollDepth: data.maxScrollDepth,
              maxScrollDepthPercent: data.maxScrollDepthPercent,
              elements: data.elements,
            };
          }
        }),
        BuildPlugin()
      ],
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

  const latest = latestReport?.record || logs[0]?.build || {};
  const elements: ScrollElementInfo[] = latest.body?.elements || [];

  return (
    <>
      <Title level={3}>滚动停留时间（browser-scroll）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Statistic title="停留时间" value={latest.body?.totalDwellTime ?? 0} suffix="ms" />
              </Col>
              <Col span={8}>
                <Statistic title="滚动段数" value={latest.body?.scrollSegments ?? 0} />
              </Col>
              <Col span={8}>
                <Statistic title="最大深度" value={latest.body?.maxScrollDepth ?? 0} suffix="px" />
              </Col>
              <Col span={12}>
                <Statistic title="深度百分比" value={latest.body?.maxScrollDepthPercent ?? 0} suffix="%" />
              </Col>
              <Col span={12}>
                <Statistic title="滚动元素数" value={elements.length ?? 0} />
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
                暂无采集数据，在滚动区域中滚动
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
                  [{log.time}] {log.build?.body?.maxScrollDepthPercent}% · {(log.build?.body?.elements || []).map((e: any) => e.elementTagName).join(", ")}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card size="small" title="滚动元素明细">
            <Table
              dataSource={elements}
              columns={elementColumns}
              rowKey="elementPath"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="测试用例 — 嵌套滚动区域">
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              外层和内部的嵌套滚动条都会分别采集独立数据，深度百分比基于各元素自身尺寸计算。
            </Paragraph>
            <div
              ref={scrollRef}
              style={{
                height: 300,
                overflow: "auto",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                padding: 12
              }}
            >
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Paragraph style={{ padding: "8px 0", margin: 0, fontWeight: 600 }}>
                    外层区块 {i + 1}
                  </Paragraph>
                  {i === 3 && (
                    <div
                      ref={innerScrollRef}
                      style={{
                        height: 120,
                        overflow: "auto",
                        border: "1px dashed #91caff",
                        borderRadius: 4,
                        padding: 8,
                        background: "#f6ffed"
                      }}
                    >
                      {Array.from({ length: 10 }, (_, j) => (
                        <Paragraph
                          key={j}
                          style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0", marginBottom: 0, fontSize: 12 }}
                        >
                          内部嵌套内容 {j + 1} — 独立的滚动容器
                        </Paragraph>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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

export default BrowserScroll;
