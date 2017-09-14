/**
 *
 * klf200 adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "klf200",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js klf200 Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@klf200.com>"
 *          ]
 *          "desc":         "klf200 adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const Promise = require('bluebird');
const klf200api = require('klf-200-api');
const mapTypeId = require(__dirname + '/lib/mapTypeId'); // Mapping of typeId values to channel role names

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.klf200.0
let adapter = utils.adapter('klf200');

// Define some constant values
const deviceScenes = 'scenes';
const deviceProducts = 'products';

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// // is called if a subscribed object changes
// adapter.on('objectChange', function (id, obj) {
//     // Warning, obj can be null if it was deleted
//     adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
// });

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // // Warning, state can be null if it was deleted

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        Promise.coroutine(function* () {
            try {
                // TODO: Get previous state (for rollback if state change isn't possible)
                let oldState;


                // Check for product, e.g. id = klf200.0.products.0.level
                if (id.match(/^klf200\.[0-9]+\.products\.[0-9]+\.level$/)) {
                    let sceneId = yield getSceneForProductLevel(id, state.val);
                }

                // Check for scene

                adapter.setState(id, state.val, true);
            } catch (err) {
                adapter.log.error(`Error during state change for ${id}: ${err}`);
            }
        })();
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
// adapter.on('message', function (obj) {
//     if (typeof obj == 'object' && obj.message) {
//         if (obj.command == 'send') {
//             // e.g. send email or pushover or whatever
//             console.log('send command');

//             // Send response in callback if required
//             if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
//         }
//     }
// });

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function main() {
    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:

    // Promisifying has to be done at this time, because some methods are generated during initialization only
    // (e.g. setState)
    adapter = Promise.promisifyAll(adapter);
    adapter.objects = Promise.promisifyAll(adapter.objects);

    adapter.log.info('Host: ' + adapter.config.host);
    adapter.log.info('Polling interval (minutes): ' + adapter.config.pollInterval);

    // Connect to KLF interface and read data
    let connection = new klf200api.connection(adapter.config.host);
    Promise.coroutine(function* () {
        try {
            yield connection.loginAsync(adapter.config.password);
            adapter.log.info('Connected to interface.');

            yield adapter.createDeviceAsync(deviceProducts, { name: deviceProducts, desc: "Product list" });
            yield adapter.setObjectAsync(`${deviceProducts}.productsFound`, {
                type: 'state',
                common: {
                    name: 'Number of products found',
                    role: 'value',
                    type: 'number',
                    min: 0,
                    def: 0,
                    read: true,
                    write: false,
                    desc: 'Number of products connected to the interface'
                },
                native: []
            });
            yield adapter.setStateAsync(`${deviceProducts}.productsFound`, { val: 0, ack: true, q: 0x42 });

            yield adapter.createDeviceAsync(deviceScenes, { name: deviceScenes, desc: "Scene list" });
            yield adapter.setObjectAsync(`${deviceScenes}.scenesFound`, {
                type: 'state',
                common: {
                    name: 'Number of scenes found',
                    role: 'value',
                    type: 'number',
                    min: 0,
                    def: 0,
                    read: true,
                    write: false,
                    desc: 'Number of scenes defined in the interface'
                },
                native: []
            });
            yield adapter.setStateAsync(`${deviceScenes}.scenesFound`, { val: 0, ack: true, q: 0x42 });

            adapter.log.info('Getting installed products...');
            let products = yield new klf200api.products(connection).getAsync();
            adapter.log.info(`Found ${products.length} product(s).`);
            yield adapter.setStateAsync(`${deviceProducts}.productsFound`, { val: products.length, ack: true });
            let productsFoundObject = yield adapter.getObjectAsync(`${deviceProducts}.productsFound`);
            productsFoundObject.native = products || {};

            yield Promise.mapSeries(products, function (product) {
                adapter.log.debug(`Found product ${product.name}`);
                return createProductStateAsync(product);
            });

            adapter.log.info('Getting scenes...');
            let scenes = yield new klf200api.scenes(connection).getAsync();
            adapter.log.info(`Found ${scenes.length} scene(s).`);
            yield adapter.setStateAsync(`${deviceScenes}.scenesFound`, { val: scenes.length, ack: true });
            let scenesFoundObject = yield adapter.getObjectAsync(`${deviceScenes}.scenesFound`);
            scenesFoundObject.native = scenes || {};

            yield Promise.mapSeries(scenes, function (scene) {
                adapter.log.debug(`Found scene ${scene.name}`);
                return createSceneStateAsync(scene);
            });

            let test = yield getSceneForProductLevel('klf200.0.products.4.level', 30);
            
            // Subscribe to all level states
            adapter.subscribeStates('*level');
            // Subscribe to all silent states
            adapter.subscribeStates('*silent');
        }
        catch (err) {
            adapter.log.error(`Error during initialization occured: ${err}`);
        }
        finally {
            if (connection.token) {
                adapter.log.info('Disconnected from interface.');
                yield connection.logoutAsync();
            }
        }
    })();


    // .finally(function () {
    //     return connection.logoutAsync();
    // })
    // .then(function () {
    //     adapter.log.info('Disconnected from interface.');
    // });
    // connection.loginAsync(adapter.config.password)
    //     .then(function () {
    //         adapter.log.info('Connected to interface.');
    //     })
    //     .then(function () {
    //         // Create 
    //     })
    //     .then(function () {
    //         adapter.log.info('Getting installed products...');
    //         return new klf200api.products(connection).getAsync();
    //     })
    //     .then(function (products) {
    //         adapter.log.info(`Found ${products.length} product(s).`);
    //         products.forEach(function(product) {
    //             adapter.log.debug(`Found product ${product.name}`);
    //         });
    //     })
    //     .then(function () {
    //         adapter.log.info('Getting scenes...');
    //         return new klf200api.scenes(connection).getAsync();
    //     })
    //     .then(function (scenes) {
    //         adapter.log.info(`Found ${scenes.length} scene(s).`);
    //         scenes.forEach(function(scene) {
    //             adapter.log.debug(`Found scene ${scene.name}`);
    //         });
    //     })
    //     .catch(function (err) {
    //         adapter.log.error(`Error during initialization occured: ${err}`);
    //     })
    //     .finally(function () {
    //         return connection.logoutAsync()
    //             .then(function () {
    //                 adapter.log.info('Disconnected from interface.');
    //             });
    //     });


    // /**
    //  *
    //  *      For every state in the system there has to be also an object of type state
    //  *
    //  *      Here a simple klf200 for a boolean variable named "testVariable"
    //  *
    //  *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
    //  *
    //  */

    // adapter.setObject('testVariable', {
    //     type: 'state',
    //     common: {
    //         name: 'testVariable',
    //         type: 'boolean',
    //         role: 'indicator'
    //     },
    //     native: {}
    // });

    // // in this klf200 all states changes inside the adapters namespace are subscribed
    // adapter.subscribeStates('*');


    // /**
    //  *   setState examples
    //  *
    //  *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
    //  *
    //  */

    // // the variable testVariable is set to true as command (ack=false)
    // adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    // adapter.setState('testVariable', {val: true, ack: true});

    // // same thing, but the state is deleted after 30s (getState will return null afterwards)
    // adapter.setState('testVariable', {val: true, ack: true, expire: 30});



    // // examples for the checkPassword/checkGroup functions
    // adapter.checkPassword('admin', 'iobroker', function (res) {
    //     console.log('check user admin pw ioboker: ' + res);
    // });

    // adapter.checkGroup('admin', 'admin', function (res) {
    //     console.log('check group user admin group admin: ' + res);
    // });



}

