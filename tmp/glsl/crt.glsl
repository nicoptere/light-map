#define PI 3.1415926535897932384626433832795
precision mediump float;

uniform vec2 iResolution;
uniform float iGlobalTime;
uniform sampler2D iChannel0;

float vignette(vec2 uv, float _pow, float mult ) {
    uv = (uv - 0.5) * 0.98;
    return clamp(pow(cos(uv.x * PI), _pow ) * pow(cos(uv.y * PI ), _pow ) * mult, 0.0, 1.0);
}

void main(){

    vec2 uv = ( -iResolution.xy + gl_FragCoord.xy) / iResolution.y + vec2(1.);
	uv.y = 1. - uv.y;

    vec3 light = vec3( 1., 1., 1. );
    light = normalize(light);

    float dProd;
    dProd = dot(vec3(cos( ( .5 + uv.x ) * PI * 10.) , sin( uv.y * PI * 2.5 ), 1. ) , light );
  	dProd *= abs( dot(vec3(cos( ( .5 + uv.x ) * PI * 2.) , sin( uv.y * PI * -1.5 ), 1. ) , light ) );


    vec4 col = texture2D( iChannel0, uv );
    gl_FragColor = vec4( vec3( col * dProd ) * vignette( uv, 2., 5. ), 1.0 );
  
}