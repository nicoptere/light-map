
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