/**
 * Creates the product channels and states for the given product
 * 
 * @param {product} product 
 * @returns {Promise} Returns a promise that will fulfill after all steps are finished.
 */
function createProductStateAsync(product) {
    if (!product)
        return Promise.reject(new Error('Can\'t create states for empty product.'));

    const category = 'category';
    const scenesCount = 'scenesCount';
    const productId = product.id.toString();
    const level = 'level';
    const levelTypes = [1, 2, 3, 4, 10, 13, 16, 17, 18, 24];

    return adapter.createChannelAsync(deviceProducts, productId, { name: product.name, role: mapTypeId.getRole(product.typeId) }, product)
        .then(function () {
            return adapter.createStateAsync(deviceProducts, productId, category, {
                name: category,
                role: 'text',
                type: 'string',
                read: true,
                write: false,
                desc: 'Category of the registered product'
            });
        })
        .then(function () {
            return adapter.setStateAsync(`${deviceProducts}.${productId}.${category}`, { val: product.category, ack: true });
        })
        .then(function () {
            return adapter.createStateAsync(deviceProducts, productId, scenesCount, {
                name: scenesCount,
                role: 'value',
                type: 'number',
                read: true,
                write: false,
                desc: 'Number of scenes the product is used in'
            });
        })
        .then(function () {
            return adapter.setStateAsync(`${deviceProducts}.${productId}.${scenesCount}`, { val: product.scenes.length || 0, ack: true });
        })
        .then(function () {
            if (levelTypes.find((val) => { return val === product.id; }))
                return adapter.createStateAsync(deviceProducts, productId, level, {
                    name: level,
                    role: 'level',
                    type: 'number',
                    min: 0,
                    max: 100,
                    unit: '%',
                    read: true,
                    write: true,
                    desc: 'Opening level in percent'
                })
                    .then(function () {
                        return adapter.setStateAsync(`${deviceProducts}.${productId}.${level}`, { val: 0, ack: true, q: 0x42 });    // Quality issue, because we can only assume the opening level
                    });
            else
                return Promise.resolve();
        })
}

