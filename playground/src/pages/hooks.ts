import type { TracingPlugin } from "@tracing/core";

import { TracingCore } from "@tracing/core";
import { BuildPlugin } from "browser-tracing";
import { useEffect, useRef } from "react";

interface UseTracingConfig {
  plugins: TracingPlugin[];
}

export function useTracing(config: UseTracingConfig) {
  const plugins = config.plugins;

  const instance = useRef<TracingCore>();

  if (!instance.current) {
    instance.current = new TracingCore({
      plugins: [BuildPlugin()].concat(plugins)
    });
  }

  useEffect(() => {
    instance.current?.init();

    return () => {
      instance.current?.destroy();
    };
  }, []);

  return {
    instance: instance.current
  };
}
