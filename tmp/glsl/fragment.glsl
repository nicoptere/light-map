#define PI 3.1415926535897932384626433832795
precision mediump float;

uniform vec2 iResolution;
uniform float iGlobalTime;
uniform sampler2D iChannel0;

void main(){

    vec2 uv = ( -iResolution.xy + gl_FragCoord.xy) / iResolution.y + vec2(1.);
	uv.y = 1. - uv.y;

    vec4 col = texture2D( iChannel0, uv );

    col *= abs( cos( ( .5 + uv.x ) * PI) * sin( uv.y * PI ) );

	gl_FragColor = vec4( vec3( col ), 1. );

}

/*float scanline(vec2 uv) {
  	return sin(iResolution.y * uv.y * 0.7 - iGlobalTime * 10.0);
  }

  float slowscan(vec2 uv) {
  	return sin(iResolution.y * uv.y * 0.02 + iGlobalTime * 6.0);
  }

  vec2 colorShift(vec2 uv) {
  	return vec2(
  		uv.x,
  		uv.y + sin(iGlobalTime)*0.02
  	);
  }

  float noise(vec2 uv) {
  	return clamp(texture2D(iChannel1, uv.xy + iGlobalTime*6.0).r +
  		texture2D(iChannel1, uv.xy - iGlobalTime*4.0).g, 0.96, 1.0);
  }

  // from https://www.shadertoy.com/view/4sf3Dr
  // Thanks, Jasper
  vec2 crt(vec2 coord, float bend)
  {
  	// put in symmetrical coords
  	coord = (coord - 0.5) * 2.0;

  	coord *= 0.5;

  	// deform coords
  	coord.x *= 1.0 + pow((abs(coord.y) / bend), 2.0);
  	coord.y *= 1.0 + pow((abs(coord.x) / bend), 2.0);

  	// transform back to 0.0 - 1.0 space
  	coord  = (coord / 1.0) + 0.5;

  	return coord;
  }

  vec2 colorshift(vec2 uv, float amount, float rand) {

  	return vec2(
  		uv.x,
  		uv.y + amount * rand // * sin(uv.y * iResolution.y * 0.12 + iGlobalTime)
  	);
  }

  vec2 scandistort(vec2 uv) {
  	float scan1 = clamp(cos(uv.y * 2.0 + iGlobalTime), 0.0, 1.0);
  	float scan2 = clamp(cos(uv.y * 2.0 + iGlobalTime + 4.0) * 10.0, 0.0, 1.0) ;
  	float amount = scan1 * scan2 * uv.x;

  	uv.x -= 0.05 * mix(texture2D(iChannel1, vec2(uv.x, amount)).r * amount, amount, 0.9);

  	return uv;

  }

  float vignette(vec2 uv) {
  	uv = (uv - 0.5) * 0.98;
  	return clamp(pow(cos(uv.x * 3.1415), 1.2) * pow(cos(uv.y * 3.1415), 1.2) * 50.0, 0.0, 1.0);
  }

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
  	vec2 uv = fragCoord.xy / iResolution.xy;
  	vec2 sd_uv = scandistort(uv);
  	vec2 crt_uv = crt(sd_uv, 2.0);

  	vec4 color;

  	//float rand_r = sin(iGlobalTime * 3.0 + sin(iGlobalTime)) * sin(iGlobalTime * 0.2);
  	//float rand_g = clamp(sin(iGlobalTime * 1.52 * uv.y + sin(iGlobalTime)) * sin(iGlobalTime* 1.2), 0.0, 1.0);
  	vec4 rand = texture2D(iChannel1, vec2(iGlobalTime * 0.01, iGlobalTime * 0.02));

  	color.r = texture2D(iChannel0, crt(colorshift(sd_uv, 0.025, rand.r), 2.0)).r;
  	color.g = texture2D(iChannel0, crt(colorshift(sd_uv, 0.01, rand.g), 2.0)).g;
  	color.b = texture2D(iChannel0, crt(colorshift(sd_uv, 0.024, rand.b), 2.0)).b;

  	vec4 scanline_color = vec4(scanline(crt_uv));
  	vec4 slowscan_color = vec4(slowscan(crt_uv));

  	fragColor = mix(color, mix(scanline_color, slowscan_color, 0.5), 0.05) *
  		vignette(uv) *
  		noise(uv);

  	//fragColor = vec4(vignette(uv));
  	//vec2 scan_dist = scandistort(uv);
  	//fragColor = vec4(scan_dist.x, scan_dist.y,0.0, 1.0);
  }
  //*/