"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/browser-scroll.cjs.prod.js");
} else {
  module.exports = require("./dist/browser-scroll.cjs.js");
}
