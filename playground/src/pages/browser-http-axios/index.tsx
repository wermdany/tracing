import type { FC } from "react";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Row, Col, Statistic, Space, Typography, Tag, message } from "antd";
import axios from "axios";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { BrowserHttpAxiosPlugin, BrowserHttpRequestEvent } from "@tracing/browser-http-axios";
import ReportPanel from "../../components/ReportPanel";

const { Title, Paragraph } = Typography;

const httpSuccess = axios.create({ baseURL: "/apis", timeout: 3000 });
const httpAll = axios.create({ baseURL: "/apis", timeout: 3000 });
const httpFiltered = axios.create({ baseURL: "/apis", timeout: 3000 });
const httpSampled = axios.create({ baseURL: "/apis", timeout: 3000 });

const BrowserHttpAxios: FC = () => {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const logsRef = useRef<Record<string, any>[]>([]);
  const [latestReport, setLatestReport] = useState<{
    event: string;
    record: Record<string, any>;
    time: string;
  }>();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const coreAllRef = useRef<TracingCore>();
  const coreSuccessRef = useRef<TracingCore>();

  useEffect(() => {
    const coreAll = new TracingCore({
      plugins: [
        BuildPlugin(),
        BrowserHttpAxiosPlugin({
          axiosInstance: httpAll,
          shouldRecord: () => true
        })
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    const coreSuccess = new TracingCore({
      plugins: [
        BuildPlugin(),
        BrowserHttpAxiosPlugin({
          axiosInstance: httpSuccess,
          shouldRecord: config => {
            const url = typeof config.url === "string" ? config.url : "";
            return !url.includes("/error") && !url.includes("/timeout");
          }
        })
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    const coreSampled = new TracingCore({
      plugins: [
        BuildPlugin(),
        BrowserHttpAxiosPlugin({
          axiosInstance: httpSampled,
          sampleRate: 0.5
        })
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    const coreFiltered = new TracingCore({
      plugins: [
        BuildPlugin(),
        BrowserHttpAxiosPlugin({
          axiosInstance: httpFiltered,
          shouldRecord: config => {
            const url = typeof config.url === "string" ? config.url : "";
            return url.includes("/success");
          }
        })
      ],
      sendLog: (event: string, build: Record<string, any>) => {
        const log = { time: new Date().toLocaleTimeString(), event, build };
        logsRef.current = [log, ...logsRef.current].slice(0, 20);
        setLogs([...logsRef.current]);
        setSelectedIndex(-1);
        setLatestReport({ event, record: build, time: log.time });
      }
    });

    coreAll.init();
    coreSuccess.init();
    coreSampled.init();
    coreFiltered.init();

    coreAllRef.current = coreAll;
    coreSuccessRef.current = coreSuccess;

    return () => {
      coreAll.destroy();
      coreSuccess.destroy();
      coreSampled.destroy();
      coreFiltered.destroy();
    };
  }, []);

  const send = async (instance: typeof httpAll, url: string, method = "get", data?: any) => {
    try {
      await instance({ method, url, data });
    } catch {
      // expected for error/timeout/cancel
    }
  };

  const sendCancelable = async () => {
    const controller = new AbortController();
    setAbortController(controller);
    try {
      await httpAll.get("/timeout", { signal: controller.signal });
    } catch {
      // expected
    }
  };

  const cancelRequest = () => {
    abortController?.abort();
    setAbortController(null);
  };

  const latest = latestReport?.record || {};

  return (
    <>
      <Title level={3}>Axios 请求监控（browser-http-axios）</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="实时数据">
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Statistic
                  title="最近 URL"
                  value={latest.body?.url ? latest.body.url.substring(0, 20) : "-"}
                />
              </Col>
              <Col span={8}>
                <Statistic title="最近方法" value={latest.body?.method || "-"} />
              </Col>
              <Col span={8}>
                <Statistic title="最近状态" value={latest.body?.status ?? 0} />
              </Col>
              <Col span={8}>
                <Statistic title="最近耗时" value={latest.body?.duration ?? 0} suffix="ms" />
              </Col>
              <Col span={8}>
                <Statistic
                  title="最近错误"
                  value={
                    latest.body?.errorType
                      ? latest.body?.errorType
                      : latest.body?.status >= 400
                      ? `HTTP ${latest.body.status}`
                      : "无"
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
                暂无采集数据，点击下方按钮发送请求
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
                  [{log.time}] {log.build?.body?.method || "?"} {log.build?.body?.status || "?"} —{" "}
                  {log.build?.body?.url
                    ? log.build.body.url.substring(log.build.body.url.lastIndexOf("/") + 1)
                    : "?"}
                </Paragraph>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="基础请求" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button type="primary" onClick={() => send(httpAll, "/success")}>
                GET 成功
              </Button>
              <Button type="primary" onClick={() => send(httpAll, "/success", "post", { key: "value" })}>
                POST 成功
              </Button>
              <Button onClick={() => send(httpAll, "/success", "put", { key: "value" })}>PUT 成功</Button>
              <Button onClick={() => send(httpAll, "/success", "delete")}>DELETE 成功</Button>
            </Space>
          </Card>

          <Card size="small" title="异常请求" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button danger onClick={() => send(httpAll, "/error")}>
                HTTP 500 错误
              </Button>
              <Button danger onClick={() => send(httpAll, "/timeout")}>
                请求超时
              </Button>
              <Button danger onClick={() => send(httpAll, "/not-exist")}>
                404 未找到
              </Button>
              <Button
                danger
                onClick={() => send(httpAll, "https://nonexistent-domain-xxx.com/api/test", "get")}
              >
                网络错误
              </Button>
            </Space>
          </Card>

          <Card size="small" title="取消请求" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button onClick={sendCancelable}>发起可取消请求（超时接口）</Button>
              <Button danger onClick={cancelRequest} disabled={!abortController}>
                取消请求
              </Button>
            </Space>
          </Card>

          <Card size="small" title="插件配置测试" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button
                onClick={() => {
                  coreAllRef.current?.report("manual_http", {
                    url: "/success",
                    method: "GET",
                    status: 200
                  });
                }}
              >
                手动上报请求数据
              </Button>
              <Button
                onClick={async () => {
                  message.info("只记录 /error 和 /timeout，观察右侧历史");
                  await send(httpSuccess, "/success");
                  await send(httpSuccess, "/error");
                  await send(httpSuccess, "/timeout");
                }}
              >
                shouldRecord 过滤（只记非成功）
              </Button>
              <Button
                onClick={async () => {
                  message.info("采样率 50%，重复点击观察是否采样");
                  for (let i = 0; i < 10; i++) {
                    await send(httpSampled, "/success");
                  }
                }}
              >
                sampleRate 0.5（批量10次）
              </Button>
              <Button
                onClick={async () => {
                  message.info("只记录 /success 路径");
                  await send(httpFiltered, "/success");
                  await send(httpFiltered, "/error");
                  await send(httpFiltered, "/timeout");
                }}
              >
                shouldRecord 白名单（只记 /success）
              </Button>
            </Space>
          </Card>

          <Card size="small" title="并发请求" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Button
                onClick={async () => {
                  await Promise.all([
                    send(httpAll, "/success"),
                    send(httpAll, "/success"),
                    send(httpAll, "/error"),
                    send(httpAll, "/timeout")
                  ]);
                }}
              >
                4 个并发请求
              </Button>
              <Button
                onClick={async () => {
                  await Promise.all(Array.from({ length: 10 }, (_, i) => send(httpAll, "/success")));
                }}
              >
                10 个并发成功
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

export default BrowserHttpAxios;
