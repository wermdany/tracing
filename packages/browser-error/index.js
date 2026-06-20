"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/browser-error.cjs.prod.js");
} else {
  module.exports = require("./dist/browser-error.cjs.js");
}
