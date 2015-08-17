light map
=============

minimal, lightweight, self contained TMS viewer with a 2d canvas renderer.

### Installation ###
```
npm install light-map --save
```

### Basic Usage Example ###

```js
<script src="light-map.min.js"></script>

<script>


    // provider: URL of the tile map service
    // domains: URL of the domains used by the tile map service
    // you can choose from a list of *free* TMS providers:
    // http://leaflet-extras.github.io/leaflet-providers/preview/
    // example:
    //
    //        provider = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    //        domains = [ "a", "b", "c" ];
    //
    //alternately you can use mbtiles

    var provider, domains;
    provider = "http://ttiles{s}.mqcdn.com/tiles/1.0.0/vy/sat/{z}/{x}/{y}.png";
    domains = [ "01" , "02", "03", "04" ];


    // we often need to use a proxy to load images on local servers
    // check out this gist : https://gist.github.com/nicoptere/a23ffae9ed51a5ca9766
    var proxy = "./proxy.php?url=";

    var map = new Map( proxy + provider, domains, 512,512, 0, 10 );
    document.body.appendChild( map.canvas );


    //listening to the loading events

    //all tiles were loaded
    function onLoadComplete( status )
    {
        if(status==0 )
        {
            console.log( "onLoadComplete", "->", status );
        }
    }

    //a new tile was loaded here
    function onTileLoaded( tile )
    {
        console.log( "onTileLoaded", "->", tile );
    }

    //the canvas' context is returned here
    function onTextureUpdate( ctx )
    {
        console.log( "onTextureUpdate" );
    }

    map.eventEmitter.on( Map.ON_LOAD_COMPLETE, onLoadComplete );
    map.eventEmitter.on( Map.ON_TILE_LOADED, onTileLoaded );
    map.eventEmitter.on( Map.ON_TEXTURE_UPDATE, onTextureUpdate );


    //this would be where I live :)
    var lat = o_lat = 48.854777;
    var lon = o_lon = 2.317499;
    var zoom = 16;
    map.setView( lat, lon, zoom );

    //it can be done in a loop
    function update(){

        var t = ( Math.sin( Date.now() * 0.001 ) );

        lat = o_lat;
        lon = o_lon + t * .0025;

        map.setView( lat, lon, zoom );

    }
    setInterval( update, 1000 / 60 );

    // and as the result is a canvas, it's possible
    // to add post processing to map.ctx
    ///*

    function postProcess( ctx )
    {

        /*
        //adding grain: computationnaly expensive, avoid in loops
        var imgData = ctx.getImageData(0,0,map.width, map.height );
        var data = imgData.data;

        var noise = 100;
        for( var i = 0; i < data.length; i+= 4 )
        {
            var grain = ~~( (.5 - Math.random() ) * 2 * noise );
            data[ i ]       += grain;
            data[ i + 1 ]   += grain;
            data[ i + 2 ]   += grain;
        }
        imgData.data = data;
        ctx.putImageData( imgData, 0,0 );
        //*/

        //create a vignette
        var w2 = map.width / 2;
        var grd = ctx.createRadialGradient( w2, w2, 0.000, w2, w2, w2);

        // Add colors
        grd.addColorStop(0.000, 'rgba(0, 0, 0, 0.00 )');
        grd.addColorStop(1.000, 'rgba(0, 0, 0, 0.75 )');

        // Fill with gradient
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, map.width, map.height );

    }
    map.eventEmitter.on( Map.ON_TEXTURE_UPDATE, postProcess );


</script>

```
it should look like this:<br>
<img src="https://github.com/nicoptere/light-map/blob/master/example/light-map.jpg">
<script>console.log( "howdy!");</script>
### additional information ###

[Python library to perform Mercator conversions](http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/)

[Quad keys explained](https://msdn.microsoft.com/en-us/library/bb259689.aspx)

### related ###
npm [globalMercator](https://github.com/davvo/globalmercator/blob/master/globalmercator.js)

### Test ###

### License ###

This content is released under the [MIT License](http://opensource.org/licenses/MIT).
