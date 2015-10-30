uniform sampler2D diffuse;
uniform sampler2D heightmap;
varying vec2 vUv;
void main(){

    //gl_FragColor = texture2D( diffuse, vUv );
    gl_FragColor = texture2D( heightmap, vUv );

}