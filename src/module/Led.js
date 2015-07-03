+(function (factory) {
  if (typeof exports === 'undefined') {
    factory(webduino || {});
  } else {
    module.exports = factory;
  }
}(function (scope) {
  'use strict';

  var Pin = scope.Pin,
    Module = scope.Module,
    proto;

  function Led(board, pin, driveMode) {
    Module.call(this);

    this._board = board;
    this._pin = pin;
    this._driveMode = driveMode || Led.SOURCE_DRIVE;
    this._supportsPWM = undefined;

    if (this._driveMode === Led.SOURCE_DRIVE) {
      this._onValue = 1;
      this._offValue = 0;
    } else if (this._driveMode === Led.SYNC_DRIVE) {
      this._onValue = 0;
      this._offValue = 1;
    } else {
      throw new Error('error: driveMode should be Led.SOURCE_DRIVE or Led.SYNC_DRIVE');
    }

    if (pin.capabilities[Pin.PWM]) {
      board.setDigitalPinMode(pin.number, Pin.PWM);
      this._supportsPWM = true;
    } else {
      board.setDigitalPinMode(pin.number, Pin.DOUT);
      this._supportsPWM = false;
    }
  }

  function checkPinState(self, pin, state, callback) {
    self._board.queryPinState(pin, function (pin) {
      if (pin.state === state) {
        callback.call(self);
      }
    });
  }

  Led.prototype = proto = Object.create(Module.prototype, {

    constructor: {
      value: Led
    },

    intensity: {
      get: function () {
        return this._pin.value;
      },
      set: function (val) {
        if (!this._supportsPWM) {
          if (val < 0.5) {
            val = 0;
          } else {
            val = 1;
          }
        }

        if (this._driveMode === Led.SOURCE_DRIVE) {
          this._pin.value = val;
        } else if (this._driveMode === Led.SYNC_DRIVE) {
          this._pin.value = 1 - val;
        }
      }
    }

  });

  proto.on = function (callback) {
    this._pin.value = this._onValue;
    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.off = function (callback) {
    this._pin.value = this._offValue;
    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.toggle = function (callback) {
    this._pin.value = 1 - this._pin.value;
    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };
  /*
   * @name blink
   * @method blink(interval, callback) 
   * @method blink(interval)
   * @method blink(callback)
   * @param {number} interval milliseconds, the blinking interval
   * @param {function} callback executed when led start to blink
   * @desc default interval is 1000 milliseconds
   */
  proto.blink = function(interval, callback){
      if(typeof interval == 'function'){
          callback = interval;
          interval = 1000
      }
      var self = this;
      var spec;
      if(self._blink)
          spec = self._blink;
      else 
          spec = self._blink = {};

      spec.interval = interval;
      if(!callback){
          return;
      }
      spec.enabled = true;

      function tictoc(){
          if(!spec.enabled)
              return;
          self.toggle(function(){
              callback.apply(this, arguments);
              var remain = spec.ts + spec.interval - Date.now();
              if(remain > 0){
                  setTimeout(function(){
                      spec.ts = Date.now();
                      tictoc();
                  }, remain);
              } else {
                  spec.ts = Date.now();
                  tictoc();
              }
          });
      }
      //avoid blocking
      setTimeout(tictoc.bind(self), 0);
  }

  /*
   * @name unblink
   * @desc turn blinking mode off
   */
  proto.unblink = function(){
      var self = this;
      if(self._blink){
          self._blink.enabled = false;
          delete self._blink;
      }
  }

  Led.SOURCE_DRIVE = 0;
  Led.SYNC_DRIVE = 1;

  scope.module.Led = Led;
}));
