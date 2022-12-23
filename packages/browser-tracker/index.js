"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/browser-tracker.cjs.prod.js.js.js");
} else {
  module.exports = require("./dist/browser-tracker.cjs.js.js.js");
}
