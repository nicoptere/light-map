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
