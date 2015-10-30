define(
    [
        "vendor/three/three",
        'vendor/three/postprocessing/EffectComposer',
        'vendor/three/postprocessing/RenderPass',
        'vendor/three/postprocessing/ShaderPass',
        'vendor/three/postprocessing/MaskPass',
        'vendor/three/shaders/CopyShader',
        'vendor/three/shaders/FXAAShader',
        'vendor/three/shaders/VignetteShader'
    ]
var Composer = function( )
    {
        var undef;
        var _composer = undef;
        var vignette = undef;
        var fxaa = undef;

        var renderer = undef;
        var scene = undef;
        var camera = undef;

        var acitve = true;

        function Composer( _renderer, _scene, _camera ){

            renderer = _renderer;
            scene = _scene;
            camera = _camera;

            _composer = new EffectComposer( renderer );
            _composer.addPass( new RenderPass( scene, camera ) );

            vignette = new ShaderPass( VignetteShader );
            vignette.uniforms[ "offset" ].value = 1.35;
            vignette.uniforms[ "darkness" ].value = 1;
            vignette.renderToScreen = false;
            _composer.addPass( vignette );

            fxaa = new ShaderPass( FXAA );
            fxaa.renderToScreen = true;
            _composer.addPass( fxaa );

            if( settings.IS_DEV == true )  initGui();

        }

        function initGui()
        {

            var folder = gui.addFolder( "vignette" );

            folder.add( vignette, 'renderToScreen', true ).name('active');
            folder.add( vignette.uniforms.offset,'value',0,2).name('offset').listen();
            folder.add( vignette.uniforms.darkness,'value',0,2).name('darkness').listen();
            folder.close();

        }

        function render()
        {

            if( vignette.uniforms.offset.value == 0 )return;
            _composer.render();

        }

        function setSize(width, height) {
            _composer.setSize(width, height);
            fxaa.uniforms.resolution.value.set( 1 / width, 1 / height );
        }

        var _p = Composer.prototype;
        _p.render = render;
        _p.setSize = setSize;
        return Composer;

}();
