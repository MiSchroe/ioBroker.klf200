'use strict';

const _ = require('underscore');

/**
 * Converts an array of objects to an object.
 * The object's properties are fetched from the
 * id property of the original object of each element
 * and the value consists of the remaining properties.
 * 
 * @param {Object[]} klfArray Array with internal KLF interface's result data.
 *                         It consists typically of objects with id, name and other properties.
 * @returns {object} Returns an object with properties for each id and their values set to
 *                   a copy of the original object but without the id property.
 */
exports.convertKlfArrayToDictionary = function convertKlfArrayToDictionary(klfArray)
{
    return klfArray.reduce(
        function(res, curr)
        {
            if (!('id' in curr))
            {
                throw new TypeError('Missing property "id"');
            }
            res[curr.id] = _.omit(curr, 'id');
            return res;
        },
        {}
    );
}