import { Menu } from "antd";
import { Suspense } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import styles from "./app.module.less";

import { routes } from "./routes";

function App() {
  const { pathname } = useLocation();

  return (
    <div className={styles["container"]}>
      <div className={styles["container-nav"]}>
        <Menu
          selectedKeys={[pathname]}
          items={routes.map(item => ({ label: <Link to={item.key}>{item.label}</Link>, key: item.key }))}
        ></Menu>
      </div>
      <div className={styles["container-body"]}>
        <Routes>
          {routes.map(item => (
            <Route
              key={item.key}
              path={item.key}
              element={<Suspense fallback={<>loading...</>}>{<item.element></item.element>}</Suspense>}
            ></Route>
          ))}
        </Routes>
      </div>
    </div>
  );
}

export default App;
