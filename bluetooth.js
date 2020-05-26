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
      resolve();
    }.bind(this)

    const url = "luna://com.webos.service.bluetooth2/device/getStatus";
    const params = "{}";
    bridge.call(url, params);
  });
  return promise;
}

// Health Thermometer
// 00001809-0000-1000-8000-00805f9b34fb
Bluetooth.prototype.requestThermometer = function() {
  var promiseResolve;
  var promiseReject;

  this.init()
  .then(() => {
    var keepScanning = true;
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      if (keepScanning) {
        console.log("requestThermometer: " + msg);
        var json = JSON.parse(msg);
        if (json.device !== undefined) {
          keepScanning = false;
          const device = new BluetoothDevice(json.device.name,
                                              json.device.address,
                                              json.device.paired);
          const gatt = new BluetoothRemoteGATTServer(device);

          promiseResolve(device);
        }
      }
    }

    const url = "luna://com.webos.service.bluetooth2/le/startScan";
    const params = JSON.stringify({
      "subscribe":true,
      "serviceUuid": {
        "uuid":"00001809-0000-1000-8000-00805f9b34fb"
      }
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
//  if (this.connected)
//    return Promise.resolve(this);

  var that = this;
  var promise = new Promise(function(resolve, reject) {
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      console.log(msg);
      resolve(this);
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
  var that = this;
  var promise = new Promise(function(resolve, reject) {
    const bridge = new WebOSServiceBridge();
    bridge.onservicecallback = function (msg) {
      console.log(msg);
      var json = JSON.parse(msg);
      resolve();
    }.bind(that);

    var url = "luna://com.webos.service.bluetooth2/gatt/discoverServices";
    var params = JSON.stringify({
      "address":that.device.address,
    });
    bridge.call(url, params);
  });
  return promise;
}

BluetoothRemoteGATTServer.prototype.getPrimaryService = function() {
  this.discoverServices()
  .then(() => {
    var that = this;
    var promise = new Promise(function(resolve, reject) {
      const bridge = new WebOSServiceBridge();
      bridge.onservicecallback = function (msg) {
        console.log(msg);
        var json = JSON.parse(msg);
        resolve(this);
      }.bind(that);

      var url = "luna://com.webos.service.bluetooth2/gatt/getServices";
      var params = JSON.stringify({
        "address":that.device.address,
      });
      bridge.call(url, params);
    });
    return promise;
  });
}

/////////////////// BluetoothRemoteGATTService ///////////////////

function BluetoothRemoteGATTService() {
}

BluetoothRemoteGATTService.prototype.getCharacteristics = function(uuid) {
}
