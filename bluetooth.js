function Bluetooth() {
}

Bluetooth.prototype.startDiscovery = function() {
  this.bridge = new WebOSServiceBridge();
  var url = "luna://com.webos.service.bluetooth2/adapter/startDiscovery";
  var params = '{}';

  this.bridge.onservicecallback = function (msg) {
    console.log(msg);
  }
  this.bridge.call(url, params);
}

// Health Thermometer
// 00001809-0000-1000-8000-00805f9b34fb
Bluetooth.prototype.requestThermometer = function() {
  var promiseResolve;
  var promiseReject;

  var keepScanning = true;
  this.bridge.onservicecallback = function (msg) {
    if (keepScanning) {
      console.log(msg);
      var json = JSON.parse(msg);
      if (json.device !== undefined) {
        keepScanning = false;
        promiseResolve(new GattDevice(json.device.address));
      }
    }
  };

  var url = "luna://com.webos.service.bluetooth2/le/startScan";
  var params = JSON.stringify({
    "subscribe":true,
    "serviceUuid": {
      "uuid":"00001809-0000-1000-8000-00805f9b34fb"
    }
  });
  this.bridge.call(url, params);

  var promise = new Promise(function(resolve, reject) {
    promiseResolve = resolve;
    promiseReject = reject;
  });
  return promise;
}


function GattDevice(address) {
  console.log("GattDevice " + address);
  this.address = address;
  this.bridge = new WebOSServiceBridge();
}

GattDevice.prototype.connect = function() {
  var promiseResolve;
  var promiseReject;

  this.bridge.onservicecallback = function (msg) {
    console.log(msg);
    promiseResolve(this);
  };
  var url = "luna://com.webos.service.bluetooth2/gatt/connect";
  var params = JSON.stringify({
    "address":this.address,
  });
  this.bridge.call(url, params);

  var promise = new Promise(function(resolve, reject) {
    promiseResolve = resolve;
    promiseReject = reject;
  });
  return promise;
}

GattDevice.prototype.getServices = function () {
  var promiseResolve;
  var promiseReject;

  this.bridge.onservicecallback = function (msg) {
    console.log(msg);
    promiseResolve(this);
  };
  var url = "luna://com.webos.service.bluetooth2/gatt/getServices";
  var params = JSON.stringify({
    "address":this.address,
  });
  this.bridge.call(url, params);

  var promise = new Promise(function(resolve, reject) {
    promiseResolve = resolve;
    promiseReject = reject;
  });
  return promise;
}
