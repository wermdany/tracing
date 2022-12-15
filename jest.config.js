const pkg = require("./package.json");

module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  setupFilesAfterEnv: ["./test-utils/setupFilesAfterEnv.ts"],
  globals: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: pkg.version,
    __NAME__: pkg.name,
    "ts-jest": {
      tsconfig: "tsconfig.json"
    }
  },
  coverageDirectory: "coverage",
  coverageReporters: ["html", "lcov", "text"],
  collectCoverageFrom: ["packages/*/src/**/*.ts"],
  watchPathIgnorePatterns: ["/node_modules/", "/dist/", "/.git/", "/packages/example/"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    "^@collect/(.*?)$": "<rootDir>/packages/$1/src"
  },
  rootDir: __dirname,
  testMatch: ["<rootDir>/packages/**/__tests__/**/*spec.[jt]s?(x)"],
  testURL: "http://localhost:8000/index.html"
};
