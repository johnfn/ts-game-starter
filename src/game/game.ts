import { BaseGame } from "../library/base_game";
import { AssetsToLoad, Assets } from "./assets";
import { Player } from "./player";
import { DebugFlags } from "./debug";
import { C } from "./constants";
import { TiledTilemap } from "../library/tilemap/tilemap";
import { Rect } from "../library/geometry/rect";

export class Game extends BaseGame<typeof AssetsToLoad> {
  public static Instance: Game;

  constructor() {
    super({
      canvasWidth: C.CanvasWidth,
      canvasHeight: C.CanvasHeight,
      tileWidth: 256,
      tileHeight: 256,
      scale: 1,
      assets: Assets,
      debugFlags: DebugFlags,
      state: {
        tick: 0,

        player: undefined as any,
      }
    });

    Game.Instance = this;
  }

  initialize() {
    this.stage.addChild(this.state.player = new Player());
    const map = new TiledTilemap({
      json: Assets.getResource("map"),
      assets: Assets,
      renderer: this.renderer,
      pathToTilemap: "",
      customObjects: [],
    });

    const layers = map.loadLayersInRectCached(new Rect({
      x: 0,
      y: 0,
      width: 640,
      height: 640,
    }));

    for (const layer of layers) {
      this.stage.addChild(layer.entity);
    }
  }
}
