'use strict';

/**
 * Converts the interface's typeId value to the corresponding channel role.
 * 
 * @param {number} typeId 
 * @returns {string} Returns the channel role.
 */
exports.getRole = function getRole(typeId) {
    const mapping = {
        "1": "blind",
        "2": "shutter.roller",
        "3": "blind.awning",
        "4": "window",
        "5": "opener.garage",
        "6": "light",
        "7": "opener.gate",
        "8": "opener.door.rolling",
        "9": "lock",
        "10": "blind",
        "11": "secureconfigurationdevice",
        "12": "repeater",
        "13": "shutter.dual",
        "14": "thermo",
        "15": "switch",
        "16": "awning.horizontal",
        "17": "blind.venetion",
        "18": "blind.louvre",
        "19": "track.curtain",
        "20": "thermo.ventilation",
        "21": "thermo.heating.outdoor",
        "22": "thermo.heating.pump",
        "23": "alarm.intrusion",
        "24": "shutter.swinging"
    };
    let result = mapping[typeId.toString()] || '';
    return result;
}

exports.getLevelType = function getLevelType(typeId) {
    const mapping = {
        "1": "level.blind",
        "2": "level.blind",
        "3": "level.blind",
        "4": "level.blind",
        "10": "level.blind",
        "13": "level.blind",
        "16": "level.blind",
        "17": "level.blind",
        "18": "level.blind",
        "24": "level.blind"
    };
    let result = mapping[typeId.toString()] || 'level.blind';
    return result;
}