"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var converter_exports = {};
__export(converter_exports, {
  EnumConverter: () => EnumConverter,
  levelConverter: () => levelConverter,
  roleConverter: () => roleConverter,
  roleGroupTypeConverter: () => roleGroupTypeConverter
});
module.exports = __toCommonJS(converter_exports);
var import_klf_200_api = require("klf-200-api");
class EnumConverter {
  constructor(Mapping) {
    this.Mapping = Mapping;
  }
  convert(value) {
    return this.Mapping[value];
  }
}
const actuatorTypeMap = {
  [import_klf_200_api.ActuatorType.VenetianBlind]: "blind",
  [import_klf_200_api.ActuatorType.RollerShutter]: "shutter.roller",
  [import_klf_200_api.ActuatorType.Awning]: "blind.awning",
  [import_klf_200_api.ActuatorType.WindowOpener]: "window",
  [import_klf_200_api.ActuatorType.GarageOpener]: "opener.garage",
  [import_klf_200_api.ActuatorType.Light]: "light",
  [import_klf_200_api.ActuatorType.GateOpener]: "opener.gate",
  [import_klf_200_api.ActuatorType.RollingDoorOpener]: "opener.door.rolling",
  [import_klf_200_api.ActuatorType.Lock]: "lock",
  [import_klf_200_api.ActuatorType.Blind]: "blind",
  [import_klf_200_api.ActuatorType.DualShutter]: "shutter.dual",
  [import_klf_200_api.ActuatorType.HeatingTemperatureInterface]: "thermo",
  [import_klf_200_api.ActuatorType.OnOffSwitch]: "switch",
  [import_klf_200_api.ActuatorType.HorizontalAwning]: "awning.horizontal",
  [import_klf_200_api.ActuatorType.ExternalVentianBlind]: "blind.venetion",
  [import_klf_200_api.ActuatorType.LouvreBlind]: "blind.louvre",
  [import_klf_200_api.ActuatorType.CurtainTrack]: "track.curtain",
  [import_klf_200_api.ActuatorType.VentilationPoint]: "thermo.ventilation",
  [import_klf_200_api.ActuatorType.ExteriorHeating]: "thermo.heating.outdoor",
  [import_klf_200_api.ActuatorType.HeatPump]: "thermo.heating.pump",
  [import_klf_200_api.ActuatorType.IntrusionAlarm]: "alarm.intrusion",
  [import_klf_200_api.ActuatorType.SwingingShutter]: "shutter.swinging"
};
const groupTypeMap = {
  [import_klf_200_api.GroupType.UserGroup]: "group.user",
  [import_klf_200_api.GroupType.Room]: "group.room",
  [import_klf_200_api.GroupType.House]: "group.house",
  [import_klf_200_api.GroupType.All]: "group.all"
};
const roleConverter = new EnumConverter(actuatorTypeMap);
const roleGroupTypeConverter = new EnumConverter(groupTypeMap);
const levelTypeMap = {
  [import_klf_200_api.ActuatorType.VenetianBlind]: "level.blind",
  [import_klf_200_api.ActuatorType.RollerShutter]: "level.blind",
  [import_klf_200_api.ActuatorType.Awning]: "level.blind",
  [import_klf_200_api.ActuatorType.WindowOpener]: "level.blind",
  [import_klf_200_api.ActuatorType.GarageOpener]: "level.blind",
  [import_klf_200_api.ActuatorType.Light]: "level.dimmer",
  [import_klf_200_api.ActuatorType.GateOpener]: "level.blind",
  [import_klf_200_api.ActuatorType.RollingDoorOpener]: "level.blind",
  [import_klf_200_api.ActuatorType.Blind]: "level.blind",
  [import_klf_200_api.ActuatorType.DualShutter]: "level.blind",
  [import_klf_200_api.ActuatorType.HorizontalAwning]: "level.blind",
  [import_klf_200_api.ActuatorType.ExternalVentianBlind]: "level.blind",
  [import_klf_200_api.ActuatorType.LouvreBlind]: "level.blind",
  [import_klf_200_api.ActuatorType.CurtainTrack]: "level.curtain",
  [import_klf_200_api.ActuatorType.SwingingShutter]: "level.blind"
};
const levelConverter = new EnumConverter(levelTypeMap);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EnumConverter,
  levelConverter,
  roleConverter,
  roleGroupTypeConverter
});
//# sourceMappingURL=converter.js.map
