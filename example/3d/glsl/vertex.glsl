uniform sampler2D diffuse;
uniform sampler2D heightmap;
uniform float elevation;
uniform float pointSize;
varying vec2 vUv;
void main(void)
{
    vUv = uv;
    vec3 pos = position;

    vec4 height = texture2D( heightmap, uv );
    pos.z = height.r * 10.;

    gl_PointSize = pointSize*3.;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );

}