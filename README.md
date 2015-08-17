light map
=============

minimal, lightweight, self contained TMS viewer with a 2d canvas renderer.

### About Delaunay triangulation ###

### Live demo ###

- [Basic example]()

### Installation ###
```
npm install light-map --save
```

### Basic Usage Example ###

```js
var Map = require('light-map');
//use proxy?
var proxy = "./proxy.php?url=";

//list of *free* TMS providers
//http://leaflet-extras.github.io/leaflet-providers/preview/

var provider, domains;
provider = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
domains = [ "a", "b", "c" ];

provider = "http://ttiles{s}.mqcdn.com/tiles/1.0.0/vy/sat/{z}/{x}/{y}.png";
domains = [ "01" , "02", "03", "04" ];

var m = new Map( proxy + provider, domains, 512,256, 0, 10 );
document.body.appendChild( m.canvas );

function onLoadComplete( status )
{
    console.log( "onLoadComplete", "->", status );
}
function onTileLoaded( tile )
{
    console.log( "onTileLoaded", "->", tile );
}
function onTextureUpdate( ctx )
{
    console.log( "onTextureUpdate", "->", ctx );
}

m.eventEmitter.on( Map.ON_LOAD_COMPLETE, onLoadComplete );
m.eventEmitter.on( Map.ON_TILE_LOADED, onTileLoaded );
m.eventEmitter.on( Map.ON_TEXTURE_UPDATE, onTextureUpdate );

m.setView( 0,0, 1 );

```
### additional information ###

[Python library to perform Mercator conversions](http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/)

[Quad keys explained](https://msdn.microsoft.com/en-us/library/bb259689.aspx)

### related ###
npm [globalMercator](https://github.com/davvo/globalmercator/blob/master/globalmercator.js)

### Test ###

### License ###

This content is released under the [MIT License](http://opensource.org/licenses/MIT).