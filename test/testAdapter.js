/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var chai = require('chai');
var expect = chai.expect;
var chaiFuzzy = require('chai-fuzzy');
chai.use(chaiFuzzy);    // Helps checking the logged values


/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "[iI]gnored" }]*/
// const systemUnderTestIgnored = require('../main');


var setup  = require(__dirname + '/lib/setup');
const mockserver = require('mockserver-grunt');
const mockServerClient = require('mockserver-client').mockServerClient;
const fs = require('fs');
const sinon = require('sinon');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;
var sendToID = 1;

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);

// Test data
const testURL = 'http://localhost:1080';
const authAPI = '/api/v1/auth';
const productsAPI = '/api/v1/products';
const scenesAPI = '/api/v1/scenes';
const testValidPW = 'velux123';
const testToken = '/WGoAkAwn1fSOV04E2QBRA==';
const actionLogin = 'login';
const actionLogout = 'logout';
const actionProductsGet = 'get';
const actionScenesGet = 'get';
const loginRequest = { action: actionLogin, params: { password: testValidPW } };
const logoutRequest = {
    action: actionLogout, params: {}
};
const productsGetRequest = { action: actionProductsGet, params: {} };
const productsGetResponse = {
    token: testToken,
    result: true,
    "deviceStatus": "IDLE",
    "data": [
        {
            "name": "Windows bathroom",
            "category": "Window opener",
            "id": 0,
            "typeId": 4,
            "subtype": 1,
            "scenes": [
                "Some windows"
            ]
        },
        {
            "name": "Window sleeping room",
            "category": "Window opener",
            "id": 1,
            "typeId": 4,
            "subtype": 1,
            "scenes": [
                "Some windows",
                "Window sleeping room 0%",
                "Window sleeping room 100%"
            ]
        },
        {
            "name": "Window kids room",
            "category": "Window opener",
            "id": 2,
            "typeId": 4,
            "subtype": 1,
            "scenes": []
        },
        {
            "name": "Roller shutter sleeping room",
            "category": "Roller shutter",
            "id": 3,
            "typeId": 2,
            "subtype": 0,
            "scenes": []
        },
        {
            "name": "Window kitchen",
            "category": "Window opener",
            "id": 4,
            "typeId": 4,
            "subtype": 1,
            "scenes": [
                "Window kitchen 10%",
                "Window kitchen 20%"
            ]
        }
    ],
    "errors": []
};

const scenesGetRequest = { action: actionScenesGet, params: {} };
const scenesGetResponse = {
    "token": testToken,
    "result": true,
    "deviceStatus": "IDLE",
    "data": [{
        "name": "Window kitchen 10%",
        "id": 0,
        "silent": false,
        "products": [{
            "typeId": 4,
            "name": "Window kitchen",
            "actuator": 0,
            "status": 10
        }
        ]
    },
    {
        "name": "Window kitchen 20%",
        "id": 1,
        "silent": false,
        "products": [{
            "typeId": 4,
            "name": "Window kitchen",
            "actuator": 0,
            "status": 20
        }
        ]
    },
    {
        "name": "Window sleeping room 0%",
        "id": 2,
        "silent": true,
        "products": [{
            "typeId": 4,
            "name": "Window sleeping room",
            "actuator": 0,
            "status": 0
        }
        ]
    },
    {
        "name": "Window sleeping room 100%",
        "id": 3,
        "silent": true,
        "products": [{
            "typeId": 4,
            "name": "Window sleeping room",
            "actuator": 0,
            "status": 100
        }
        ]
    },
    {
        "name": "Some windows",
        "id": 4,
        "silent": false,
        "products": [{
            "typeId": 4,
            "name": "Windows bathroom",
            "actuator": 0,
            "status": 50
        },
        {
            "typeId": 4,
            "name": "Window sleeping room",
            "actuator": 0,
            "status": 50
        }
        ]
    }
    ],
    "errors": []
};

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.' + adapterShortName + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        if (cb) cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            if (cb) cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = function (id, state) {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage('system.adapter.' + target, {
        command:    command,
        message:    message,
        from:       'system.adapter.test.0',
        callback: {
            message: message,
            id:      sendToID++,
            ack:     false,
            time:    (new Date()).getTime()
        }
    });
}

var mockClient;

