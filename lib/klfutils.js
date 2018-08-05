'use strict';

const _ = require('lodash');

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

/**
 * Gets the difference between two arrays of KLF products.
 * Products are considered new or deleted if based on their id
 * the name, category, typeId or subtype differs.
 * Products are considered changed if only the scenes differ.
 * 
 * @param {Object[]} oldProducts Array with internal KLF interface's result data (the old data)
 * @param {Object[]} newProducts Array with internal KLF interface's result data (the new data)
 * @returns {object} Returns an object with new, deleted and changed objects.
 */
exports.getKlfProductDifferences = function getKlfProductDifferences(oldProducts, newProducts)
{
    const compareProperties = ['name', 'category', 'typeId', 'subtype'];

    let result = {
        "newProducts": [],
        "deletedProducts": [],
        "changedProducts": []
    };

    // Convert the arrays to dictionaries (makes comparision easier)
    let oldProductsDictionary = this.convertKlfArrayToDictionary(oldProducts);
    let newProductsDictionary = this.convertKlfArrayToDictionary(newProducts);

    // Check for new or changed products:
    _.forEach(newProducts, function (value) {
        let id = value.id.toString();
        let oldProduct = oldProductsDictionary[id];
        if (undefined === oldProduct
            || !_.isEqual(_.pick(oldProduct, compareProperties), _.pick(value, compareProperties)))
        {
            result.newProducts.push(value);
        }
        else if (!_.isEqual(oldProduct.scenes, value.scenes))
        {
            result.changedProducts.push(value);
        }
    });

    // Check for deleted products:
    _.forEach(oldProducts, function (value)  {
        let id = value.id.toString();
        let newProduct = newProductsDictionary[id];
        if (undefined === newProduct
            || !_.isEqual(_.pick(newProduct, compareProperties), _.pick(value, compareProperties)))
        {
            result.deletedProducts.push(value);
        }
    });

    return result;
}

/**
 * Gets the difference between two arrays of KLF scenes.
 * Scenes are considered new or deleted if based on their id
 * the name or products differs.
 * Scenes are considered changed if the silent property differs.
 * 
 * @param {Object[]} oldScenes Array with internal KLF interface's result data (the old data)
 * @param {Object[]} newScenes Array with internal KLF interface's result data (the new data)
 * @returns {object} Returns an object with new, deleted and changed objects.
 */
exports.getKlfSceneDifferences = function getKlfSceneDifferences(oldScenes, newScenes)
{
    const compareProperties = ['name', 'products'];

    let result = {
        "newScenes": [],
        "deletedScenes": [],
        "changedScenes": []
    };

    // Convert the arrays to dictionaries (makes comparision easier)
    let oldScenesDictionary = this.convertKlfArrayToDictionary(oldScenes);
    let newScenesDictionary = this.convertKlfArrayToDictionary(newScenes);

    // Check for new or changed scenes:
    _.forEach(newScenes, function (value) {
        let id = value.id.toString();
        let oldScene = oldScenesDictionary[id];
        if (undefined === oldScene
            || !_.isEqual(_.pick(oldScene, compareProperties), _.pick(value, compareProperties)))
        {
            result.newScenes.push(value);
        }
        else if (!_.isEqual(oldScene.silent, value.silent))
        {
            result.changedScenes.push(value);
        }
    });

    // Check for deleted scenes:
    _.forEach(oldScenes, function (value)  {
        let id = value.id.toString();
        let newScene = newScenesDictionary[id];
        if (undefined === newScene
            || !_.isEqual(_.pick(newScene, compareProperties), _.pick(value, compareProperties)))
        {
            result.deletedScenes.push(value);
        }
    });

    return result;
}