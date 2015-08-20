var Mercator = require( './Mercator' );
var utils = require( './MapUtils' );
var Rect = require( './Rect' );
var Tile = require( './Tile' );
var events = require('events');

module.exports = function(){

    function Map( provider, domains, width, height, minZoom, maxZoom ){

        this.utils = utils;

        //prvoders
        this.provider = provider || "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        this.domains = domains || ["a","b","c"];

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

        //sets the scale of the map, handles retina display
        this.scale = window.devicePixelRatio || 1;
        this.retina = this.scale != 1;
        this.mercator = new Mercator( 256 * this.scale );

        //create domElement if running in DOM
        this.isNode = ( typeof window === 'undefined' );
        if( !this.isNode ){

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");

            // disable smoothing of retina scaled images (i.e. use a neirest-neighbour filter)
            this.ctx.imageSmoothingEnabled      = !this.retina;
            this.ctx.mozImageSmoothingEnabled   = !this.retina;
            this.ctx.msImageSmoothingEnabled    = !this.retina;
        }

        //viewRect
        this.setSize( width, height, true );

    }

    //getters / setters
    Map.prototype = {

        get width(){return this._width; }, set width( value ){this._width = value; this.setSize(this.width, this.height ); },
        get height(){return this._height; }, set height( value ){this._height = value; this.setSize(this.width, this.height ); },
        get minZoom(){return this._minZoom; }, set minZoom( value ){this._minZoom = value; },
        get maxZoom(){return this._maxZoom; }, set maxZoom( value ){this._maxZoom = value; }

    };

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
            this.canvas.style.width  = this.viewRect.w + 'px';
            this.canvas.style.height = this.viewRect.h + 'px';
        }
        this.setView(this.latitude, this.longitude, this.zoom );
        
    }

    function renderTiles()
    {
        if( this.isNode )return;

        this.ctx.clearRect( 0, 0, this.viewRect.w, this.viewRect.h );

        //this.ctx.restore();
        //this.ctx.save();
        //if(this.retina)
        //{
        //    this.ctx.scale( this.scale, this.scale );
        //}

        var c = this.getViewRectCenterPixels();
        var ctx = this.ctx;
        var zoom = this.zoom;
        var viewRect = this.viewRect;
        var tileSize = this.mercator.tileSize;
        var scale = this.scale;
        this.loadedTiles.forEach(function(tile)
        {
            if( tile.zoom == zoom )
            {
                var px = viewRect.x * scale +  viewRect.w / 2 * scale + ( tile.px - c[ 0 ] );
                var py = viewRect.y * scale +  viewRect.h / 2 * scale + ( tile.py - c[ 1 ] );

                ctx.drawImage( tile.img, Math.round( px ), Math.round( py ) );
                ctx.strokeRect( Math.round( px ), Math.round( py ), tileSize- 1, tileSize - 1 );

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
     * @returns [ top left lat, top left lon, bottom right lat, bottom right lon]
     */
    function viewRectToLatLng( lat, lng, zoom ){

        var c = this.mercator.latLngToPixels( -lat, lng, zoom  );
        var w = this.viewRect.w;
        var h = this.viewRect.h;
        var tl = this.mercator.pixelsToLatLng( c[ 0 ] - w / 2, c[ 1 ] - h / 2, zoom );
        var br = this.mercator.pixelsToLatLng( c[ 0 ] + w / 2, c[ 1 ] + h / 2, zoom );
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
    function viewRectToPixels( lat, lng, zoom ){

        var c = this.mercator.latLngToPixels( -lat, lng, zoom  );
        return new Rect( c[ 0 ]-this.viewRect.w/2, c[ 1 ]-this.viewRect.h/2, this.viewRect.w, this.viewRect.h );
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
        var bounds = viewRectToLatLng( this.latitude, this.longitude, this.zoom, this.viewRect);
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
     * returns the absolute x/y coordinates of the viewrect top left corner in pixels
     * @returns {*[]}
     */
    function getViewRctTopLeft()
    {
        var c = this.mercator.latLngToPixels( -this.latitude, this.longitude, this.zoom  );
        var w = this.viewRect.w;
        var h = this.viewRect.h;
        return this.mercator.pixelsToLatLng( c[ 0 ] - w / 2, c[ 1 ] - h / 2, this.zoom );
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
        var tl = this.mercator.latLonToTile(-bounds[0], bounds[1], zoom);
        var br = this.mercator.latLonToTile(-bounds[2], bounds[3], zoom);
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
        this.tiles.forEach( function(tile){ tile.eventEmitter.removeListener( Tile.ON_TILE_LOADED, scope.appendTile ); tile.dispose(); });
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

    _p.setSize                  = setSize;
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
    _p.resolution              = resolution;
    _p.dispose                 = dispose;

    return Map;

}();

