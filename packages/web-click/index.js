"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/web-click.cjs.prod.js");
} else {
  module.exports = require("./dist/web-click.cjs.js");
}
