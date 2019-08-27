"use strict";

import { ActuatorType } from "klf-200-api";

export type EnumConversionInfo = {
	[value: number]: string;
};

export class EnumConverter<T extends number> {
	constructor(readonly Mapping: EnumConversionInfo) {}

	public convert(value: T): string {
		return this.Mapping[value];
	}
}

const actuatorTypeMap = {
	[ActuatorType.VenetianBlind]: "blind",
	[ActuatorType.RollerShutter]: "shutter.roller",
	[ActuatorType.Awning]: "blind.awning",
	[ActuatorType.WindowOpener]: "window",
	[ActuatorType.GarageOpener]: "opener.garage",
	[ActuatorType.Light]: "light",
	[ActuatorType.GateOpener]: "opener.gate",
	[ActuatorType.RollingDoorOpener]: "opener.door.rolling",
	[ActuatorType.Lock]: "lock",
	[ActuatorType.Blind]: "blind",
	[ActuatorType.DualShutter]: "shutter.dual",
	[ActuatorType.HeatingTemperatureInterface]: "thermo",
	[ActuatorType.OnOffSwitch]: "switch",
	[ActuatorType.HorizontalAwning]: "awning.horizontal",
	[ActuatorType.ExternalVentianBlind]: "blind.venetion",
	[ActuatorType.LouvreBlind]: "blind.louvre",
	[ActuatorType.CurtainTrack]: "track.curtain",
	[ActuatorType.VentilationPoint]: "thermo.ventilation",
	[ActuatorType.ExteriorHeating]: "thermo.heating.outdoor",
	[ActuatorType.HeatPump]: "thermo.heating.pump",
	[ActuatorType.IntrusionAlarm]: "alarm.intrusion",
	[ActuatorType.SwingingShutter]: "shutter.swinging",
};

export const roleConverter = new EnumConverter<ActuatorType>(actuatorTypeMap);

const levelTypeMap = {
	[ActuatorType.VenetianBlind]: "level.blind",
	[ActuatorType.RollerShutter]: "level.blind",
	[ActuatorType.Awning]: "level.blind",
	[ActuatorType.WindowOpener]: "level.blind",
	[ActuatorType.GarageOpener]: "level.blind",
	[ActuatorType.Light]: "level.dimmer",
	[ActuatorType.GateOpener]: "level.blind",
	[ActuatorType.RollingDoorOpener]: "level.blind",
	[ActuatorType.Blind]: "level.blind",
	[ActuatorType.DualShutter]: "level.blind",
	[ActuatorType.HorizontalAwning]: "level.blind",
	[ActuatorType.ExternalVentianBlind]: "level.blind",
	[ActuatorType.LouvreBlind]: "level.blind",
	[ActuatorType.CurtainTrack]: "level.curtain",
	[ActuatorType.SwingingShutter]: "level.blind",
};

export const levelConverter = new EnumConverter<ActuatorType>(levelTypeMap);
