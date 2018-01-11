/* jshint -W097 */// jshint strict:false
/*jslint node: true */
const expect = require('chai').expect;
const klfutils = require('../lib/klfutils');

describe.only('Test klfutils', function() {
    const oldData = [
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

    const newData = [
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
    
    it('klfutils should return objects with ids set to the corresponding values', function (done) {
        let testResult = klfutils.convertKlfArrayToDictionary(oldData);
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

    it('klfutils should throw an error when id property is missing', function (done) {
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
});
