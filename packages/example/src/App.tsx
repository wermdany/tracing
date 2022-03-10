import { SendPlugin } from "@tracker/send";
import { TrackerCore } from "@tracker/core";
import { Button } from "antd";

const T = TrackerCore.use(SendPlugin());
const a = new T({});

console.log(a);

function App() {
  return (
    <div className="App">
      <img src="http://localhost:3000/src/favicon.svg" alt="" />
      <Button
        type="primary"
        onClick={async () => {
          console.log(await a.sendReport("a", { a: 1 }));
        }}
      >
        发送
      </Button>
    </div>
  );
}

export default App;
