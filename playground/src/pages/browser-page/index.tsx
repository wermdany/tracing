import type { FC } from "react";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button, Typography, Card, Statistic, Row, Col, Tag, Space } from "antd";
import { useNavigate } from "react-router-dom";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserPagePlugin, BrowserPageEnterEvent, BrowserPageExitEvent } from "@tracing/browser-page";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph, Link } = Typography;

const BrowserPage: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dwellTime, setDwellTime] = useState(0);
  const [lastEnterData, setLastEnterData] = useState<Record<string, any>>({});
  const [lastExitData, setLastExitData] = useState<Record<string, any>>({});
  const entryTimeRef = useRef<number>(0);
  const navigate = useNavigate();

  const addLog = useCallback((event: string, build: Record<string, any>) => {
    const time = new Date().toLocaleTimeString();
    const log = { time, event, build };
    logsRef.current = [log, ...logsRef.current].slice(0, 20);
    setLogs([...logsRef.current]);
    setSelectedIndex(-1);
    setLatestReport({ event, record: build, time });

    if (event === BrowserPageEnterEvent) {
      setLastEnterData(build?.body || build);
      entryTimeRef.current = performance.now();
      setDwellTime(0);
    }
    if (event === BrowserPageExitEvent) {
      setLastExitData(build?.body || build);
    }
  }, []);

  useEffect(() => {
    const collect = new TracingCore({
      plugins: [
        BrowserPagePlugin({
          watchAttrs: ["auto-watch-browser-page"]
        }),
        BuildPlugin()
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        console.log(build);
        addLog(event, build);
      }
    });

    collect.init();

    const timer = setInterval(() => {
      if (entryTimeRef.current > 0) {
        setDwellTime(Math.round(performance.now() - entryTimeRef.current));
      }
    }, 200);

    return () => {
      clearInterval(timer);
      collect.destroy();
    };
  }, [addLog]);

  return (
    <>
      <Title level={3}>页面停留时间（browser-page）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="当前停留时间" value={dwellTime} suffix="ms" />
              </Col>
              <Col span={12}>
                <Statistic title="进入路径" value={lastEnterData.path || "-"} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="来源页"
                  value={lastEnterData.referrer ? lastEnterData.referrer.substring(0, 30) : "-"}
                />
              </Col>
              <Col span={12}>
                <Statistic title="页面标题" value={lastEnterData.title || "-"} />
              </Col>
              <Col span={12}>
                <Statistic title="退出目标" value={lastExitData.exitPath || "-"} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="退出停留"
                  value={lastExitData.dwellTime || "-"}
                  suffix={lastExitData.dwellTime ? "ms" : ""}
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
                  [{log.time}] {log.event}
                  {log.event === "page_exit"
                    ? ` · 停留 ${log.build?.body?.dwellTime || log.build?.dwellTime || 0}ms → ${
                        log.build?.body?.exitPath || log.build?.exitPath || ""
                      }`
                    : ` · ${log.build?.body?.path || log.build?.path || ""}`}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="测试用例" style={{ marginBottom: 16 }}>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              点击下方元素测试页面停留时间追踪，观察实时数据和事件历史的变化。
            </Paragraph>
            <Space wrap direction="vertical" size="middle" style={{ width: "100%" }}>
              <Space wrap>
                <Button type="primary" onClick={() => navigate("/browser-click")}>
                  跳转到点击事件页面
                </Button>
                <Button onClick={() => navigate("/browser-scroll")}>跳转到滚动停留页面</Button>
                <Button onClick={() => navigate("/browser-sender")}>跳转到发送数据页面</Button>
              </Space>
              <Space wrap>
                <Link href="https://github.com/wermdany/tracing" target="_blank">
                  外部链接（新标签页打开）
                </Link>
                <span
                  auto-watch-browser-page="true"
                  style={{ cursor: "pointer", color: "#1677ff" }}
                  onClick={() => navigate("/browser-resource")}
                >
                  自定义 Attrs 元素
                </span>
              </Space>
              <Space wrap>
                <Button
                  type="dashed"
                  onClick={() => window.history.pushState({}, "", "/browser-page?t=" + Date.now())}
                >
                  更新查询参数（不触发离开）
                </Button>
              </Space>
            </Space>
          </Card>

          <Card
            size="small"
            title="页面进入 / 退出详情"
            bodyStyle={{ padding: 8, maxHeight: 200, overflow: "auto" }}
          >
            {lastEnterData.path ? (
              <div style={{ fontSize: 12, fontFamily: "monospace" }}>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="green" style={{ fontSize: 10, lineHeight: "16px" }}>
                    page_enter
                  </Tag>
                  <span>path: {lastEnterData.path || "-"}</span>
                  <br />
                  <span style={{ color: "#999" }}>referrer: {lastEnterData.referrer || "-"}</span>
                  <br />
                  <span style={{ color: "#999" }}>title: {lastEnterData.title || "-"}</span>
                </div>
                {lastExitData.path && (
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="orange" style={{ fontSize: 10, lineHeight: "16px" }}>
                      page_exit
                    </Tag>
                    <span>
                      path: {lastExitData.path || "-"} → {lastExitData.exitPath || "-"}
                    </span>
                    <br />
                    <span style={{ color: "#999" }}>dwellTime: {lastExitData.dwellTime || 0}ms</span>
                    <br />
                    {lastExitData.exitElement ? (
                      <span style={{ color: "#999" }}>
                        exitElement: {lastExitData.exitElement.tagName}
                        {lastExitData.exitElement.href
                          ? ` (${lastExitData.exitElement.href.substring(0, 40)})`
                          : ""}
                      </span>
                    ) : (
                      <span style={{ color: "#999" }}>exitElement: none</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                暂无进入/退出数据
              </Paragraph>
            )}
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

export default BrowserPage;
