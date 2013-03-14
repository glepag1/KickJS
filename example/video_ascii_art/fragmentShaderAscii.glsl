#ifdef GL_ES
precision highp float;
#endif
varying vec2 uv;
uniform vec2 _viewport;
uniform sampler2D tex;
uniform sampler2D ascii;
const vec2 fontSize = vec2(8.0,16.0);

vec4 lookupASCII(float asciiValue){
  vec2 pos = mod(gl_FragCoord.xy,fontSize.xy);

  pos = pos / vec2(2048.0,16.0);
  pos.x += asciiValue;
  return vec4(texture2D(ascii,pos).rgb,1.0);
}


void main(void)
{
      vec2 invViewport = vec2(1.0) / _viewport;
      vec2 pixelSize = fontSize;
      vec4 sum = vec4(0.0);
      vec2 uvClamped = uv-mod(uv,pixelSize * invViewport);
      for (float x=0.0;x< fontSize.x;x++){
        for (float y=0.0;y< fontSize.y;y++){
            vec2 offset = vec2(x,y);
            sum += texture2D(tex,uvClamped+(offset*invViewport));
        }
      }
      vec4 avarage = sum / vec4(fontSize.x*fontSize.y);
      float brightness = dot(avarage.xyz,vec3(0.2125,0.7154,0.0721)); // luminance in sRGB
      vec4 clampedColor = floor(avarage*8.0)/8.0;
      float asciiChar = floor((1.0-brightness)*256.0)/256.0;
      gl_FragColor = clampedColor*lookupASCII(asciiChar);
}