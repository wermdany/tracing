import type { FC } from "react";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button, Card, Row, Col, Statistic, Space, Typography, Tag, Alert } from "antd";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import {
  BrowserPerformancePlugin,
  PerformancePageloadEvent,
  PerformanceFIDEvent,
  PerformanceCLSEvent,
  PerformanceLongTaskEvent
} from "@tracing/browser-performance";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph, Text } = Typography;

interface MetricState {
  value: string | number;
  suffix: string;
}

const metricDescriptions: Record<string, { label: string; desc: string; good: string; poor: string }> = {
  LCP: {
    label: "LCP",
    desc: "最大内容绘制，页面加载性能",
    good: "< 2.5s",
    poor: "> 4s"
  },
  FCP: {
    label: "FCP",
    desc: "首次内容绘制，页面加载性能",
    good: "< 1.8s",
    poor: "> 3s"
  },
  TTFB: {
    label: "TTFB",
    desc: "首字节时间，网络与服务器性能",
    good: "< 800ms",
    poor: "> 1.8s"
  },
  FID: {
    label: "FID",
    desc: "首次输入延迟，交互响应性能",
    good: "< 100ms",
    poor: "> 300ms"
  },
  CLS: {
    label: "CLS",
    desc: "累积布局偏移，视觉稳定性",
    good: "< 0.1",
    poor: "> 0.25"
  },
  Navigation: {
    label: "Navigation",
    desc: "页面导航加载总耗时",
    good: "-",
    poor: "-"
  }
};

const initialMetrics: Record<string, MetricState> = {
  LCP: { value: "-", suffix: "ms" },
  FCP: { value: "-", suffix: "ms" },
  TTFB: { value: "-", suffix: "ms" },
  FID: { value: "-", suffix: "ms" },
  CLS: { value: "-", suffix: "" },
  Navigation: { value: "-", suffix: "ms" }
};

function extractMetricsFromBody(body: Record<string, any>): Record<string, MetricState> {
  const updates: Record<string, MetricState> = {};

  if (body.lcp != null) updates.LCP = { value: body.lcp, suffix: "ms" };
  if (body.fcp != null) updates.FCP = { value: body.fcp, suffix: "ms" };
  if (body.ttfb != null) updates.TTFB = { value: body.ttfb, suffix: "ms" };
  if (body.navLoadTime != null) updates.Navigation = { value: body.navLoadTime, suffix: "ms" };

  return updates;
}

const PerformancePage: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [metrics, setMetrics] = useState<Record<string, MetricState>>(initialMetrics);
  const [selectedReport, setSelectedReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();

  const metricsRef = useRef<Record<string, MetricState>>(initialMetrics);

  const handleReport = useCallback((event: string, build: Record<string, any>) => {
    const log = { time: new Date().toLocaleTimeString(), event, build };
    logsRef.current = [log, ...logsRef.current].slice(0, 30);
    setLogs([...logsRef.current]);

    if (event === PerformancePageloadEvent) {
      const updates = extractMetricsFromBody(build.body || {});
      metricsRef.current = { ...metricsRef.current, ...updates };
      setMetrics({ ...metricsRef.current });
    } else if (event === PerformanceFIDEvent) {
      const value = build.body?.value;
      if (value != null) {
        metricsRef.current = { ...metricsRef.current, FID: { value, suffix: "ms" } };
        setMetrics({ ...metricsRef.current });
      }
    } else if (event === PerformanceCLSEvent) {
      const value = build.body?.value;
      if (value != null) {
        metricsRef.current = { ...metricsRef.current, CLS: { value, suffix: "" } };
        setMetrics({ ...metricsRef.current });
      }
    }
  }, []);

  const eventColors: Record<string, string> = {
    [PerformancePageloadEvent]: "orange",
    [PerformanceFIDEvent]: "purple",
    [PerformanceCLSEvent]: "volcano",
    [PerformanceLongTaskEvent]: "red"
  };

  useEffect(() => {
    const collect = new TracingCore({
      plugins: [
        BrowserPerformancePlugin({
          webVitals: { lcp: true, fid: true, cls: true, fcp: true, ttfb: true },
          navigation: true,
          longTasks: { minDuration: 50 },
          memory: false,
          batchPageLoad: true
        }),
        BuildPlugin()
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        handleReport(event, build);
      }
    });

    collect.init();

    return () => {
      collect.destroy();
    };
  }, [handleReport]);

  function triggerScroll() {
    window.scrollBy(0, 300);
    setTimeout(() => window.scrollTo(0, 0), 500);
    setTimeout(() => window.scrollBy(0, 500), 1000);
  }

  function triggerCLS() {
    const div = document.createElement("div");
    div.style.cssText = "width:100px;height:100px;background:red;margin:10px;";
    document.body.prepend(div);
  }

  function triggerLongTask() {
    const end = performance.now() + 200;
    while (performance.now() < end) {}
  }

  return (
    <>
      <Title level={3}>性能指标监控（browser-performance）</Title>

      <Alert
        type="info"
        showIcon
        message="LCP / FCP / TTFB / Navigation Timing 合并为 performance-pageload 页面加载时上报 | FID 首次交互时上报 | CLS 页面关闭时上报"
        style={{ marginBottom: 16, fontSize: 13 }}
      />

      <Card size="small" style={{ marginBottom: 16, fontSize: 12 }}>
        <Space wrap size={[16, 4]}>
          {Object.entries(metricDescriptions).map(([key, info]) => (
            <Text key={key}>
              <Text strong>{info.label}</Text>
              <Text type="secondary"> {info.desc}</Text>
              <Text style={{ color: "#52c41a" }}> 良好{info.good}</Text>
              <Text style={{ color: "#ff4d4f" }}> 较差{info.poor}</Text>
            </Text>
          ))}
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时指标">
            <Row gutter={[8, 8]}>
              {Object.entries(metrics).map(([key, state]) => {
                const info = metricDescriptions[key];
                return (
                  <Col span={8} key={key}>
                    <Statistic
                      title={info?.label || key}
                      value={state.value}
                      suffix={state.suffix}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="事件流水" bodyStyle={{ padding: 8, maxHeight: 250, overflow: "auto" }}>
            {logs.length === 0 ? (
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                暂无数据，页面加载后自动上报 performance-pageload
              </Paragraph>
            ) : (
              logs.map((log, i) => (
                <Paragraph
                  key={i}
                  onClick={() => {
                    setSelectedIndex(i);
                    setSelectedReport({ event: log.event, record: log.build, time: log.time });
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
                    color={eventColors[log.event] || "default"}
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
          <Card size="small" title="测试用例" style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button onClick={() => triggerLongTask()}>模拟长任务（200ms 循环）</Button>
              <Button onClick={() => triggerCLS()}>模拟布局偏移（CLS）</Button>
              <Button onClick={() => triggerScroll()}>模拟页面滚动</Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <ReportPanel
            event={selectedReport?.event}
            record={selectedReport?.record}
            time={selectedReport?.time}
            fromHistory={selectedIndex >= 0}
          />
        </Col>
      </Row>
    </>
  );
};

export default PerformancePage;
