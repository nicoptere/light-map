var mercator = require( './mercator' );
var mapUtils = require( './mapUtils' );
var Rect = require( './Rect' );
var Tile = require( './Tile' );
var events = require('events');

module.exports = function(){

    function Map( provider, domains, width, height, minZoom, maxZoom ){

        this.mercator = mercator;

        this.provider = provider || "http://{s}.tile.openstreetmap.org/{x}/{y}/{z}.png";
        this.domains = domains || ["a","b", "c"];

        this._width = width || mercator.tileSize;
        this._height = height || mercator.tileSize;
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

        //viewRect
        this.viewRect = new Rect( 0,0,this.width,this.height );

        //create domElement if running in DOM
        this.isNode = ( typeof window === 'undefined' );
        if( !this.isNode ){

            this.canvas = document.createElement("canvas");
            this.canvas.width  = this.viewRect.w;
            this.canvas.height = this.viewRect.h;
            this.ctx = this.canvas.getContext("2d");
        }

        //events
        this.eventEmitter  = new events.EventEmitter();

    }

    //getters / setters
    Map.prototype = {

        get width(){return this._width; }, set width( value ){this._width = value; this.setViewRect(0,0,this.width, this.height ); },
        get height(){return this._height; }, set height( value ){this._height = value; this.setViewRect(0,0,this.width, this.height ); },
        get minZoom(){return this._minZoom; }, set minZoom( value ){this._minZoom = value; },
        get maxZoom(){return this._maxZoom; }, set maxZoom( value ){this._maxZoom = value; }

    };

    /**
     * sets the view rect
     * @param x
     * @param y
     * @param w
     * @param h
     */
    function setViewRect( x,y,w,h )
    {
        this.viewRect = new Rect( x,y,w,h );
        this._width = w;
        this._height = h;
        if( this.canvas != null ){

            this.canvas.width  = this.viewRect.w;
            this.canvas.height = this.viewRect.h;
        }
        this.setView(this.latitude, this.longitude, this.zoom );
    }

    function renderTiles()
    {
        if( this.isNode )return;

        this.ctx.clearRect( 0, 0, this.viewRect.w, this.viewRect.h );

        var c = this.getViewRectCenterPixels();
        var ctx = this.ctx;
        var zoom = this.zoom;
        var viewRect = this.viewRect;
        this.loadedTiles.forEach(function(tile)
        {
            if( tile.zoom == zoom )
            {
                var px = viewRect.x  +  viewRect.w / 2 + ( tile.px - c[ 0 ] );
                var py = viewRect.y  +  viewRect.h / 2 + ( tile.py - c[ 1 ] );
                ctx.drawImage( tile.img, Math.round( px ), Math.round( py ) );
            }
        });

        this.eventEmitter.emit( Map.ON_TEXTURE_UPDATE, this.ctx );

    }

    /**
     * returns an array of the latitude/longitude in degrees
     * @returns {*[]}
     */
    function getCenter(){

        return [ this.latitude, this.longitude ];
    }

    /**
     * returns an object of the latitude/longitude in degrees
     * @returns {*[]}
     */
    function getCenterLatLng(){

        return { lat:this.latitude, lng:this.longitude };
    }

    /**
     * returns the bounds of the view rect as an array of the latitude/longitude in degrees
     * @returns {*[top left lat, top left lon, bottom right lat, bottom right lon]}
     */
    function viewRectToLatLng( lat, lng, zoom ){

        var c = mercator.latLngToPixels( -lat, lng, zoom  );
        var w = this.viewRect.w;
        var h = this.viewRect.h;
        var tl = mercator.pixelsToLatLng( c[ 0 ] - w / 2, c[ 1 ] - h / 2, zoom );
        var br = mercator.pixelsToLatLng( c[ 0 ] + w / 2, c[ 1 ] + h / 2, zoom );
        return [ -tl[ 0 ], tl[ 1 ], -br[ 0 ], br[ 1 ] ];

    }

    /**
     * returns the bounds of the view rect as an object of the latitude/longitude in degrees
     * @returns {*[left lon, top lat, right lon, bottom lat]}
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
     * @returns {*[absolute x, absolute y, width, height ]}
     */
    function viewRectToPixels( lat, lng, zoom ){

        var c = mercator.latLngToPixels( -lat, lng, zoom  );
        return new Rect( c[ 0 ], c[ 1 ], this.viewRect.w, this.viewRect.h );
    }

    /**
     * returns an array of the latitude/longitude of the viewrect center in degrees
     * @returns {*[]}
     */
    function getViewRectCenter()
    {
        var bounds = viewRectToLatLng( this.latitude, this.longitude, this.zoom, this.viewRect);
        return [ mapUtils.map(.5,0,1, -bounds[0], -bounds[2] ), mapUtils.map(.5,0,1, bounds[1], bounds[3] )];
    }

    /**
     * returns an array of the absolute x/y coordinates of the viewrect center in pixels
     * @returns {*[]}
     */
    function getViewRectCenterPixels()
    {
        return mercator.latLngToPixels( -this.latitude, this.longitude, this.zoom );
    }

    /**
     * returns the absolute x/y coordinates of the viewrect top left corner in pixels
     * @returns {*[]}
     */
    function getViewRctTopLeft()
    {
        var c = mercator.latLngToPixels( -this.latitude, this.longitude, this.zoom  );
        var w = this.viewRect.w;
        var h = this.viewRect.h;
        return mercator.pixelsToLatLng( c[ 0 ] - w / 2, c[ 1 ] - h / 2, this.zoom );
    }

    /**
     * retrieves a tile by its quadkey
     * @param key
     * @returns {*}
     */
    function getTileByKey( key )
    {
        for( var k = 0; k < this.tiles.length; k++ )
        {
            if( this.tiles[ k ].key == key )
            {
                return this.tiles[ k ];
            }
        }
        return null;
    }

    /**
     * returns the X / Y index of the top left tile in the view rect
     * @param zoom
     * @returns {*[]}
     */
    function viewRectTilesDelta(zoom)
    {
        zoom = zoom || this.zoom;
        var bounds = this.viewRectToLatLng( this.latitude, this.longitude, zoom, this.viewRect);
        var tl = mercator.latLonToTile(-bounds[0], bounds[1], zoom);
        var br = mercator.latLonToTile(-bounds[2], bounds[3], zoom);
        var u = 0;
        var v = 0;
        for (var i = tl[0]; i <= br[0]; i++) u++;
        for (var j = tl[1]; j <= br[1]; j++) v++;
        return [ bounds[0], bounds[1], u, v ];
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
        var tl = mercator.latLonToTile(-bounds[0], bounds[1], zoom);
        var br = mercator.latLonToTile(-bounds[2], bounds[3], zoom);
        var u = 0;
        var v = 0;
        var tiles = [];
        for (var i = tl[0]; i <= br[0] ; i++)
        {
            v = 0;
            for (var j = tl[1]; j <= br[1]; j++)
            {
                var key = mercator.tileXYToQuadKey(i, j, zoom);
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
                    //if (exists == false) {
                    //    tiles.push(new Tile(this, key));
                    //    this.keys.push(key);
                    //}
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
        var tl = mercator.latLonToTile( -bounds[0], bounds[1], zoom );
        var br = mercator.latLonToTile( -bounds[2], bounds[3], zoom );

        var tiles = [];
        for( var i = tl[ 0 ]; i <= br[ 0 ]; i++ )
        {
            for( var j = tl[ 1 ]; j <= br[ 1 ]; j++ )
            {
                var key = mercator.tileXYToQuadKey( i, j, zoom );

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
        return mercator.latLngToPixels( -lat, lng, zoom || this.zoom );
    }

    /**
     * evaluates the "altitude" at which a camera should be from the ground (in meters)
     * more context : http://gis.stackexchange.com/questions/12991/how-to-calculate-distance-to-ground-of-all-18-osm-zoom-levels/142555#142555
     * @param latitude
     * @param zoom
     * @param multiplier
     * @returns {*}
     */
    function altitude( latitude, zoom, multiplier )
    {
        latitude    = latitude || this.latitude;
        zoom        = zoom || this.zoom;
        multiplier  = ( mercator.tileSize / 256 );

        var C = Math.PI * 2 * mercator.earthRadius;
        return mercator.earthRadius + ( C * Math.cos( latitude * RAD ) / Math.pow( 2, zoom ) * multiplier );
    }

    /**
     * gets the map resolution in pixels at a given zoom level
     * @param zoom
     * @returns {*}
     */
    function resolution( zoom )
    {
        zoom        = zoom || this.zoom;
        return mercator.resolution( zoom );
    }

    function dispose()
    {
        var scoep = this;
        this.tiles.forEach( function(tile){ tile.eventEmitter.remove( Tile.ON_TILE_LOADED, scope.appendTile ); tile.dispose(); });
        this.loadedTiles.forEach( function(tile){ tile.dispose(); });

        this.tiles = [];
        this.loadedTiles = [];
        this.keys = [];

    }

    //Map constants
    Map.ON_LOAD_COMPLETE    = 0;
    Map.ON_TILE_LOADED      = 1;
    Map.ON_TEXTURE_UPDATE   = 2;


    var _p = Map.prototype;
    _p.constructor = Map;

    _p.setViewRect             = setViewRect;
    _p.renderTiles             = renderTiles;
    _p.latLngToPixels          = latLngToPixels;
    _p.getCenter               = getCenter;
    _p.getCenterLatLng         = getCenterLatLng;
    _p.viewRectToLatLng        = viewRectToLatLng;
    _p.getViewPortBounds       = getViewPortBounds;
    _p.viewRectToPixels        = viewRectToPixels;
    _p.getViewRectCenter       = getViewRectCenter;
    _p.getViewRectCenterPixels = getViewRectCenterPixels;
    _p.getViewRctTopLeft       = getViewRctTopLeft;
    _p.setView                 = setView;
    _p.getTileByKey            = getTileByKey;
    _p.viewRectTilesDelta      = viewRectTilesDelta;
    _p.viewRectTiles           = viewRectTiles;
    _p.getVisibleTiles         = getVisibleTiles;
    _p.load                    = load;
    _p.appendTile              = appendTile;
    _p.altitude                = altitude;
    _p.resolution              = resolution;
    _p.dispose                 = dispose;

    return Map;

}();

