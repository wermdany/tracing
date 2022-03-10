module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  globals: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: require("./package.json").version,
    "ts-jest": {
      tsconfig: "tsconfig.json"
    }
  },
  coverageDirectory: "coverage",
  coverageReporters: ["html", "lcov", "text"],
  collectCoverageFrom: ["packages/*/src/**/*.ts"],
  watchPathIgnorePatterns: ["/node_modules/", "/dist/", "/.git/"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    "^@tracker/(.*?)$": "<rootDir>/packages/$1/src"
  },
  rootDir: __dirname,
  testMatch: ["<rootDir>/packages/**/__tests__/**/*spec.[jt]s?(x)"]
};
