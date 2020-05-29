function Bluetooth() {
  this.bridge = new WebOSServiceBridge();
}

Bluetooth.prototype.startDiscovery = function() {
  var url = "luna://com.webos.service.bluetooth2/adapter/startDiscovery";
  var params = '{}';

  this.bridge.onservicecallback = function (msg) {
    console.log(msg);
  }
  this.bridge.call(url, params);
}

Bluetooth.prototype.cancelDiscovery = function() {
  this.bridge = new WebOSServiceBridge();
  var url = "luna://com.webos.service.bluetooth2/adapter/cancelDiscovery";
  var params = '{}';

  this.bridge.onservicecallback = function (msg) {
    console.log(msg);
  }
  this.bridge.call(url, params);
}

Bluetooth.prototype.init = function() {
  var promise = new Promise(function(resolve, reject) {
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      console.log("getStatus: " + msg);
      /*
      var json = JSON.parse(msg);
      if (json.devices !== undefined) {
        console.log("json.devices: " + json.devices);
          for (var i in json.devices) {
            if (json.devices[i].typeOfDevice === 'ble')
              console.log("device: " + json.devices[i].name);
          }
      }
      */

      setTimeout( function() {
        resolve();
      }, 100);
    }.bind(this)

    const url = "luna://com.webos.service.bluetooth2/device/getStatus";
    const params = "{}";
    bridge.call(url, params);
  });
  return promise;
}

Bluetooth.prototype.requestDevice = function(serviceUuid) {
  this.cancelDiscovery();

  var promiseResolve;
  var promiseReject;

  this.init()
  .then(() => {
    var keepScanning = true;
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      if (keepScanning) {
        console.log("requestDevice: " + msg);
        var json = JSON.parse(msg);
        if (json.device !== undefined) {
          keepScanning = false;
          this.cancelDiscovery();
          var device = new BluetoothDevice(json.device.name,
                                              json.device.address,
                                              json.device.paired);
          var gatt = new BluetoothRemoteGATTServer(device);

          setTimeout( function() {
            promiseResolve(device);
          }, 100);
        }
      }
    }.bind(this);

    const url = "luna://com.webos.service.bluetooth2/le/startScan";
    const params = JSON.stringify({
      "serviceUuid": {
        "uuid":serviceUuid
      },
      "subscribe":true
    });
    bridge.call(url, params);
  });

  var promise = new Promise(function(resolve, reject) {
    promiseResolve = resolve;
    promiseReject = reject;
  });
  return promise;
}

/////////////////// BluetoothDevice ///////////////////

function BluetoothDevice(name, address, paired) {
  this.name = name;
  this.address = address;
  this.paired = paired;
}


/////////////////// BluetoothRemoteGATTServer ///////////////////

function BluetoothRemoteGATTServer(device) {
  device.gatt = this;
  this.device = device;
  this.connected = device.paired;
}

BluetoothRemoteGATTServer.prototype.connect = function() {
  console.log("BluetoothRemoteGATTServer.connect");
  var that = this;
  var promise = new Promise(function(resolve, reject) {
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      console.log(msg);
      var json = JSON.parse(msg);
console.log("BluetoothRemoteGATTServer.connect - resolve 2000");
      setTimeout( function() {
        if (json.clientId !== undefined) {
          that.clientId = json.clientId;
          console.log("BluetoothRemoteGATTServer.connect - connect");
          resolve(that);
        } else {
          console.log("BluetoothRemoteGATTServer.connect - reject");
          reject("GATT server connect failed");
        }
      }, 2000);
    }.bind(that);

    var url = "luna://com.webos.service.bluetooth2/gatt/connect";
    var params = JSON.stringify({
      "address":that.device.address,
    });
    bridge.call(url, params);
  });
  return promise;
}

BluetoothRemoteGATTServer.prototype.disconnect = function() {
//  if (this.connected)
//    return Promise.resolve(this);

  var that = this;
  var promise = new Promise(function(resolve, reject) {
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      console.log(msg);

      setTimeout( function() {
        resolve(this);
      }, 100);
    }.bind(that);

    var url = "luna://com.webos.service.bluetooth2/gatt/connect";
    var params = JSON.stringify({
      "address":that.device.address,
    });
    bridge.call(url, params);
  });
  return promise;
}

BluetoothRemoteGATTServer.prototype.discoverServices = function() {
  console.log("BluetoothRemoteGATTServer.discoverServices");
  var server = this;
  var promise = new Promise(function(resolve, reject) {
    setTimeout( function() {
      const bridge = new WebOSServiceBridge();
      bridge.onservicecallback = function (msg) {
        console.log("Discover" + msg);
        var json = JSON.parse(msg);

        setTimeout( function() {
          resolve();
        }, 1000);
      }

      var url = "luna://com.webos.service.bluetooth2/gatt/discoverServices";
      var params = JSON.stringify({
        "address":server.device.address,
      });
      bridge.call(url, params);
    }, 1000);
  });
  return promise;
}

