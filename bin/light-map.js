(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Map = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var Mercator = require( './Mercator' );
var utils = require( './MapUtils' );
var Rect = require( './Rect' );
var Tile = require( './Tile' );
var events = require('events');

module.exports = function(){

    function Map( provider, domains, width, height, minZoom, maxZoom ){


        //sets the scale of the map, handles retina display
        this.mercator = new Mercator( 256 );

        //events
        this.eventEmitter  = new events.EventEmitter();

        //zoom bounds
        this._minZoom = Math.max( 0, minZoom );
        this._maxZoom = Math.max( 1, maxZoom );

        //map center
        this.latitude   = 0;
        this.longitude  = 0;

        //map zoom level
        this.zoom = 0;

        //loading
        this.tiles = [];
        this.keys = [];
        this.loadedTiles = [];

        //create domElement
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        //viewRect
        this.setSize( width, height );

        //providers
        this.setProvider( provider, domains, 256 * window.devicePixelRatio );

        //makes the math utils available
        this.utils = utils;
    }

    //getters / setters
    Map.prototype = {

        get width(){return this._width; }, set width( value ){this._width = value; this.setSize(this.width, this.height ); },
        get height(){return this._height; }, set height( value ){this._height = value; this.setSize(this.width, this.height ); },
        get minZoom(){return this._minZoom; }, set minZoom( value ){this._minZoom = value; },
        get maxZoom(){return this._maxZoom; }, set maxZoom( value ){this._maxZoom = value; }

    };
    /**
     * changes the Tile provider
     * @param provider url
     * @param domains sub domains
     * @param tileSize
     */
    function setProvider(  provider, domains, tileSize )
    {
        if( this.provider == provider )return;

        this.dispose();

        this.provider = provider || "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        this.domains = domains || ["a","b","c"];
        this.scale = tileSize / 256;

        this.mercator = new Mercator( 256 * this.scale );

        this.setSize( this._width, this._height );

        //this.setView();

    }
    /**
     * sets the view rect size
     * @param w
     * @param h
     * @param apply boolean to apply the transform only
     */
    function setSize( w,h )
    {
        this._width = w || 256;
        this._height = h || 256;

        this.viewRect = new Rect( 0,0,this._width,this._height );

        if( this.canvas != null ){

            // set the scaled resolution
            this.canvas.width  = this.viewRect.w * this.scale;
            this.canvas.height = this.viewRect.h * this.scale;

            // and the actual size
            this.canvas.style.width  = ( this.viewRect.w ) + 'px';
            this.canvas.style.height = ( this.viewRect.h ) + 'px';
        }
        
    }

    function renderTiles() {

        this.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

        var c = this.getViewRectCenterPixels();
        var ctx = this.ctx;
        var zoom = this.zoom;
        var viewRect = this.viewRect;
        var scale = this.scale;
        this.loadedTiles.forEach(function(tile)
        {
            if( tile.zoom == zoom )
            {
                var px = viewRect.w / 2 * scale + ( tile.px - c[ 0 ] );
                var py = viewRect.h / 2 * scale + ( tile.py - c[ 1 ] );

                ctx.drawImage( tile.img, Math.round( px ), Math.round( py ) );

            }
        });

        this.eventEmitter.emit( Map.ON_TEXTURE_UPDATE, this.ctx );

    }

    /**
     * returns an array of the latitude/longitude in degrees
     * @returns {*[]}
     */
    function getLatLng(){

        return [ this.latitude, this.longitude ];
    }

    /**
     * returns the bounds of the view rect as an array of the latitude/longitude in degrees
     * @returns [ top left lat, top left lon, bottom right lat, bottom right lon]
     */
    function viewRectToLatLng( lat, lng, zoom ){

        var c = this.mercator.latLngToPixels( -lat, lng, zoom  );
        var w = this.viewRect.w * this.scale;
        var h = this.viewRect.h * this.scale;
        var tl = this.mercator.pixelsToLatLng( c[ 0 ] - w / 2  * this.scale, c[ 1 ] - h / 2 * this.scale, zoom );
        var br = this.mercator.pixelsToLatLng( c[ 0 ] + w / 2  * this.scale, c[ 1 ] + h / 2 * this.scale, zoom );
        return [ -tl[ 0 ], tl[ 1 ], -br[ 0 ], br[ 1 ] ];

    }

    /**
     * returns the bounds of the view rect as an object of the latitude/longitude in degrees
     * @returns {left lon, top lat, right lon, bottom lat}
     */
    function getViewPortBounds()
    {
        var bounds = this.viewRectToLatLng( this.latitude, this.longitude, this.zoom );
        return{
            left:       bounds[1],
            top:        bounds[0],
            right:      bounds[3],
            bottom:     bounds[2]
        };

    }

    /**
     * returns the bounds of the view rect as rectangle (Rect object) of pixels in absolute coordinates
     * @returns new Rect( absolute x, absolute y, width, height )
     */
    function canvasPixelToLatLng( px, py, zoom ){

        var c = this.mercator.latLngToPixels( -ma, lng, zoom || map.zoom );
        return new Rect( c[ 0 ]-this.viewRect.w/2, c[ 1 ]-this.viewRect.h/2, this.viewRect.w, this.viewRect.h );
    }

    /**
     * returns an array of the latitude/longitude of the viewrect center in degrees
     * @returns {*[]}
     */
    function getViewRectCenter()
    {
        var bounds = this.viewRectToLatLng( this.latitude, this.longitude, this.zoom, this.viewRect);
        return [ utils.map(.5,0,1, -bounds[0], -bounds[2] ), utils.map(.5,0,1, bounds[1], bounds[3] )];
    }

    /**
     * returns an array of the absolute x/y coordinates of the viewrect center in pixels
     * @returns {*[]}
     */
    function getViewRectCenterPixels()
    {
        return this.mercator.latLngToPixels( -this.latitude, this.longitude, this.zoom );
    }

    /**
     * retrieves a list of tiles (loaded or not) that lie within the viewrect
     * @param zoom
     * @returns {Array}
     */
    function viewRectTiles( zoom )
    {
        zoom = zoom || this.zoom;
        var bounds = viewRectToLatLng( this.latitude, this.longitude, zoom, this.viewRect);
        var tl = this.mercator.latLonToTile(-bounds[0], bounds[1], zoom);
        var br = this.mercator.latLonToTile(-bounds[2], bounds[3], zoom);
        var u = 0;
        var v = 0;
        var tiles = [];
        for (var i = tl[0]; i <= br[0] ; i++)
        {
            v = 0;
            for (var j = tl[1]; j <= br[1]; j++)
            {
                var key = this.mercator.tileXYToQuadKey(i, j, zoom);
                var exists = false;
                for (var k = 0; k < this.loadedTiles.length; k++){

                    if (this.loadedTiles[k].key == key ){

                        this.loadedTiles[k].viewRectPosition[0] = u;
                        this.loadedTiles[k].viewRectPosition[1] = v;
                        tiles.push(this.loadedTiles[k]);
                        exists = true;
                        break;
                    }
                }
                if( exists == false ) {

                    for (k = 0; k < this.tiles.length; k++) {

                        if (this.tiles[k].key == key) {

                            this.tiles[k].viewRectPosition[0] = u;
                            this.tiles[k].viewRectPosition[1] = v;
                            tiles.push(this.tiles[k]);
                            exists = true;
                            break;
                        }
                    }
                }
                v++;
            }
            u++;
        }
        return tiles;
    }

    /**
     * gets a list of the tiles that are displayed in the viewrect at the given lat/lon/zoom
     * @param lat latitude in degrees
     * @param lng longitude in degrees
     * @param zoom zoom level
     * @param viewRect
     * @returns {Array} an array of Tile objects
     */
    function getVisibleTiles( lat, lng, zoom, viewRect )
    {

        var bounds = this.viewRectToLatLng( lat, lng, zoom, viewRect );
        var tl = this.mercator.latLonToTile( -bounds[0], bounds[1], zoom );
        var br = this.mercator.latLonToTile( -bounds[2], bounds[3], zoom );

        var tiles = [];
        for( var i = tl[ 0 ]; i <= br[ 0 ]; i++ )
        {
            for( var j = tl[ 1 ]; j <= br[ 1 ]; j++ )
            {
                var key = this.mercator.tileXYToQuadKey( i, j, zoom );

                //check if the tile was already loaded/being loaded
                if( this.keys.indexOf( key ) == -1 )
                {
                    var tile =  new Tile( this, key );
                    tiles.push( tile );
                    this.keys.push( key );
                }
            }
        }
        return tiles;

    }

    /**
     * sets the map view
     * @param lat
     * @param lng
     * @param zoom
     */
    function setView( lat, lng, zoom )
    {
        this.latitude = lat || this.latitude;
        this.longitude = lng || this.longitude;
        this.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, zoom || this.zoom ) );

        this.load();
        this.renderTiles();
    }

    /**
     * loads the visibles tiles
     */
    function load()
    {

        var tiles = this.getVisibleTiles( this.latitude, this.longitude, this.zoom, this.viewRect  );

        if( tiles.length == 0 && this.tiles.length == 0 )
        {
            this.eventEmitter.emit( Map.ON_LOAD_COMPLETE, -1 );
            return;
        }

        for ( var i = 0; i < tiles.length; i++ ) {
            tiles[ i ].eventEmitter.on( Tile.ON_TILE_LOADED, this.appendTile  );
            tiles[ i ].load();
        }

        this.tiles = this.tiles.concat( tiles );

    }

    /**
     * adds a loaded tile to the pool
     * @param tile
     */
    function appendTile( tile )
    {

        var scope = tile.map;
        scope.tiles.splice( scope.tiles.indexOf( tile ), 1 );

        var img = tile.img;
        scope.loadedTiles.push( tile );
        scope.renderTiles( true );

        scope.eventEmitter.emit( Map.ON_TILE_LOADED, tile );

        if( scope.tiles.length == 0 ){

            scope.eventEmitter.emit( Map.ON_LOAD_COMPLETE, 0 );
        }
    }

    /**
     * returns a lat/lon as pixel X/Y coordinates
     * @param lat
     * @param lng
     * @param zoom
     * @returns {*}
     */
    function latLngToPixels( lat, lng, zoom )
    {
        return this.mercator.latLngToPixels( -lat, lng, zoom || this.zoom );
    }

    /**
     * gets the map resolution in pixels at a given zoom level
     * @param zoom
     * @returns {*}
     */
    function resolution( zoom )
    {
        zoom        = zoom || this.zoom;
        return this.mercator.resolution( zoom );
    }

    /**
     * destroys all the tiles
     */
    function dispose()
    {
        var scope = this;
        this.tiles.forEach( function(tile){ tile.eventEmitter.removeListener( Tile.ON_TILE_LOADED, scope.appendTile ); tile.valid = false; tile.dispose(); });
        this.loadedTiles.forEach( function(tile){ tile.dispose(); });

        this.tiles = [];
        this.loadedTiles = [];
        this.keys = [];

    }

    /**
     * returns the bounds of the view rect as rectangle (Rect object) of pixels in absolute coordinates
     * @returns {*[absolute x, absolute y, width, height ]}
     */
    function viewRectToPixels( lat, lng, zoom ){

        var c = this.mercator.latLngToPixels( -lat, lng, zoom  );
        return new Rect( c[ 0 ], c[ 1 ], this.viewRect.w, this.viewRect.h );
    }

    //Map constants
    Map.ON_LOAD_COMPLETE    = 0;
    Map.ON_TILE_LOADED      = 1;
    Map.ON_TEXTURE_UPDATE   = 2;


    var _p = Map.prototype;
    _p.constructor = Map;

    _p.setProvider             = setProvider;
    _p.setSize                 = setSize;
    _p.renderTiles             = renderTiles;
    _p.latLngToPixels          = latLngToPixels;
    _p.viewRectToLatLng        = viewRectToLatLng;
    _p.getViewPortBounds       = getViewPortBounds;
    _p.getViewRectCenter       = getViewRectCenter;
    _p.getViewRectCenterPixels = getViewRectCenterPixels;
    _p.setView                 = setView;
    _p.viewRectTiles           = viewRectTiles;
    _p.getVisibleTiles         = getVisibleTiles;
    _p.load                    = load;
    _p.appendTile              = appendTile;
    _p.resolution              = resolution;
    _p.dispose                 = dispose;
    _p.viewRectToPixels = viewRectToPixels;

    return Map;

}();


},{"./MapUtils":3,"./Mercator":4,"./Rect":5,"./Tile":6,"events":1}],3:[function(require,module,exports){

module.exports.MapUtils = function( exports )
{
    var RAD = Math.PI / 180;

    function isPowerOfTwo( value ){

        return ( (value & -value) == value );
    }

    function powerTwo(val){

        if( isPowerOfTwo( val ) )return val
        var b = 1;
        while ( b < ~~( val ) )b = b << 1;
        return b;
    }

    //http://www.movable-type.co.uk/scripts/latlong.html
    function latLngDistance(lat1, lng1, lat2, lng2)
    {
        var R = EARTH_RADIUS; // km
        var p1 = lat1 * RAD;
        var p2 = lat2 * RAD;
        var tp = (lat2-lat1) * RAD;
        var td = (lng2-lng1) * RAD;

        var a = Math.sin(tp/2) * Math.sin(tp/2) +
                Math.cos(p1) * Math.cos(p2) *
                Math.sin(td/2) * Math.sin(td/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    function lerp ( t, a, b ){ return a + t * ( b - a ); }
    function norm( t, a, b ){return ( t - a ) / ( b - a );}
    function map( t, a0, b0, a1, b1 ){ return lerp( norm( t, a0, b0 ), a1, b1 );}

    // methods

    exports.lerp = lerp;
    exports.norm = norm;
    exports.map = map;

    exports.isPowerOfTwo = isPowerOfTwo;
    exports.powerTwo = powerTwo;
    exports.latLngDistance = latLngDistance;

    return exports;

}( module.exports );

},{}],4:[function(require,module,exports){
/*

//from http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/

 #!/usr/bin/env python
 ###############################################################################
 # $Id$
 #
 # Project:  GDAL2Tiles, Google Summer of Code 2007 & 2008
 #           Global Map Tiles Classes
 # Purpose:  Convert a raster into TMS tiles, create KML SuperOverlay EPSG:4326,
 #           generate a simple HTML viewers based on Google Maps and OpenLayers
 # Author:   Klokan Petr Pridal, klokan at klokan dot cz
 # Web:      http://www.klokan.cz/projects/gdal2tiles/
 #
 ###############################################################################
 # Copyright (c) 2008 Klokan Petr Pridal. All rights reserved.
 #
 # Permission is hereby granted, free of charge, to any person obtaining a
 # copy of this software and associated documentation files (the "Software"),
 # to deal in the Software without restriction, including without limitation
 # the rights to use, copy, modify, merge, publish, distribute, sublicense,
 # and/or sell copies of the Software, and to permit persons to whom the
 # Software is furnished to do so, subject to the following conditions:
 #
 # The above copyright notice and this permission notice shall be included
 # in all copies or substantial portions of the Software.
 #
 # THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 # OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 # FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 # THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 # LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 # FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 # DEALINGS IN THE SOFTWARE.
 ###############################################################################

 globalmaptiles.py

 Global Map Tiles as defined in Tile Map Service (TMS) Profiles
 ==============================================================

 Functions necessary for generation of global tiles used on the web.
 It contains classes implementing coordinate conversions for:

 - GlobalMercator (based on EPSG:900913 = EPSG:3785)
 for Google Maps, Yahoo Maps, Microsoft Maps compatible tiles
 - GlobalGeodetic (based on EPSG:4326)
 for OpenLayers Base Map and Google Earth compatible tiles

 More info at:

 http://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
 http://wiki.osgeo.org/wiki/WMS_Tiling_Client_Recommendation
 http://msdn.microsoft.com/en-us/library/bb259689.aspx
 http://code.google.com/apis/maps/documentation/overlays.html#Google_Maps_Coordinates

 Created by Klokan Petr Pridal on 2008-07-03.
 Google Summer of Code 2008, project GDAL2Tiles for OSGEO.

 In case you use this class in your product, translate it to another language
 or find it usefull for your project please let me know.
 My email: klokan at klokan dot cz.
 I would like to know where it was used.

 Class is available under the open-source GDAL license (www.gdal.org).

*/

module.exports = function() {

    function Mercator( tile_size, earth_radius )
    {
        this.init(tile_size, earth_radius);
    }

    function init(tile_size, earth_radius)
    {
        //Initialize the TMS Global Mercator pyramid
        this.tileSize = tile_size || 256;

        this.earthRadius = earth_radius  || 6378137;

        // 156543.03392804062 for tileSize 256 pixels
        this.initialResolution = 2 * Math.PI * this.earthRadius / this.tileSize;

        // 20037508.342789244
        this.originShift = 2 * Math.PI * this.earthRadius / 2.0;

    }


    //converts given lat/lon in WGS84 Datum to XY in Spherical Mercator EPSG:900913
    function latLonToMeters( lat, lon )
    {
        var mx = lon * this.originShift / 180.0;
        var my = Math.log( Math.tan((90 + lat ) * Math.PI / 360.0)) / (Math.PI / 180.0);
        my = my * this.originShift / 180.0;
        return [mx, my];
    }

    //converts XY point from Spherical Mercator EPSG:900913 to lat/lon in WGS84 Datum
    function metersToLatLon( mx, my )
    {
        var lon = (mx / this.originShift) * 180.0;
        var lat = (my / this.originShift) * 180.0;
        lat = 180 / Math.PI * ( 2 * Math.atan( Math.exp(lat * Math.PI / 180.0 ) ) - Math.PI / 2.0);
        return [lat, lon];
    }

    //converts pixel coordinates in given zoom level of pyramid to EPSG:900913
    function pixelsToMeters( px, py, zoom )
    {
        var res = this.resolution(zoom);
        var mx = px * res - this.originShift;
        var my = py * res - this.originShift;
        return [mx, my];
    }

    //converts EPSG:900913 to pyramid pixel coordinates in given zoom level
    function metersToPixels( mx, my, zoom )
    {
        var res = this.resolution( zoom );
        var px = (mx + this.originShift) / res;
        var py = (my + this.originShift) / res;
        return [px, py];
    }

    //returns tile for given mercator coordinates
    function metersToTile( mx, my, zoom )
    {
        var pxy = this.metersToPixels(mx, my, zoom);
        return this.pixelsToTile(pxy[0], pxy[1]);
    }

    //returns a tile covering region in given pixel coordinates
    function pixelsToTile( px, py)
    {
        var tx = parseInt( Math.ceil( px / parseFloat( this.tileSize ) ) - 1);
        var ty = parseInt( Math.ceil( py / parseFloat( this.tileSize ) ) - 1);
        return [tx, ty];
    }

    //returns a tile covering region the given lat lng coordinates
    function latLonToTile( lat, lng, zoom )
    {
        var px = this.latLngToPixels( lat, lng, zoom );
        return this.pixelsToTile( px[ 0 ], px[ 1 ] );
    }

    //Move the origin of pixel coordinates to top-left corner
    function pixelsToRaster( px, py, zoom )
    {
        var mapSize = this.tileSize << zoom;
        return [px, mapSize - py];
    }

    //returns bounds of the given tile in EPSG:900913 coordinates
    function tileMetersBounds( tx, ty, zoom )
    {
        var min = this.pixelsToMeters(tx * this.tileSize, ty * this.tileSize, zoom);
        var max = this.pixelsToMeters((tx + 1) * this.tileSize, (ty + 1) * this.tileSize, zoom);
        return [ min[0], min[1], max[0], max[1] ];
    }

    //returns bounds of the given tile in pixels
    function tilePixelsBounds( tx, ty, zoom )
    {
        var bounds = this.tileMetersBounds( tx, ty, zoom );
        var min = this.metersToPixels(bounds[0], bounds[1], zoom );
        var max = this.metersToPixels(bounds[2], bounds[3], zoom );
        return [ min[0], min[1], max[0], max[1] ];
    }

    //returns bounds of the given tile in latutude/longitude using WGS84 datum
    function tileLatLngBounds( tx, ty, zoom )
    {
        var bounds = this.tileMetersBounds( tx, ty, zoom );
        var min = this.metersToLatLon(bounds[0], bounds[1]);
        var max = this.metersToLatLon(bounds[2], bounds[3]);
        return [ min[0], min[1], max[0], max[1] ];
    }

    //resolution (meters/pixel) for given zoom level (measured at Equator)
    function resolution( zoom )
    {
        return this.initialResolution / Math.pow( 2, zoom );
    }

    /**
     * untested...
     * @param pixelSize
     * @returns {number}
     * @constructor
     */
    function zoomForPixelSize( pixelSize )
    {
        var i = 30;
        while( pixelSize > this.resolution(i) )
        {
            i--;
            if( i <= 0 )return 0;
        }
        return i;
    }

    //returns the lat lng of a pixel X/Y coordinates at given zoom level
    function pixelsToLatLng( px, py, zoom )
    {
        var meters = this.pixelsToMeters( px, py, zoom );
        return this.metersToLatLon( meters[ 0 ], meters[ 1 ] );
    }

    //returns the pixel X/Y coordinates at given zoom level from a given lat lng
    function latLngToPixels( lat, lng, zoom )
    {
        var meters = this.latLonToMeters( lat, lng, zoom );
        return this.metersToPixels( meters[ 0 ], meters[ 1 ], zoom );
    }

    //retrieves a given tile from a given lat lng
    function latLngToTile( lat, lng, zoom )
    {
        var meters = this.latLonToMeters( lat, lng );
        return this.metersToTile( meters[ 0 ], meters[ 1 ], zoom );
    }

    //encodes the tlie X / Y coordinates & zoom level into a quadkey
    function tileXYToQuadKey( tx,ty,zoom )
    {
        var quadKey = '';
        for ( var i = zoom; i > 0; i-- )
        {
            var digit = 0;
            var mask = 1 << ( i - 1 );
            if( ( tx & mask ) != 0 )
            {
                digit++;
            }
            if( ( ty & mask ) != 0 )
            {
                digit++;
                digit++;
            }
            quadKey += digit;
        }
        return quadKey;
    }

    //decodes the tlie X / Y coordinates & zoom level into a quadkey
    function quadKeyToTileXY( quadKeyString )
    {
        var tileX = 0;
        var tileY = 0;
        var quadKey = quadKeyString.split( '' );
        var levelOfDetail = quadKey.length;

        for( var i = levelOfDetail; i > 0; i--)
        {
            var mask = 1 << ( i - 1 );
            switch( quadKey[ levelOfDetail - i ] )
            {
                case '0':
                    break;

                case '1':
                    tileX |= mask;
                    break;

                case '2':
                    tileY |= mask;
                    break;

                case '3':
                    tileX |= mask;
                    tileY |= mask;
                    break;

                default:
                    return null;
            }
        }
        return { tx:tileX, ty:tileY, zoom:levelOfDetail };
    }


    // public methods

    var _p = Mercator.prototype;
    _p.constructor = Mercator;

    _p.init = init;
    _p.latLonToMeters = latLonToMeters;
    _p.metersToLatLon = metersToLatLon;
    _p.pixelsToMeters = pixelsToMeters;
    _p.metersToPixels = metersToPixels;
    _p.metersToTile = metersToTile;
    _p.pixelsToTile = pixelsToTile;
    _p.latLonToTile = latLonToTile;
    _p.pixelsToRaster = pixelsToRaster;
    _p.tileMetersBounds = tileMetersBounds;
    _p.tilePixelsBounds = tilePixelsBounds;
    _p.tileLatLngBounds = tileLatLngBounds;
    _p.resolution = resolution;
    _p.zoomForPixelSize = zoomForPixelSize;
    _p.pixelsToLatLng = pixelsToLatLng;
    _p.latLngToPixels = latLngToPixels;
    _p.latLngToTile = latLngToTile;
    _p.tileXYToQuadKey = tileXYToQuadKey;
    _p.quadKeyToTileXY = quadKeyToTileXY;

    return Mercator;


}();
},{}],5:[function(require,module,exports){

module.exports = function()
{
    /**
     * the physical representation of the map box
     * @param x
     * @param y
     * @param _w
     * @param _h
     * @constructor
     */

    function Rect( x,y,w,h ) {

        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

    }
    Rect.prototype =
    {
        get x(){ return this._x;}, set x( value ){ this._x = value; return this._x; },
        get y(){ return this._y;}, set y( value ){ this._y = value; return this._y; },
        get w(){ return this._w;}, set w( value ){ this._w = value; return this._w; },
        get h(){ return this._h;}, set h( value ){ this._h = value; return this._h; }
    };

    function containsPoint( _x, _y )
    {
        if( _x < this.x     ) return false;
        if( _y < this.y      ) return false;
        if( _x > this.x + this.w    ) return false;
        return _y <= this.y + this.h;
    }

    function isContained( _x, _y, _w, _h )
    {
        return ( this.x >= _x
        &&      this.y >= _y
        &&      this.x + this.w <= _x + _w
        &&      this.y + this.h <= _y + _h );
    }

    function intersect( _x, _y, _w, _h )
    {
        return !(  _x > this.x + this.w || _x+_w < this.x || _y > this.y + this.h || _y+_h< this.y );
    }

    function intersection( other )
    {
        if( this.intersect( other.x, other.y, other.x + other.w, other.y + other.h ) )
        {
            var x = Math.max( this.x, other.x );
            var y = Math.max( this.y, other.y );
            var w = Math.min( this.x + this.w, other.x + other.w ) - x;
            var h = Math.min( this.y + this.h, other.y + other.h ) - y;
            return new Rect( x,y,w,h );
        }
        return null;
    }

    var _p = Rect.prototype;

    _p.constructor = Rect;
    _p.containsPoint = containsPoint;
    _p.isContained = isContained;
    _p.intersect = intersect;
    _p.intersection = intersection;

    return Rect;

}();
},{}],6:[function(require,module,exports){
/*
* Tile object, holds reference to:
*
*      tile top left lat/lon
*      tile id
*      tile X/Y
*      tile pixel X/Y
*      the tile's DOM element
*
* + some helper methods ( contains, isContained, intersect )
*
* @param map the map this tile is bound to
* @param quadKey optional, can be set with initFromQuadKey()
* @constructor
*/

var events = require( 'events' );
module.exports = function()
{

    var undef;

    /**
     * @param map Map instance this tile is associated with
     * @param map the map this tile is bound to
     * @param quadKey the QuadKey of this Tile
     * @constructor
     */
    function Tile( map, quadKey )
    {

        if( map == null )throw new Error( "Tile: no map associated to Tile." );
        this.map = map;

        this.valid = true;
        this.loaded = false;

        this.key = "";
        this.id = -1;

        this.tx = -1;
        this.ty = -1;
        this.zoom = -1;

        this.lat = -1;
        this.lng = -1;

        this.meterBounds = undef;
        this.mx = -1;
        this.my = -1;

        this.pixelBounds = undef;
        this.px = -1;
        this.py = -1;

        //raster position (tile position relative to the canvas)
        this.rx = 0;
        this.ry = 0;

        this.viewRectPosition = [0,0];
        this.latLngBounds = undef;

        this.img = new Image();
        this.url = "";

        this.eventEmitter = new events.EventEmitter();

        this.quadKey = this.key = quadKey;
        if( this.quadKey != undef )
        {
            this.initFromQuadKey( this.quadKey );
        }

    }



    function initFromTileXY(x, y, zoom)
    {
        var quadKey = this.map.mercator.tileXYToQuadKey(x, y, zoom);
        initFromQuadKey(quadKey);
    }

    function initFromQuadKey(quadKey)
    {

        var tile = this.map.mercator.quadKeyToTileXY(quadKey);
        if ( tile == undef) {
            this.valid = false;
            return;
        }

        var center = this.map.mercator.tileLatLngBounds(this.tx + .5, this.ty + .5, this.zoom);
        this.lat = -center[0];
        this.lng = center[1];

        this.key = quadKey;
        this.id = parseInt(quadKey);

        this.tx = tile.tx;
        this.ty = tile.ty;
        this.zoom = tile.zoom;

        this.meterBounds = this.map.mercator.tileMetersBounds( this.tx, this.ty, this.zoom);
        this.mx = this.meterBounds[0];
        this.my = this.meterBounds[1];

        this.pixelBounds = this.map.mercator.tilePixelsBounds(this.tx, this.ty, this.zoom);
        this.px = this.pixelBounds[0];
        this.py = this.pixelBounds[1];

        this.latLngBounds = this.map.mercator.tileLatLngBounds(this.tx, this.ty, this.zoom);
        this.latLngBounds[0] *= -1;
        this.latLngBounds[2] *= -1;

        this.url = this.getMapUrl(this.tx, this.ty, this.zoom);

    }

    function load( callback )
    {
        if( !this.valid )
        {
            console.log( "invalid tile, not loading");
            return;
        }

        var scope = this;

        this.img.tile = this;
        this.img.crossOrigin = 'anonymous';
        this.img.onload = function (e) {

            if( scope.map == undef )
            {
                console.warn( 'loaded Tile has no associated map > ', scope.key, scope.zoom );
                return;
            }

            if( scope.map.mercator.tileSize != e.target.width ){
                scope.rescaleImage( e.target, scope.map.mercator.tileSize, window.devicePixelRatio );
            }

            scope.loaded = true;
            scope.eventEmitter.emit( Tile.ON_TILE_LOADED, scope );

        };
        this.img.setAttribute("key", this.key);
        this.img.src = this.url;
    }

    /**
     * rescales the image so that it fits the map's scale
     * @param img input image
     * @param tileSize destination tileSize
     * @param scale scale factor
     */
    function rescaleImage( img, tileSize, scale )
    {

        var canvas = document.createElement( 'canvas' );
        var w = canvas.width  = img.width ;
        var h = canvas.height = img.height;

        //collect image data
        var ctx = canvas.getContext("2d");
        ctx.drawImage( img, 0,0,w,h );
        var srcData = ctx.getImageData( 0,0,w,h).data;

        //result
        var imgOut = ctx.createImageData(tileSize,tileSize);
        var out = imgOut.data;

        //nearest neighbours upscale
        for( var i = 0; i < srcData.length; i+=4 )
        {
            var x = ( i/4 % w ) * scale;
            var y = ~~( i/4 / w ) * scale;
            for( var j = x; j <= x + scale; j++ )
            {
                if( x >= tileSize )continue;
                for( var k = y; k <= y + scale; k++ ) {

                    var id = ( ~~( j ) + ~~( k ) * tileSize ) * 4;
                    out[id]     = srcData[i  ];
                    out[id + 1] = srcData[i+1];
                    out[id + 2] = srcData[i+2];
                    out[id + 3] = srcData[i+3];
                }
            }
        }
        canvas.width  = canvas.height = tileSize;
        imgOut.data = out;
        ctx.putImageData(imgOut,0,0);

        //replace img with canvas
        delete this.img;
        this.img = canvas;

    }

    function getMapUrl(x, y, zl)
    {
        var url = this.map.provider;
        url = url.replace(/\{x\}/, x);
        url = url.replace(/\{y\}/, y);
        url = url.replace(/\{z\}/, zl);

        if( url.lastIndexOf("{s}") != -1  ){
            var domains = this.map.domains || [""];
            url = url.replace(/\{s\}/, domains[ parseInt( Math.random() * domains.length ) ] );
        }
        return url;
    }

    function containsLatLng(lat, lng){

        if (lat > this.latLngBounds[0]) return false;
        if (lng < this.latLngBounds[1]) return false;
        if (lat < this.latLngBounds[2]) return false;
        if (lat > this.latLngBounds[3]) return false;
        return true;
    }

    function isContained(latLngBound){

        return  this.latLngBounds[0] >= latLngBound[0]
        &&      this.latLngBounds[1] >= latLngBound[1]
        &&      this.latLngBounds[2] <= latLngBound[2]
        &&      this.latLngBounds[3] <= latLngBound[3];
    }

    function intersect(latLngBound){

        return !(   latLngBound[0] < this.latLngBounds[2] ||
                    latLngBound[1] > this.latLngBounds[3] ||
                    latLngBound[2] > this.latLngBounds[0] ||
                    latLngBound[3] < this.latLngBounds[1]   );
    }

    function dispose() {

        this.map = undef;
        delete this.map;
        this.meterBounds = undef;
        delete this.meterBounds;
        this.pixelBounds = undef;
        delete this.pixelBounds;

        delete this.viewRectPosition;
        delete this.latLngBounds;
        delete this.img;

        this.eventEmitter.removeAllListeners();
        delete this.eventEmitter;

    }

    var _p = Tile.prototype;
    _p.constructor = Tile;

    _p.initFromTileXY = initFromTileXY;
    _p.initFromQuadKey = initFromQuadKey;
    _p.load = load;
    _p.rescaleImage = rescaleImage;
    _p.getMapUrl = getMapUrl;
    _p.containsLatLng = containsLatLng;
    _p.isContained = isContained;
    _p.intersect = intersect;
    _p.dispose = dispose;

    Tile.ON_TILE_LOADED = 0;

    return Tile;

}();

},{"events":1}]},{},[2])(2)
});