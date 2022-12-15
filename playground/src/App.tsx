import React from "react";
import { Button } from "antd";

import { collect } from "./collect";

function App() {
  return (
    <div className="App">
      <p>{1}</p>
      <Button onClick={() => collect.report("test", { a: 1 })}>add count number</Button>
    </div>
  );
}

export default App;
