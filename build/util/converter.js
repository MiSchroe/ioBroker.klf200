"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levelConverter = exports.roleGroupTypeConverter = exports.roleConverter = exports.EnumConverter = void 0;
const klf_200_api_1 = require("klf-200-api");
class EnumConverter {
    constructor(Mapping) {
        this.Mapping = Mapping;
    }
    convert(value) {
        return this.Mapping[value];
    }
}
exports.EnumConverter = EnumConverter;
const actuatorTypeMap = {
    [klf_200_api_1.ActuatorType.VenetianBlind]: "blind",
    [klf_200_api_1.ActuatorType.RollerShutter]: "shutter.roller",
    [klf_200_api_1.ActuatorType.Awning]: "blind.awning",
    [klf_200_api_1.ActuatorType.WindowOpener]: "window",
    [klf_200_api_1.ActuatorType.GarageOpener]: "opener.garage",
    [klf_200_api_1.ActuatorType.Light]: "light",
    [klf_200_api_1.ActuatorType.GateOpener]: "opener.gate",
    [klf_200_api_1.ActuatorType.RollingDoorOpener]: "opener.door.rolling",
    [klf_200_api_1.ActuatorType.Lock]: "lock",
    [klf_200_api_1.ActuatorType.Blind]: "blind",
    [klf_200_api_1.ActuatorType.DualShutter]: "shutter.dual",
    [klf_200_api_1.ActuatorType.HeatingTemperatureInterface]: "thermo",
    [klf_200_api_1.ActuatorType.OnOffSwitch]: "switch",
    [klf_200_api_1.ActuatorType.HorizontalAwning]: "awning.horizontal",
    [klf_200_api_1.ActuatorType.ExternalVentianBlind]: "blind.venetion",
    [klf_200_api_1.ActuatorType.LouvreBlind]: "blind.louvre",
    [klf_200_api_1.ActuatorType.CurtainTrack]: "track.curtain",
    [klf_200_api_1.ActuatorType.VentilationPoint]: "thermo.ventilation",
    [klf_200_api_1.ActuatorType.ExteriorHeating]: "thermo.heating.outdoor",
    [klf_200_api_1.ActuatorType.HeatPump]: "thermo.heating.pump",
    [klf_200_api_1.ActuatorType.IntrusionAlarm]: "alarm.intrusion",
    [klf_200_api_1.ActuatorType.SwingingShutter]: "shutter.swinging",
};
const groupTypeMap = {
    [klf_200_api_1.GroupType.UserGroup]: "group.user",
    [klf_200_api_1.GroupType.Room]: "group.room",
    [klf_200_api_1.GroupType.House]: "group.house",
    [klf_200_api_1.GroupType.All]: "group.all",
};
exports.roleConverter = new EnumConverter(actuatorTypeMap);
exports.roleGroupTypeConverter = new EnumConverter(groupTypeMap);
const levelTypeMap = {
    [klf_200_api_1.ActuatorType.VenetianBlind]: "level.blind",
    [klf_200_api_1.ActuatorType.RollerShutter]: "level.blind",
    [klf_200_api_1.ActuatorType.Awning]: "level.blind",
    [klf_200_api_1.ActuatorType.WindowOpener]: "level.blind",
    [klf_200_api_1.ActuatorType.GarageOpener]: "level.blind",
    [klf_200_api_1.ActuatorType.Light]: "level.dimmer",
    [klf_200_api_1.ActuatorType.GateOpener]: "level.blind",
    [klf_200_api_1.ActuatorType.RollingDoorOpener]: "level.blind",
    [klf_200_api_1.ActuatorType.Blind]: "level.blind",
    [klf_200_api_1.ActuatorType.DualShutter]: "level.blind",
    [klf_200_api_1.ActuatorType.HorizontalAwning]: "level.blind",
    [klf_200_api_1.ActuatorType.ExternalVentianBlind]: "level.blind",
    [klf_200_api_1.ActuatorType.LouvreBlind]: "level.blind",
    [klf_200_api_1.ActuatorType.CurtainTrack]: "level.curtain",
    [klf_200_api_1.ActuatorType.SwingingShutter]: "level.blind",
};
exports.levelConverter = new EnumConverter(levelTypeMap);
//# sourceMappingURL=converter.js.map