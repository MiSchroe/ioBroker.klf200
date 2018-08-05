![Logo](admin/klf200.png)
# ioBroker.klf200

This adapter is for controlling a VELUX® KLF-200 interface. This adapter is neither an official VELUX product nor is it supported by the company that owns the VELUX products.

The main intention of this adapter is to control electric roof windows and/or electric blinds or roller shutters. Though the KLF-200 interface is able to connect to further devices like lights, switches, canvas blinds etc. I haven't developed the adapter for use with these kind of devices. Thus, it could be possible, that these devices could be controlled by this adapter, too.

The adapter works with the internal REST API of the KLF-200 interface and you don't need to 

## Setup

## User documentation

Find the detailed user documentation in ...

## Known restrictions

* The interface is restricted by storing a maximum of 32 scenes in total. 
* The REST API doesn't provide any feedback of a scene to be finished, therefore each scene is supposed to run at least 30 seconds.
* Currently, only single product scenes are supported to control from the product side. Thus, it is always possible to create scenes with several products and control them from the scenes part.

## Changelog

#### 0.0.1
* (Michael Schroeder) Initial release

## License
The MIT License (MIT)

Copyright (c) 2018 Michael Schroeder <klf200@gmx.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

VELUX and the VELUX logo are registered trademarks of VKR Holding A/S.
