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
      this._stopBlink();
    this._pin.value = this._onValue;
    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.off = function (callback) {
      this._stopBlink();
    this._pin.value = this._offValue;
    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.toggle = function (callback) {
      if(this._blink){
          this.off();
      } else {
          this._pin.value = 1 - this._pin.value;
          if (typeof callback === 'function') {
              checkPinState(this, this._pin, this._pin.value, callback);
          }
      }
  };
  /*
   * @name blink
   * @method blink(interval, callback) 
   * @method blink(interval)
   * @method blink(callback)
   * @method blink()
   * @param {number} interval milliseconds, the blinking interval
   * @param {function} callback executed when led start to blink
   * @desc default interval is 1000 milliseconds
   */
  proto.blink = function(interval, callback){
      if(!arguments.length){
          interval = 1000;
      }
      if(typeof interval == 'function'){
          callback = interval;
          interval = 1000;
      }
      var self = this;
      var spec;
      if(self._blink){
          spec = self._blink;
      } else {
          spec = self._blink = {};
      }

      spec.enabled = true;
      spec.interval = interval;

      if(!callback){
          return;
      }

      //avoid of multiple calling
      if(spec.tout){
          clearTimeout(spec.tout);
          delete spec.tout;
      }

      function tictoc(){
          self._pin.value = 1 - self._pin.value;
          if (typeof callback === 'function') {
              checkPinState(self, self._pin, self._pin.value, function(){
                  callback.apply(self, arguments);
                  if(spec.enabled) {
                      spec.tout = setTimeout(function(){
                          tictoc();
                      }, spec.interval);
                  }
              });
          }
          
      }
      tictoc();
  }

  /*
   * @name stopBlink
   * @desc turn blinking mode off
   */
  proto.stopBlink = function(){
      this.off();
  }
  proto._stopBlink = function(){
      if(this._blink){
          clearTimeout(this._blink.tout);
          this._blink.enabled = false;
          delete this._blink.tout;
          delete this._blink;
      }
  }

  Led.SOURCE_DRIVE = 0;
  Led.SYNC_DRIVE = 1;

  scope.module.Led = Led;
}));
