// client/src/fx/RipplePipeline.js
// Custom Phaser WebGL pipeline that applies a sine-wave ripple distortion
// to any sprite it's assigned to. Used on the fountain-water sprite so the
// actual golden pixels in the image appear to be moving water.

const fragShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform float     uTime;       // elapsed seconds, passed each frame

varying vec2 outTexCoord;

void main(void) {
  vec2 uv = outTexCoord;

  // Ripple distortion — two overlapping sine waves at different frequencies
  // x-axis ripple (left-right sway)
  float dx = sin(uv.y * 18.0 + uTime * 2.8) * 0.006
           + sin(uv.y *  9.0 + uTime * 1.9) * 0.004;

  // y-axis ripple (up-down sway — smaller, gives depth)
  float dy = cos(uv.x * 14.0 + uTime * 2.2) * 0.004
           + cos(uv.x *  7.0 + uTime * 1.4) * 0.003;

  vec2 distorted = uv + vec2(dx, dy);

  // Clamp so we don't sample outside the texture
  distorted = clamp(distorted, 0.0, 1.0);

  vec4 color = texture2D(uMainSampler, distorted);

  // Subtle brightness pulse to simulate light dancing on water
  float pulse = 1.0 + 0.06 * sin(uTime * 3.5 + uv.x * 10.0 + uv.y * 8.0);
  color.rgb *= pulse;

  gl_FragColor = color;
}
`;

export class RipplePipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game) {
    super({
      game,
      fragShader,
    });
  }

  // Called automatically before each draw — update the time uniform
  onBind(gameObject) {
    super.onBind(gameObject);
    const t = this.game.loop.time / 1000; // convert ms → seconds
    this.set1f('uTime', t);
  }
}