/**
 * Creates the scene channels and states for the given scene
 * 
 * @param {scene} scene 
 * @returns {Promise} Returns a promise that will fulfill after all steps are finished.
 */
function createSceneStateAsync(scene) {
    if (!scene)
        return Promise.reject(new Error('Can\'t create states for empty scene.'));

    const silent = 'silent';
    const productsCount = 'productsCount';
    const run = 'run';
    const sceneId = scene.id.toString();

    return adapter.createChannelAsync(deviceScenes, sceneId, { name: scene.name, role: 'scene' }, scene)
        .then(function () {
            return adapter.createStateAsync(deviceScenes, sceneId, silent, {
                name: silent,
                role: 'indicator.silent',
                type: 'boolean',
                read: true,
                write: true,
                desc: 'Silent mode of the scene'
            });
        })
        .then(function () {
            adapter.setState(`${deviceScenes}.${sceneId}.${silent}`, { val: scene.silent, ack: true });
        })
        .then(function () {
            return adapter.createStateAsync(deviceScenes, sceneId, productsCount, {
                name: productsCount,
                role: 'value',
                type: 'number',
                read: true,
                write: false,
                desc: 'Number of products in the scene'
            });
        })
        .then(function () {
            adapter.setState(`${deviceScenes}.${sceneId}.${productsCount}`, { val: scene.products.length || 0, ack: true });
        })
        .then(function () {
            return adapter.createStateAsync(deviceScenes, sceneId, run, {
                name: run,
                role: 'button.play',
                type: 'boolean',
                def: false,
                read: false,
                write: true,
                desc: 'Shows the running state of a scene. Set to true to run a scene.'
            })
                .then(function () {
                    adapter.setState(`${deviceScenes}.${sceneId}.${run}`, { val: false, ack: true, q: 0x42 });    // Quality issue, because we can only assume the running state
                });
        })
}

function getSceneForProductLevel(id, level) {
    let productName;
    return Promise.cast(Promise.coroutine(function* () {
        try {
            let idDCS = adapter.idToDCS(id);
            let productChannelId = [idDCS.device, idDCS.channel].join('.');

            let productChannel = yield adapter.getObjectAsync(productChannelId);
            productName = productChannel.common.name;

            let scenes = yield adapter.objects.getObjectViewAsync(
                'klf200', 'listSingleProductScenes',
                {startkey: [productName, level], endkey: [productName, 101]}
            );

            if (!scenes || !scenes.length) return Promise.reject(new Error(`No matching scene for product ${productName} and level ${level}.`));

        } catch (err) {
            let errHelper = err;
            if (!(err instanceof Error)) {
                errHelper = JSON.stringify(err);
            }
            adapter.log.error(`Error during lookup scene for product ${productName} and level ${level}: ${errHelper}`);
        }
    })());
}

/**
 * Runs the given scene by name or by id
 * 
 * @param {string|number} sceneNameOrId
 * @returns {Promise} Returns a promise that will fulfill after the scene has run.
 */
function runScene(sceneNameOrId) {

}