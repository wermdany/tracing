"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/browser-sender.cjs.prod.js");
} else {
  module.exports = require("./dist/browser-sender.cjs.js");
}
