var stage3d = function( exports )
{

    var undef;
    var PI = Math.PI;
    var RAD = PI / 180;

    exports.composer            = undef;
    exports.scene               = undef;
    exports.camera              = undef;
    exports.renderer            = undef;
    exports.domElement          = undef;
    exports.resolution          = new THREE.Vector2();

    function init( width, height )
    {

        exports.scene = new THREE.Scene();

        exports.camera = new THREE.PerspectiveCamera( 30, width / height, 1, 10000 );
        exports.camera.position.z = 600;

        exports.renderer = new THREE.WebGLRenderer(
        {
                //precision: "highp",
                clearColor: 0x808080,
                alpha: true,
                stencil: false,
                antialias: true,
                preserveDrawingBuffer: false,
                transparent: false,
                logarithmicDepthBuffer: true,
                gammaInput : false,
                gammaOutput : false,
                shadowMapEnabled : false,
                autoClear : false
        });

        exports.renderer.setSize( width, height );
        exports.gl = exports.renderer.context;

        exports.domElement = exports.renderer.domElement;

        exports.controls = new THREE.OrbitControls( exports.camera, exports.domElement );
        exports.controls.minPolarAngle = 20 * RAD;
        exports.controls.maxPolarAngle = PI - 20 * RAD;

        //exports.composer = new Composer( exports.renderer, exports.scene, exports.camera );

        document.body.appendChild( exports.domElement );


    }

    function add( obj )
    {
        exports.scene.add( obj );
    }

    function remove( obj )
    {
        exports.scene.remove( obj );
    }

    function resize()
    {

        var width = window.innerWidthr;
        var height = window.innerHeight;

        var isMobile = window.devicePixelRatio > 1;

        if (isMobile){
            width /= 2;
            height /= 2;
            exports.renderer.domElement.style.width = Math.ceil(width * 2) + 'px';
            exports.renderer.domElement.style.height = Math.ceil(height * 2) + 'px';
        }

        exports.camera.aspect = width / height;
        exports.camera.updateProjectionMatrix();

        exports.renderer.setSize(width, height);
        if( exports.composer != undef ) exports.composer.setSize(width, height);

        exports.resolution.x = width;
        exports.resolution.y = height;
        exports.onResized.dispatch();

    }

    function render( dt ){

        //for the cities and objects that need rescale
        exports.controls.update();
        exports.renderer.render( exports.scene, exports.camera);
        if( exports.composer != undef ) exports.composer.render( dt );

    }

    exports.init                    = init;
    exports.add                     = add;
    exports.remove                  = remove;
    exports.resize                  = resize;
    exports.render                  = render;
    return exports;

}({});
