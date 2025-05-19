"use strict";

import { ActuatorType, GroupType } from "klf-200-api";

export type EnumConversionInfo = {
	[value: number]: string;
};

/**
 * Converts an enum value to a string.
 */
export class EnumConverter<T extends number> {
	/**
	 * Creates a new EnumConverter instance.
	 *
	 * @param Mapping The mapping of enum values to strings.
	 */
	constructor(readonly Mapping: EnumConversionInfo) {}

	/**
	 * Converts an enum value to a string.
	 *
	 * @param value The value to convert.
	 * @returns The string representation of the value.
	 */
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

const groupTypeMap = {
	[GroupType.UserGroup]: "group.user",
	[GroupType.Room]: "group.room",
	[GroupType.House]: "group.house",
	[GroupType.All]: "group.all",
};

export const roleConverter = new EnumConverter<ActuatorType>(actuatorTypeMap);
export const roleGroupTypeConverter = new EnumConverter<GroupType>(groupTypeMap);

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
