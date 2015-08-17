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

module.exports = function( exports )
{

    //defaults
    var tileSize = 256;
    var earthRadius = 6378137;
    var initialResolution = 2 * Math.PI * earthRadius / tileSize;
    var originShift = 2 * Math.PI * earthRadius / 2.0;

    //public vars
    exports.tileSize = tileSize;
    exports.earthRadius = earthRadius;
    exports.initialResolution = initialResolution;
    exports.originShift = originShift;

    function init( tile_size, earth_radius )
    {
        //Initialize the TMS Global Mercator pyramid
        tileSize = tile_size || 256;

        earthRadius = earth_radius  || 6378137;

        // 156543.03392804062 for tileSize 256 pixels
        initialResolution = 2 * Math.PI * earthRadius / tileSize;

        // 20037508.342789244
        originShift = 2 * Math.PI * earthRadius / 2.0;

        exports.tileSize = tileSize;
        exports.earthRadius = earthRadius;
        exports.initialResolution = initialResolution;
        exports.originShift = originShift;

    }


    //converts given lat/lon in WGS84 Datum to XY in Spherical Mercator EPSG:900913
    function latLonToMeters( lat, lon )
    {
        var mx = lon * originShift / 180.0;
        var my = Math.log( Math.tan((90 + lat ) * Math.PI / 360.0)) / (Math.PI / 180.0);
        my = my * originShift / 180.0;
        return [mx, my];
    }

    //converts XY point from Spherical Mercator EPSG:900913 to lat/lon in WGS84 Datum
    function metersToLatLon( mx, my )
    {
        var lon = (mx / originShift) * 180.0;
        var lat = (my / originShift) * 180.0;
        lat = 180 / Math.PI * ( 2 * Math.atan( Math.exp(lat * Math.PI / 180.0 ) ) - Math.PI / 2.0);
        return [lat, lon];
    }

    //converts pixel coordinates in given zoom level of pyramid to EPSG:900913
    function pixelsToMeters( px, py, zoom )
    {
        var res = resolution(zoom);
        var mx = px * res - originShift;
        var my = py * res - originShift;
        return [mx, my];
    }

    //converts EPSG:900913 to pyramid pixel coordinates in given zoom level
    function metersToPixels( mx, my, zoom )
    {
        var res = resolution( zoom );
        var px = (mx + originShift) / res;
        var py = (my + originShift) / res;
        return [px, py];
    }

    //returns tile for given mercator coordinates
    function metersToTile( mx, my, zoom )
    {
        var pxy = metersToPixels(mx, my, zoom);
        return pixelsToTile(pxy[0], pxy[1]);
    }

    //returns a tile covering region in given pixel coordinates
    function pixelsToTile( px, py)
    {
        var tx = parseInt( Math.ceil( px / parseFloat( tileSize ) ) - 1);
        var ty = parseInt( Math.ceil( py / parseFloat( tileSize ) ) - 1);
        return [tx, ty];
    }

    //returns a tile covering region the given lat lng coordinates
    function latLonToTile( lat, lng, zoom )
    {
        var px = latLngToPixels( lat, lng, zoom );
        return pixelsToTile( px[ 0 ], px[ 1 ] );
    }

    //Move the origin of pixel coordinates to top-left corner
    function pixelsToRaster( px, py, zoom )
    {
        var mapSize = tileSize << zoom;
        return [px, mapSize - py];
    }

    //returns bounds of the given tile in EPSG:900913 coordinates
    function tileMetersBounds( tx, ty, zoom )
    {
        var min = pixelsToMeters(tx * tileSize, ty * tileSize, zoom);
        var max = pixelsToMeters((tx + 1) * tileSize, (ty + 1) * tileSize, zoom);
        return [ min[0], min[1], max[0], max[1] ];
    }

    //returns bounds of the given tile in pixels
    function tilePixelsBounds( tx, ty, zoom )
    {
        var bounds = tileMetersBounds( tx, ty, zoom );
        var min = metersToPixels(bounds[0], bounds[1], zoom );
        var max = metersToPixels(bounds[2], bounds[3], zoom );
        return [ min[0], min[1], max[0], max[1] ];
    }

    //returns bounds of the given tile in latutude/longitude using WGS84 datum
    function tileLatLngBounds( tx, ty, zoom )
    {
        var bounds = tileMetersBounds( tx, ty, zoom );
        var min = metersToLatLon(bounds[0], bounds[1]);
        var max = metersToLatLon(bounds[2], bounds[3]);
        return [ min[0], min[1], max[0], max[1] ];
    }

    //resolution (meters/pixel) for given zoom level (measured at Equator)
    function resolution( zoom )
    {
        //return (2 * Math.PI * 6378137) / (self.tileSize * 2 **zoom)
        //?...//return ( 2 * Math.PI * earth_radius / tileSize ) / ( tileSize * Math.pow( 2, zoom ) );
        return initialResolution / Math.pow( 2, zoom );
    }

    /**
     * gives the camera's 'altitude' from the center of the earth at a given latitude
     * @param latitude
     * @param zoomlevel
     * @returns {*}
     */
    function altitude( latitude, zoomlevel )
    {
        /*
         The distance represented by one pixel (S) is given by

         S = C * cos( y )/ 2 ^ zoomlevel

         where
         latitude: is the latitude of where you're interested in the scale.
         zoomlevel: is the zoom level ( typically a value between 0 & 21 )

         and

         C is the (equatorial) circumference of the Earth
         earthRadius = 6378137 ( earth radius in meters )
         //*/
        var C = Math.PI * 2 * earthRadius;
        return earthRadius + ( C * Math.cos( latitude ) / Math.pow( 2, zoomlevel ) * ( exports.tileSize / 256 ) );

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
        while( pixelSize > resolution(i) )
        {
            i--;
            if( i <= 0 )return 0;
        }
        return i;
    }

    //returns the lat lng of a pixel X/Y coordinates at given zoom level
    function pixelsToLatLng( px, py, zoom )
    {
        var meters = pixelsToMeters( px, py, zoom );
        return metersToLatLon( meters[ 0 ], meters[ 1 ] );
    }

    //returns the pixel X/Y coordinates at given zoom level from a given lat lng
    function latLngToPixels( lat, lng, zoom )
    {
        var meters = latLonToMeters( lat, lng, zoom );
        return metersToPixels( meters[ 0 ], meters[ 1 ], zoom );
    }

    //retrieves a given tile from a given lat lng
    function latLngToTile( lat, lng, zoom )
    {
        var meters = latLonToMeters( lat, lng );
        return metersToTile( meters[ 0 ], meters[ 1 ], zoom );
    }

    //encodes the tlie X / Y coordinates into a quadkey
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

    exports.init = init;
    exports.latLonToMeters = latLonToMeters;
    exports.metersToLatLon = metersToLatLon;
    exports.pixelsToMeters = pixelsToMeters;
    exports.metersToPixels = metersToPixels;
    exports.metersToTile = metersToTile;
    exports.pixelsToTile = pixelsToTile;
    exports.latLonToTile = latLonToTile;
    exports.pixelsToRaster = pixelsToRaster;
    exports.tileMetersBounds = tileMetersBounds;
    exports.tilePixelsBounds = tilePixelsBounds;
    exports.tileLatLngBounds = tileLatLngBounds;
    exports.resolution = resolution;
    exports.zoomForPixelSize = zoomForPixelSize;
    exports.pixelsToLatLng = pixelsToLatLng;
    exports.latLngToPixels = latLngToPixels;
    exports.latLngToTile = latLngToTile;
    exports.tileXYToQuadKey = tileXYToQuadKey;
    exports.quadKeyToTileXY = quadKeyToTileXY;
    return exports;

}( {} );