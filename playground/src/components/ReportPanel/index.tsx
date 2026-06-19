import type { FC } from "react";

import { Card, Descriptions, Tag, Badge } from "antd";

interface ReportPanelProps {
  event?: string;
  record?: Record<string, any>;
  time?: string;
  fromHistory?: boolean;
}

const ReportPanel: FC<ReportPanelProps> = ({ event, record, time, fromHistory }) => {
  const title = fromHistory ? (
    <span>
      上报数据 <Badge status="warning" text="历史记录" />
    </span>
  ) : (
    "上报数据"
  );

  return (
    <Card title={title} size="small" style={{ marginBottom: 16 }}>
      {!event && !record ? (
        <span style={{ color: "#999" }}>暂无上报数据</span>
      ) : (
        <Descriptions column={1} size="small">
          {time && <Descriptions.Item label="上报时间">{time}</Descriptions.Item>}
          {event && (
            <Descriptions.Item label="事件类型">
              <Tag color="blue">{event}</Tag>
            </Descriptions.Item>
          )}
          {record && (
            <Descriptions.Item label="上报数据">
              <pre style={{ fontSize: 12, margin: 0, maxHeight: 200, overflow: "auto" }}>
                {JSON.stringify(record, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Card>
  );
};

export default ReportPanel;
