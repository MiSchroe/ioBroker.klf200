"use strict";
var import_klf200Adapter = require("./klf200Adapter");
if (require.main !== module) {
  module.exports = (options) => new import_klf200Adapter.Klf200(options);
} else {
  (() => new import_klf200Adapter.Klf200())();
}
//# sourceMappingURL=main.js.map
