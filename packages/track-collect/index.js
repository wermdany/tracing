"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/track-collect.cjs.prod.js");
} else {
  module.exports = require("./dist/track-collect.cjs.js");
}
