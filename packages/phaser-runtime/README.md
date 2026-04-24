# @clawgame/phaser-runtime

Phaser 4 preview/runtime bridge for ClawGame scenes.

## Phaser 4 compatibility

- The default renderer is `Phaser.WEBGL`. `auto` and `canvas` are supported only as explicit fallbacks through `rendererType`.
- Runtime config is generated deterministically from the preview bootstrap before Phaser is mounted.
- Pixel-art defaults are explicit: `roundPixels: true` and `smoothPixelArt: false`.
- Scale Manager defaults are `Scale.FIT`, `Scale.CENTER_BOTH`, explicit bootstrap dimensions, and `expandParent: false` so the editor owns parent sizing.
- The game background color comes from the preview bootstrap.
- Assets are loaded through Phaser loader APIs: `image`, `spritesheet`, `atlas`, and `atlasXML`.
- Missing assets are reported and receive a generated fallback texture only after Phaser reports a load failure.
- Runtime failures are reported through `PhaserRuntimeErrorReporter` and exposed through `ClawgamePhaserScene.getErrors()`.