describe('Test ' + adapterShortName + ' adapter', function() {
    before('Test ' + adapterShortName + ' adapter: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        // Remove old mock server jar from tmp
        if (fs.existsSync("./tmp/node_modules/iobroker.klf200/mockserver-netty-3.10.8-jar-with-dependencies.jar")) {
            fs.unlinkSync("./tmp/node_modules/iobroker.klf200/mockserver-netty-3.10.8-jar-with-dependencies.jar");
        }

        // Setup mockserver for simulating the web requests
        mockserver.start_mockserver({serverPort: 1080}).then(function () {
            mockClient = mockServerClient('localhost', 1080);
            // Mocking authentication API
            mockClient.mockAnyResponse({
                "httpRequest": {
                    "method": 'POST',
                    "path": authAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(loginRequest)
                    }
                },
                "httpResponse": {
                    "statusCode": 200,
                    "body": JSON.stringify({ token: testToken, result: true, deviceStatus: 'IDLE', data: {}, errors: [] })
                },
                "times": {
                    "unlimited": true
                }
            });
            mockClient.mockAnyResponse({
                "httpRequest": {
                    "method": 'POST',
                    "path": authAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(logoutRequest)
                    }
                },
                "httpResponse": {
                    "statusCode": 200,
                    "body": JSON.stringify({ result: true, deviceStatus: 'IDLE', data: {}, errors: [] })
                },
                "times": {
                    "unlimited": true
                }
            });

            // Mocking products API
            mockClient.mockAnyResponse({
                "httpRequest": {
                    "method": 'POST',
                    "path": productsAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(productsGetRequest)
                    }
                },
                "httpResponse": {
                    "statusCode": 200,
                    "body": JSON.stringify(productsGetResponse)
                },
                "times": {
                    "unlimited": true
                }
            });

            // Mocking scenes API
            mockClient.mockAnyResponse({
                "httpRequest": {
                    "method": 'POST',
                    "path": scenesAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(scenesGetRequest)
                    }
                },
                "httpResponse": {
                    "statusCode": 200,
                    "body": JSON.stringify(scenesGetResponse)
                },
                "times": {
                    "unlimited": true
                }
            });
        

            setup.setupController(function () {
                var config = setup.getAdapterConfig();
                // enable adapter
                config.common.enabled  = true;
                config.common.loglevel = 'debug';

                //config.native.dbtype   = 'sqlite';
                config.native.host = testURL;
                config.native.password = testValidPW;

                setup.setAdapterConfig(config.common, config.native);
                
                _done();
                setup.startController(true, function(id, obj) {}, function (id, state) {
                        if (onStateChanged) onStateChanged(id, state);
                    },
                    function (_objects, _states) {
                        objects = _objects;
                        states  = _states;

                        _done();
                    });
            });
        });
    });

//     beforeEach('Start adapter', function (done) {
//         // setup.startAdapter(objects, states, 
//         //     function (_objects, _states) {
//         //         objects = _objects;
//         //         states  = _states;

//         //         done();
//         //     }
//         // );
//         setup.startController(true, function(id, obj) {}, function (id, state) {
//             if (onStateChanged) onStateChanged(id, state);
//         },
//         function (_objects, _states) {
//             objects = _objects;
//             states  = _states;

//             done();
//         });
// });

//     afterEach('Stop adapter', function (done) {
//         // setup.stopAdapter(function () {
//         //     setTimeout(done, 0);
//         // });
//         setup.stopController(function () {
//             done();
//         });
// });

/*
    ENABLE THIS WHEN ADAPTER RUNS IN DEAMON MODE TO CHECK THAT IT HAS STARTED SUCCESSFULLY
*/
    it('Test ' + adapterShortName + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(function (res) {
            if (res) console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            objects.setObject('system.adapter.test.0', {
                    common: {

                    },
                    type: 'instance'
                },
                function () {
                    states.subscribeMessage('system.adapter.test.0');
                    done();
                });
        });
    });

    /*
        WAIT for adapter to setup
    */
    it('Test ' + adapterShortName + ' adapter: Wait for adapter to initialize', function (done) {
        this.timeout(30000);
        setTimeout(function () {
            // Check if login/logout was called
            mockClient.verify(
                {
                    "method": 'POST',
                    "path": authAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(loginRequest)
                    }
                }, 1, true
            );

            mockClient.verify(
                {
                    "method": 'POST',
                    "path": authAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(logoutRequest)
                    }
                }, 1, true
            );

            // Check getScenes was called
            mockClient.verify(
                {
                    "method": 'POST',
                    "path": scenesAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(scenesGetRequest)
                    }
                }, 1, true
            );

            // Check getProducts was called
            mockClient.verify(
                {
                    "method": 'POST',
                    "path": productsAPI,
                    "body": {
                        "type": 'JSON',
                        "value": JSON.stringify(productsGetRequest)
                    }
                }, 1, true
            );

            done();
        }, 10000);
    });

    /*
        Check number of products
    */
    it('Test ' + adapterShortName + ' adapter: Check number of products found', function (done) {
        this.timeout(30000);
        checkValueOfState(`${adapterShortName}.0.products.productsFound`, 5, function (res) {
            if (res) console.log(res);
            expect(res, 'Number of products found not correct.').to.be.undefined;
            done();
        });
    });

    /*
        Check number of scenes
    */
    it('Test ' + adapterShortName + ' adapter: Check number of scenes found', function (done) {
        this.timeout(30000);
        checkValueOfState(`${adapterShortName}.0.scenes.scenesFound`, 5, function (res) {
            if (res) console.log(res);
            expect(res, 'Number of scenes found not correct.').to.be.undefined;
            done();
        });
    });

    /*
        Check new login after poll interval
    */
    it('Test ' + adapterShortName + ' adapter: Should login again after poll interval elapsed', function (done) {
        this.timeout(30000);
        
        let pollInterval = setup.getAdapterConfig().native.pollInterval;
        //this.clock.tick((pollInterval + 1)*60*1000);

        mockClient.verify(
            {
                "method": 'POST',
                "path": authAPI,
                "body": {
                    "type": 'JSON',
                    "value": JSON.stringify(loginRequest)
                }
            }, 1, true
        );

        done();
    });

/*
    PUT YOUR OWN TESTS HERE USING
    it('Testname', function ( done) {
        ...
    });

    You can also use "sendTo" method to send messages to the started adapter
*/

    after('Test ' + adapterShortName + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);

            mockServerClient('localhost', 1080).reset();
            mockserver.stop_mockserver();

            done();
        });
    });
});
