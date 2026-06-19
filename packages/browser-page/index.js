"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/browser-page.cjs.prod.js");
} else {
  module.exports = require("./dist/browser-page.cjs.js");
}
