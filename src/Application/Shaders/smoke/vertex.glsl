uniform float uTime;
uniform float uSway;

varying vec2 vUv;

void main() {
  vec3 newPosition = position;

  // curl the wisp sideways the higher it rises
  float rise = uv.y;
  newPosition.x += sin(rise * 5.0 + uTime * 0.0012) * rise * uSway;
  newPosition.x += sin(rise * 11.0 - uTime * 0.0021) * rise * rise * uSway * 0.5;

  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
  gl_Position = projectionMatrix * viewMatrix * modelPosition;

  vUv = uv;
}
