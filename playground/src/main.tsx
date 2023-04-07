import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";

import "./main.less";

const el = document.getElementById("root")!;

ReactDOM.createRoot(el).render(
  <ConfigProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConfigProvider>
);
