const pkg = require("./package.json");

/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:8000/index.html"
  },
  preset: "ts-jest",
  setupFilesAfterEnv: ["./test-utils/setupFilesAfterEnv.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json"
      }
    ]
  },
  globals: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: pkg.version,
    __NAME__: pkg.name
  },
  coverageDirectory: "coverage",
  coverageReporters: ["html", "lcov", "text"],
  collectCoverageFrom: ["packages/*/src/**/*.ts"],
  watchPathIgnorePatterns: ["/node_modules/", "/dist/", "/.git/", "/packages/example/"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    "^@tracker/(.*?)$": "<rootDir>/packages/$1/src"
  },
  rootDir: __dirname,
  testMatch: ["<rootDir>/packages/**/__tests__/**/*spec.[jt]s?(x)"]
};