BluetoothRemoteGATTServer.prototype.getPrimaryService = function(serviceUuid) {
  console.log("BluetoothRemoteGATTServer.getServices");
  var server = this;

  var promiseResolve;
  var promiseReject;

  this.discoverServices()
  .then(() => {
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      console.log(msg);
      var json = JSON.parse(msg);
      if (json.services !== undefined) {
        let found = -1
        for (let i in json.services) {
          if (json.services[i].service === serviceUuid) {
            found = i;
            break;
          }
        }

        if (found !== -1) {
          console.log("Found serviceUuid: " + json.services[found].service);
          const service = new BluetoothRemoteGATTService(server.device,
                                                          server.clientId,
                                                          serviceUuid,
                                                          json.services[found].characteristics);
          promiseResolve(service);
        } else {
          console.log("Did not found services");
          promiseReject("Foobar");
        }
      } else {
        console.log("Did not found services");
        promiseReject("Foobar");
      }
    }

    var url = "luna://com.webos.service.bluetooth2/gatt/getServices";
    var params = JSON.stringify({
      "address":server.device.address,
      "subscribe":true
    });
    bridge.call(url, params);
  });

  var promise = new Promise(function(resolve, reject) {
    promiseResolve = resolve;
    promiseReject = reject;
  });
  return promise;
}

/////////////////// BluetoothRemoteGATTService ///////////////////

function BluetoothRemoteGATTService(device, clientId, serviceUuid, characteristics) {
  this.device = device;
  this.clientId = clientId;
  this.serviceUuid = serviceUuid;
  this.characteristics = characteristics;
}

BluetoothRemoteGATTService.prototype.getCharacteristic = function(characteristicUuid) {
  var service = this;
  var promise = new Promise(function(resolve, reject) {
    let found = -1
    for (let i in service.characteristics) {
      if (service.characteristics[i].characteristic === characteristicUuid) {
        found = i;
        break;
      }
    }

    if (found !== -1) {
      console.log("Found characteristicUuid: " + service.characteristics[found].characteristic);
      var characteristic = new BluetoothGATTCharacteristic(service,
                                                            service.clientId,
                                                            service.serviceUuid,
                                                            characteristicUuid);
      console.log("Resolved: " + characteristic);
      resolve(characteristic);
    } else {
      console.log("Did not found characteristic");
      reject("Foobar")
    }
  });
  return promise;
}

/////////////////// BluetoothGATTCharacteristic ///////////////////

function BluetoothGATTCharacteristic(service, clientId, serviceUuid, characteristicUuid) {
  this.service = service;
  this.clientId = clientId;
  this.serviceUuid = serviceUuid;
  this.characteristicUuid = characteristicUuid;
  this.bridge = new WebOSServiceBridge();
  this.listeners = {};
}

BluetoothGATTCharacteristic.prototype.startNotifications = function() {
  console.log("BluetoothRemoteGATTServer.startNotifications");
  var characteristic = this;
  this.bridge.onservicecallback = function (msg) {
    console.log("Got Notify" + msg);
    var json = JSON.parse(msg);

    var event = new CustomEvent('characteristicvaluechanged', { detail: json });
    setTimeout( function() {
      characteristic.dispatchEvent(event);
    }, 10);
  }

  var url = "luna://com.webos.service.bluetooth2/gatt/monitorCharacteristic";
  var params = JSON.stringify({
    "clientId":this.clientId,
    "service":this.serviceUuid,
    "characteristic":this.characteristicUuid,
    "subscribe":true,
  });
  this.bridge.call(url, params);

  return Promise.resolve();
}

BluetoothGATTCharacteristic.prototype.addEventListener = function(type, callback) {
  if (!(type in this.listeners)) {
    this.listeners[type] = [];
  }
  this.listeners[type].push(callback);
}

BluetoothGATTCharacteristic.prototype.removeEventListener = function(type, callback) {
  if (!(type in this.listeners)) {
    return;
  }
  var stack = this.listeners[type];
  for (var i = 0, l = stack.length; i < l; i++) {
    if (stack[i] === callback){
      stack.splice(i, 1);
      return;
    }
  }
};

BluetoothGATTCharacteristic.prototype.dispatchEvent = function(event) {
  if (!(event.type in this.listeners)) {
    return true;
  }
  var stack = this.listeners[event.type].slice();

  for (var i = 0, l = stack.length; i < l; i++) {
    stack[i].call(this, event);
  }
  return !event.defaultPrevented;
};
