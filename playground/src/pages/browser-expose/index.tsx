import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Typography, Card, Row, Col, Statistic, Space, Tag } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserExposePlugin } from "@tracing/browser-expose";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const BrowserExpose: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dynamicId, setDynamicId] = useState(0);
  const dynContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const collect = new TracingCore({
      plugins: [
        BrowserExposePlugin({
          threshold: 0,
          once: true,
          useMutationObserver: true
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

  const addDynamicElement = () => {
    const id = dynamicId + 1;
    setDynamicId(id);
    const container = dynContainerRef.current;
    if (!container) return;

    const div = document.createElement("div");
    div.setAttribute("data-tracing-expose", `dynamic-${id}`);
    div.setAttribute("data-tracing-expose-data", JSON.stringify({ index: id, source: "mutation-observer" }));
    div.style.cssText =
      "padding:16px;margin-bottom:8px;background:#fff7e6;border:1px solid #ffd591;border-radius:6px;";
    div.textContent = `动态添加的曝光元素 #${id}（通过 MutationObserver 自动捕获）`;
    container.appendChild(div);
  };

  const latest = latestReport?.record || {};

  return (
    <>
      <Title level={3}>元素曝光率（browser-expose）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="最近标签" value={latest.body?.elementTagName || "-"} />
              </Col>
              <Col span={12}>
                <Statistic title="最近 label" value={latest.body?.exposeLabel || "-"} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="可见比例"
                  value={latest.body?.intersectionRatio != null ? latest.body.intersectionRatio * 100 : "-"}
                  suffix={latest.body?.intersectionRatio != null ? "%" : ""}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="视口"
                  value={
                    latest.body?.viewportWidth
                      ? `${latest.body?.viewportWidth}×${latest.body?.viewportHeight}`
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
            title="曝光历史记录"
            bodyStyle={{ padding: 8, maxHeight: 200, overflow: "auto" }}
          >
            {logs.length === 0 ? (
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                暂无曝光数据，向下滚动页面使元素进入视口
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
                  [{log.time}] {log.build?.body?.exposeLabel || "(无 label)"} —{" "}
                  {log.build?.body?.elementTagName}
                  {log.build?.body?.elementId ? `#${log.build?.body?.elementId}` : ""}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="静态曝光元素" style={{ marginBottom: 16 }}>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              以下元素已设置 data-tracing-expose 属性，滚动到视口内即触发曝光上报（仅一次）。
            </Paragraph>

            <div
              data-tracing-expose="block-a"
              style={{
                padding: 20,
                marginBottom: 12,
                background: "#f0f5ff",
                border: "1px solid #adc6ff",
                borderRadius: 6
              }}
            >
              <span style={{ fontWeight: 600, color: "#1d39c4" }}>曝光区块 A</span>
              <Tag style={{ marginLeft: 8 }}>data-tracing-expose="block-a"</Tag>
            </div>

            <div
              data-tracing-expose="block-b"
              data-tracing-expose-data='{"type":"card","theme":"blue"}'
              style={{
                padding: 20,
                marginBottom: 12,
                background: "#fff7e6",
                border: "1px solid #ffd591",
                borderRadius: 6
              }}
            >
              <span style={{ fontWeight: 600, color: "#d46b08" }}>曝光区块 B（JSON 自定义数据）</span>
              <Tag style={{ marginLeft: 8 }}>
                {'data-tracing-expose-data=\'{"type":"card","theme":"blue"}\''}
              </Tag>
            </div>

            <div
              data-tracing-expose="block-c"
              id="expose-block-c"
              style={{
                padding: 20,
                marginBottom: 12,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 6
              }}
            >
              <span style={{ fontWeight: 600, color: "#389e0d" }}>曝光区块 C（带 id）</span>
              <Tag style={{ marginLeft: 8 }}>id="expose-block-c"</Tag>
            </div>

            <div
              data-tracing-expose="block-d"
              data-tracing-expose-data-name="demo"
              data-tracing-expose-data-category="test"
              data-tracing-expose-data-source="playground"
              style={{
                padding: 20,
                marginBottom: 12,
                background: "#f9f0ff",
                border: "1px solid #d3adf7",
                borderRadius: 6
              }}
            >
              <span style={{ fontWeight: 600, color: "#531dab" }}>曝光区块 D（拼接式 exposeData）</span>
              <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                从 data-tracing-expose-data-name、data-tracing-expose-data-category、
                data-tracing-expose-data-source 拼接得到 exposeData
              </div>
              <Tag style={{ marginLeft: 8, marginTop: 4 }}>data-tracing-expose-data-{"{key}"}="value"</Tag>
            </div>
          </Card>

          <Card size="small" title="动态曝光元素（MutationObserver）">
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              点击按钮动态添加元素，MutationObserver 自动捕获新元素并开始观察其曝光。
            </Paragraph>

            <Button type="primary" onClick={addDynamicElement} style={{ marginBottom: 12 }}>
              添加动态曝光元素
            </Button>

            <div ref={dynContainerRef} />
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

export default BrowserExpose;
