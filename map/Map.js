var mercator = require( './mercator' );
var mapUtils = require( './mapUtils' );
var Rect = require( './Rect' );
var Tile = require( './Tile' );
var events = require('events');

module.exports = function(){

    function Map( provider, domains, width, height, minZoom, maxZoom )
    {

        this.provider = provider || "http://{s}.tile.openstreetmap.org/{x}/{y}/{z}.png";
        this.domains = domains || ["a","b", "c"];

        this.tileSize = mercator.tileSize;

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
        this.setViewRect( 0,0,this.width,this.height );

        //create domElement if running in DOM
        this.isNode = ( typeof window === 'undefined' );
        if( !this.isNode ){
            this.createDomElements();
        }

        //events
        this.eventEmitter  = new events.EventEmitter();

    }

    //getters / setters
    Map.prototype = {

        get name(){return this._name; }, set name( value ){this._name = value; this.container.id = value; },
        get width(){return this._width; }, set width( value ){this._width = value; this.setViewRect(0,0,this.width, this.height ); },
        get height(){return this._height; }, set height( value ){this._height = value; this.setViewRect(0,0,this.width, this.height ); },
        get minZoom(){return this._minZoom; }, set minZoom( value ){this._minZoom = value; },
        get maxZoom(){return this._maxZoom; }, set maxZoom( value ){this._maxZoom = value; }

    };


    //append the map to a DOM node
    function createDomElements()
    {

        this.container = document.createElement("div");
        this._name = this.container.id = "mapContainer";

        this.canvas = document.createElement("canvas");
        this.canvas.width  = this.viewRect.w;
        this.canvas.height = this.viewRect.h;
        this.ctx = this.canvas.getContext("2d");
        this.container.appendChild(this.canvas);

        this.domElement = document.createElement("div");
        this.domElement.style.position = "absolute";
        this.domElement.style.top = "0";
        this.domElement.style.left = "0";
        //this.domElement.style.visibility = "hidden";

    }


    function setViewRect( x,y,w,h )
    {
        this.viewRect = new Rect( x,y,w,h );
        if( this.canvas != null ){

            this.canvas.width  = this.viewRect.w;
            this.canvas.height = this.viewRect.h;

        }
    }

    function locateTiles()
    {
        if( this.isNode )return;

        this.ctx.strokeStyle = "rgba( 255,0,0,1 )";
        this.ctx.clearRect( 0, 0, this.viewRect.w, this.viewRect.h );

        var c = this.getViewRectCenterPixels();

        var children = this.domElement.getElementsByTagName( "img" );
        for( var i = 0; i < children.length; i++ )
        {

            var tile = children[ i ].tile;
            if( tile.zoom == this.zoom )
            {

                var px = this.viewRect.x  + this.viewRect.w / 2 + ( tile.px - c[ 0 ] );
                var py = this.viewRect.y  + this.viewRect.h / 2 + ( tile.py - c[ 1 ] );

                tile.img.style.position = "absolute";
                tile.img.style.left = px +"px";
                tile.img.style.top  = py +"px";

                tile.localX = px;
                tile.localY = py;

                this.ctx.drawImage( tile.img, Math.round( px ), Math.round( py ) );

            }
        }

        //this.onTextureUpdate.dispatch( ctx );
        this.eventEmitter.emit( Map.ON_TEXTURE_UPDATE, this.ctx );

    }

    function latLngToPixels( lat, lng, zoom ){

        var tl = this.getViewRctTopLeft();
        var offset = mercator.latLngToPixels( -tl[0], tl[1], zoom );
        var point = mercator.latLngToPixels( lat, lng, zoom );
        return{
            x: point[0]-offset[0],
            y: -( point[1]-offset[1] )
        };
    }

    function getCenter(){

        return [ this.latitude, this.longitude ];
    }

    function getCenterLatLng(){

        return { lat:this.latitude, lng:this.longitude };
    }

    function viewRectToLatLng( lat, lng, zoom ){

        var c = mercator.latLngToPixels( -lat, lng, zoom  );
        var w = this.viewRect.w;
        var h = this.viewRect.h;
        var tl = mercator.pixelsToLatLng( c[ 0 ] - w / 2, c[ 1 ] - h / 2, zoom );
        var br = mercator.pixelsToLatLng( c[ 0 ] + w / 2, c[ 1 ] + h / 2, zoom );
        return [ -tl[ 0 ], tl[ 1 ], -br[ 0 ], br[ 1 ] ];

    }

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

    function viewRectToPixels( lat, lng, zoom ){

        var c = mercator.latLngToPixels( -lat, lng, zoom  );
        return new Rect( c[ 0 ], c[ 1 ], this.viewRect.w, this.viewRect.h );
    }

    function getViewRectCenter()
    {
        var bounds = viewRectToLatLng( this.latitude, this.longitude, this.zoom, this.viewRect);
        return [ mapUtils.map(.5,0,1, -bounds[0], -bounds[2] ), mapUtils.map(.5,0,1, bounds[1], bounds[3] )];
    }

    function getViewRectCenterPixels()
    {
        return mercator.latLngToPixels( -this.latitude, this.longitude, this.zoom );
    }

    function getViewRctTopLeft()
    {

        var c = mercator.latLngToPixels( -this.latitude, this.longitude, this.zoom  );
        var w = this.viewRect.w;
        var h = this.viewRect.h;
        return mercator.pixelsToLatLng( c[ 0 ] - w / 2, c[ 1 ] - h / 2, this.zoom );

    }

    //retrieves a tile by its quadkey
    //@param key
    function getTileByKey( key )
    {
        for( var k = 0; k < this.tiles.length; k++ )
        {
            if( this.tiles[ k ].key == key )
            {
                return this.tiles[ k ]
            }
        }
        return null;
    }

    function getEarthTiles( zoom )
    {
        return this.viewRectTiles(zoom).concat( this.viewRectTiles(zoom-1)).concat( this.viewRectTiles(zoom+1));
    }

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
                for (var k = 0; k < this.loadedTiles.length; k++)
                {
                    if (this.loadedTiles[k].key == key )
                    {
                        this.loadedTiles[k].viewRectPosition[0] = u;
                        this.loadedTiles[k].viewRectPosition[1] = v;
                        tiles.push(this.loadedTiles[k]);
                        break;
                    }
                }
                v++;
            }
            u++;
        }
        return tiles;
    }

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
        this.latitude = lat;
        this.longitude = lng;
        this.zoom = zoom;
        this.load();
        this.locateTiles();
    }

    function load()
    {

        var tiles = this.getVisibleTiles( this.latitude, this.longitude, this.zoom, this.viewRect  );

        if( tiles.length == 0 && this.tiles.length == 0 )
        {
            this.eventEmitter.emit( Map.ON_LOAD_COMPLETE, -1 );
            return;
        }

        for ( var i = 0; i < tiles.length; i++ ) {
            tiles[ i ].eventEmitter.on( Tile.ON_TILE_LOADED, this.addTileToDom  );
            tiles[ i ].load();
        }
        this.tiles = this.tiles.concat( tiles );

    }

    function addTileToDom( tile )
    {

        var scope = tile.map;

        var img = tile.img;
        scope.domElement.appendChild( img );
        scope.tiles.splice( scope.tiles.indexOf( tile ), 1 );
        scope.loadedTiles.push( tile );

        scope.locateTiles( true );
        scope.eventEmitter.emit( Map.ON_TILE_LOADED, tile );

        if( scope.tiles.length == 0 ){

            scope.eventEmitter.emit( Map.ON_LOAD_COMPLETE, 0 );
        }
    }


    function altitude( latitude, zoom, multiplier )
    {
        latitude    = latitude || this.latitude;
        zoom        = zoom || this.zoom;
        multiplier  = ( mercator.tileSize / 256 );

        var C = Math.PI * 2 * mercator.earthRadius;
        return mercator.earthRadius + ( C * Math.cos( latitude * RAD ) / Math.pow( 2, zoom ) * multiplier );
    }


    function resolution( zoom )
    {
        zoom        = zoom || this.zoom;
        return mercator.resolution( zoom );
    }


    //Map constants
    Map.ON_LOAD_COMPLETE    = 0;
    Map.ON_TILE_LOADED      = 1;
    Map.ON_TEXTURE_UPDATE   = 2;


    var _p = Map.prototype;
    _p.constructor = Map;

    _p.createDomElements        = createDomElements;
    _p.setViewRect             = setViewRect;
    _p.locateTiles             = locateTiles;
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
    _p.getEarthTiles           = getEarthTiles;
    _p.viewRectTilesDelta      = viewRectTilesDelta;
    _p.viewRectTiles           = viewRectTiles;
    _p.getVisibleTiles         = getVisibleTiles;
    _p.load                    = load;
    _p.addTileToDom            = addTileToDom;
    _p.altitude                = altitude;
    _p.resolution              = resolution;

    return Map;

}();

