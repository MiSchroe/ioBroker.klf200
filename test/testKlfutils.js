/* jshint -W097 */// jshint strict:false
/*jslint node: true */
const expect = require('chai').expect;
const klfutils = require('../lib/klfutils');

describe('Test klfutils', function() {
    const oldProducts = [
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
    ];

    const newProducts = [
        {
            "name": "Windows bathroom",
            "category": "Window opener",
            "id": 0,
            "typeId": 4,
            "subtype": 1,
            "scenes": [
                "Some windows",
                "Window kitchen 20%"
            ]
        },
        {
            "name": "Window kids room",
            "category": "Window opener",
            "id": 1,
            "typeId": 4,
            "subtype": 1,
            "scenes": []
        },
        {
            "name": "Roller shutter sleeping room",
            "category": "Roller shutter",
            "id": 2,
            "typeId": 2,
            "subtype": 0,
            "scenes": []
        },
        {
            "name": "Window kitchen",
            "category": "Window opener",
            "id": 3,
            "typeId": 4,
            "subtype": 1,
            "scenes": [
                "Window kitchen 10%",
                "Window kitchen 20%"
            ]
        }
    ];
    
    const oldScenes = [
        {
            "name": "Some windows",
            "id": 0,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Windows bathroom",
                    "actuator": 0,
                    "status": 10
                },
                {
                    "typeId": 4,
                    "name": "Window kitchen",
                    "actuator": 0,
                    "status": 10
                }
            ]
        },
        {
            "name": "Window sleeping room 0%",
            "id": 1,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window sleeping room",
                    "actuator": 0,
                    "status": 0
                }
            ]
        },
        {
            "name": "Window sleeping room 100%",
            "id": 2,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window sleeping room",
                    "actuator": 0,
                    "status": 100
                }
            ]
        },
        {
            "name": "Window kitchen 10%",
            "id": 3,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window kitchen",
                    "actuator": 0,
                    "status": 10
                }
            ]
        },
        {
            "name": "Window kitchen 20%",
            "id": 4,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window kitchen",
                    "actuator": 0,
                    "status": 10
                }
            ]
        }
    ];

    const newScenes = [
        {
            "name": "Some windows",
            "id": 0,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Windows bathroom",
                    "actuator": 0,
                    "status": 10
                }
            ]
        },
        {
            "name": "Window sleeping room 0%",
            "id": 1,
            "silent": true,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window sleeping room",
                    "actuator": 0,
                    "status": 0
                }
            ]
        },
        {
            "name": "Window sleeping room 100%",
            "id": 2,
            "silent": true,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window sleeping room",
                    "actuator": 0,
                    "status": 100
                }
            ]
        },
        {
            "name": "Window kitchen 10%",
            "id": 3,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window kitchen",
                    "actuator": 0,
                    "status": 10
                }
            ]
        },
        {
            "name": "Window kitchen 30%",
            "id": 4,
            "silent": false,
            "products": [
                {
                    "typeId": 4,
                    "name": "Window kitchen",
                    "actuator": 0,
                    "status": 30
                }
            ]
        }
    ];

    it('convertKlfArrayToDictionary should return objects with ids set to the corresponding values', function (done) {
        let testResult = klfutils.convertKlfArrayToDictionary(oldProducts);
        const expectedResult = {
            "0": {
                "name": "Windows bathroom",
                "category": "Window opener",
                "typeId": 4,
                "subtype": 1,
                "scenes": [
                    "Some windows"
                ]
            },
            "1": {
                "name": "Window sleeping room",
                "category": "Window opener",
                "typeId": 4,
                "subtype": 1,
                "scenes": [
                    "Some windows",
                    "Window sleeping room 0%",
                    "Window sleeping room 100%"
                ]
            },
            "2": {
                "name": "Window kids room",
                "category": "Window opener",
                "typeId": 4,
                "subtype": 1,
                "scenes": []
            },
            "3": {
                "name": "Roller shutter sleeping room",
                "category": "Roller shutter",
                "typeId": 2,
                "subtype": 0,
                "scenes": []
            },
            "4": {
                "name": "Window kitchen",
                "category": "Window opener",
                "typeId": 4,
                "subtype": 1,
                "scenes": [
                    "Window kitchen 10%",
                    "Window kitchen 20%"
                ]
            }
        };
        expect(testResult).to.be.an('object');
        expect(testResult).to.be.deep.equal(expectedResult);

        done();
    });

    it('convertKlfArrayToDictionary should throw an error when id property is missing', function (done) {
        const missingIdData =  [
            {
                "name": "Windows bathroom",
                "category": "Window opener",
                "typeId": 4,
                "subtype": 1,
                "scenes": [
                    "Some windows"
                ]
            }
        ];
        let errorFunction = function() {
            let testResult = klfutils.convertKlfArrayToDictionary(missingIdData);
            return testResult;
        }
        expect(errorFunction).to.throw();

        done();
    });

    it('getKlfProductDifferences should create the correct list of new, deleted or changed products', function (done) {
        const expectedResult = {
            "newProducts": [
                        {
                            "name": "Window kids room",
                            "category": "Window opener",
                            "id": 1,
                            "typeId": 4,
                            "subtype": 1,
                            "scenes": []
                        },
                        {
                            "name": "Roller shutter sleeping room",
                            "category": "Roller shutter",
                            "id": 2,
                            "typeId": 2,
                            "subtype": 0,
                            "scenes": []
                        },
                        {
                            "name": "Window kitchen",
                            "category": "Window opener",
                            "id": 3,
                            "typeId": 4,
                            "subtype": 1,
                            "scenes": [
                                "Window kitchen 10%",
                                "Window kitchen 20%"
                            ]
                        }
                    ],
            "deletedProducts": [
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
            "changedProducts": [
                {
                    "name": "Windows bathroom",
                    "category": "Window opener",
                    "id": 0,
                    "typeId": 4,
                    "subtype": 1,
                    "scenes": [
                        "Some windows",
                        "Window kitchen 20%"
                    ]
                }
            ]
        };

        let testResult = klfutils.getKlfProductDifferences(oldProducts, newProducts);
        
        expect(testResult).to.be.an('object');
        expect(testResult).to.have.property('newProducts').that.is.an('array').to.be.deep.equal(expectedResult.newProducts);
        expect(testResult).to.have.property('deletedProducts').that.is.an('array').to.be.deep.equal(expectedResult.deletedProducts);
        expect(testResult).to.have.property('changedProducts').that.is.an('array').to.be.deep.equal(expectedResult.changedProducts);
        expect(testResult).to.be.deep.equal(expectedResult);

        done();
    });

    it('getKlfSceneDifferences should create the correct list of new, deleted or changed scenes', function (done) {
        const expectedResult = {
            "newScenes": [
                {
                    "name": "Some windows",
                    "id": 0,
                    "silent": false,
                    "products": [
                        {
                            "typeId": 4,
                            "name": "Windows bathroom",
                            "actuator": 0,
                            "status": 10
                        }
                    ]
                },
                {
                    "name": "Window kitchen 30%",
                    "id": 4,
                    "silent": false,
                    "products": [
                        {
                            "typeId": 4,
                            "name": "Window kitchen",
                            "actuator": 0,
                            "status": 30
                        }
                    ]
                }
            ],
            "deletedScenes": [
                {
                    "name": "Some windows",
                    "id": 0,
                    "silent": false,
                    "products": [
                        {
                            "typeId": 4,
                            "name": "Windows bathroom",
                            "actuator": 0,
                            "status": 10
                        },
                        {
                            "typeId": 4,
                            "name": "Window kitchen",
                            "actuator": 0,
                            "status": 10
                        }
                    ]
                },
                {
                    "name": "Window kitchen 20%",
                    "id": 4,
                    "silent": false,
                    "products": [
                        {
                            "typeId": 4,
                            "name": "Window kitchen",
                            "actuator": 0,
                            "status": 10
                        }
                    ]
                }
            ],
            "changedScenes": [
                {
                    "name": "Window sleeping room 0%",
                    "id": 1,
                    "silent": true,
                    "products": [
                        {
                            "typeId": 4,
                            "name": "Window sleeping room",
                            "actuator": 0,
                            "status": 0
                        }
                    ]
                },
                {
                    "name": "Window sleeping room 100%",
                    "id": 2,
                    "silent": true,
                    "products": [
                        {
                            "typeId": 4,
                            "name": "Window sleeping room",
                            "actuator": 0,
                            "status": 100
                        }
                    ]
                }
            ]
        };
        let testResult = klfutils.getKlfSceneDifferences(oldScenes, newScenes);
        expect(testResult).to.be.an('object');
        expect(testResult).to.have.property('newScenes').that.is.an('array').to.be.deep.equal(expectedResult.newScenes);
        expect(testResult).to.have.property('deletedScenes').that.is.an('array').to.be.deep.equal(expectedResult.deletedScenes);
        expect(testResult).to.have.property('changedScenes').that.is.an('array').to.be.deep.equal(expectedResult.changedScenes);
        expect(testResult).to.be.deep.equal(expectedResult);

        done();
    });
});
