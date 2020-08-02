import { Vector2, IVector2 } from "./geometry/vector2";
import { Graphics, Sprite, Container } from "pixi.js";
import { Line } from "./geometry/line";
import { Entity } from "./entity";
import { Rect } from "./geometry/rect";
import { RectGroup } from "./geometry/rect_group";
import { GameReference } from "./base_game";
import { BaseGameState } from "./base_state";
import { IS_DEBUG, IS_PRODUCTION } from "./environment";

const MAX_DEBUGGING_GRAPHICS_COUNT = 500;

export class Debug {
  public static stageReference: Entity;

  public static DebugMode = false;

  public static DebugGraphicStack: Graphics[] = [];

  public static Clear(): void {
    for (const debug of Debug.DebugGraphicStack) {
      debug.parent.removeChild(debug);
      debug.destroy();
    }

    Debug.DebugGraphicStack = [];
  }

  /** 
   * Draw a point on the canvas.
   * 
   * We expect this function to be called every tick in an update() function.
   * Debug graphics drawn in the previous tick are removed in the game loop. 
   * If that's not what you want, pass persistent = true.
   */
  public static DrawPoint(point: IVector2, color = 0xff0000, persistent = false): Graphics {
    if (IS_PRODUCTION) {
      console.error("SHOULD NOT HAPPEN")
    }

    const graphics = new Graphics();

    new Line({
      x1: point.x - 40,
      x2: point.x + 40,

      y1: point.y - 40,
      y2: point.y + 40,
    }).drawOnto(graphics, color);

    new Line({
      x1: point.x + 40,
      x2: point.x - 40,

      y1: point.y - 40,
      y2: point.y + 40,
    }).drawOnto(graphics, color);

    GameReference.stage.sprite.addChild(graphics);

    if (!persistent) {
      this.DebugGraphicStack.push(graphics);

      if (this.DebugGraphicStack.length > MAX_DEBUGGING_GRAPHICS_COUNT) {
        const toBeRemoved = this.DebugGraphicStack.shift()!;

        toBeRemoved.parent.removeChild(toBeRemoved);
        toBeRemoved.destroy();
      }
    }

    return graphics;
  }

  /** 
   * Draw a line from start to end on the canvas, for debugging.
   * 
   * We expect this function to be called every tick in an update() function.
   * Debug graphics drawn in the previous tick are removed in the game loop.
   * 
   * If that's not what you want, pass persistent = true.
   */
  public static DrawLineV2(start: Vector2, end: Vector2, color = 0xff0000, persistent = false): Graphics {
    if (IS_PRODUCTION) {
      console.error("SHOULD NOT HAPPEN")
    }

    return Debug.DrawLine(new Line({ start, end }), color, persistent);
  }

  /** 
   * Draw a line on the canvas, for debugging.
   * 
   * We expect this function to be called every tick in an update() function.
   * Debug graphics drawn in the previous tick are removed in the game loop.
   * 
   * If that's not what you want, pass persistent = true.
   */
  public static DrawLine(line: Line, color = 0xff0000, persistent = false, target: "stage" | "fixed" = "fixed"): Graphics {
    if (IS_PRODUCTION) {
      console.error("SHOULD NOT HAPPEN")
    }

    const graphics = new Graphics();

    line.drawOnto(graphics, color);

    if (target === "fixed") {
      GameReference.fixedCameraStage.sprite.addChild(graphics);
    } else {
      GameReference.stage.sprite.addChild(graphics);
    }

    if (!persistent) {
      this.DebugGraphicStack.push(graphics);

      if (this.DebugGraphicStack.length > MAX_DEBUGGING_GRAPHICS_COUNT) {
        const toBeRemoved = this.DebugGraphicStack.shift()!;

        toBeRemoved.parent.removeChild(toBeRemoved);
        toBeRemoved.destroy();
      }
    }

    return graphics;
  }

  /** 
   * Draw a rectangle from start to end on the canvas, for debugging.
   * 
   * We expect this function to be called every tick in an update() function.
   * Debug graphics drawn in the previous tick are removed in the game loop.
   * 
   * If that's not what you want, pass persistent = true.
   */
  public static DrawRect(rect: Rect, color = 0xff0000, persistent = false, target: "stage" | "fixed" = "fixed"): Graphics[] {
    if (IS_PRODUCTION) {
      console.error("SHOULD NOT HAPPEN")
    }

    const lines: Graphics[] = [];

    for (const line of rect.getLinesFromRect()) {
      lines.push(Debug.DrawLine(line, color, persistent, target));
    }

    return lines;
  }

  /** 
   * Draw the bounds of a game object on the canvas, for debugging.
   * 
   * We expect this function to be called every tick in an update() function.
   * Debug graphics drawn in the previous tick are removed in the game loop.
   * 
   * If that's not what you want, pass persistent = true.
   */
  public static DrawBounds(
    entity: Entity | Sprite | Graphics | RectGroup | Container | Rect, 
    color = 0xff0000, 
    persistent = false,
    target: "stage" | "fixed" = "stage"
  ): Graphics[] {
    if (IS_PRODUCTION) {
      console.error("SHOULD NOT HAPPEN")
    }

    if (entity instanceof Entity) {
      entity = entity.collisionBounds()
        .add(entity.positionAbsolute())
        ;
    } 
    
    if (entity instanceof RectGroup) {
      const results: Graphics[] = [];

      for (const rect of entity.getRects()) {
        const lines = Debug.DrawRect(rect, color, persistent, target);

        for (const line of lines) {
          results.push(line);
        }
      }

      return results;
    } else {
      return Debug.DrawRect(new Rect({
        x     : entity.x,
        y     : entity.y,
        width : entity.width,
        height: entity.height,
      }), color, persistent, target);
    }
  }

  private static profiles: { [key: string]: number[] } = {};

  /**
   * Performance test a block of code.
   */
  public static Profile(name: string, cb: () => void): void {
    Debug.profiles[name] = Debug.profiles[name] || [];

    const start = window.performance.now();

    cb(); 

    const end = window.performance.now();

    Debug.profiles[name].push(end - start);

    if (Debug.profiles[name].length === 60) {
      const average = Debug.profiles[name].reduce((a, b) => a + b) / 60;
      const rounded = Math.floor(average * 100) / 100;

      Debug.profiles[name] = [];

      console.log(`${ name }: ${ rounded }ms`);
    }
  }

  static ResetDrawCount() {
    (Sprite as any).drawCount = 0;
    (Container as any).drawCount = 0;
    drawn = [];
  }

  static GetDrawnObjects() {
    return drawn;
  }

  static GetDrawCount() {
    return (
      (Sprite as any).drawCount + 
      (Container as any).drawCount
    );
  }

  public static DebugStuff(state: BaseGameState) {
    if (state.keys.justDown.Z) {
      Debug.DebugMode = true;

      state.stage.x = 0;
      state.stage.y = 0;

      if (state.stage.scale.x === 0.2) {
        state.stage.scale = new Vector2({ x: 1, y: 1 });
      } else {
        state.stage.scale = new Vector2({ x: 0.2, y: 0.2 });
      }
    }

    if (Debug.DebugMode) {
      if (state.keys.down.W) {
        state.stage.y += 20;
      }

      if (state.keys.down.S) {
        state.stage.y -= 20;
      }

      if (state.keys.down.D) {
        state.stage.x -= 20;
      }

      if (state.keys.down.A) {
        state.stage.x += 20;
      }
    }
  }

  public static DebugShowRect(state: BaseGameState, rect: Rect) {
    state.stage.scale = new Vector2({ x: 0.2, y: 0.2 });
    state.stage.x = -rect.x * 0.2;
    state.stage.y = -rect.y * 0.2;
  }
}

let drawn: any[] = [];

if (IS_DEBUG) {
  (Sprite as any).drawCount = 0;

  (Sprite.prototype as any).__render = (Sprite.prototype as any)._render;
  (Sprite.prototype as any)._render = function (renderer: any) {
    (Sprite as any).drawCount++;
    this.__render(renderer);
    drawn.push(this);
  };


  (Sprite.prototype as any).__renderCanvas = (Sprite.prototype as any)._renderCanvas;
  (Sprite.prototype as any)._renderCanvas = function (renderer: any) {
    (Sprite as any).drawCount++;
    this.__renderCanvas(renderer);
    drawn.push(this);
  };


  // PIXI.Container

  (Container as any).drawCount = 0;

  (Container.prototype as any).__render = (Container.prototype as any)._render;
  (Container.prototype as any)._render = function (renderer: any) {
    (Container as any).drawCount++;
    this.__render(renderer);
    drawn.push(this);
  };


  (Container.prototype as any).__renderCanvas = (Container.prototype as any)._renderCanvas;
  (Container.prototype as any)._renderCanvas = function (renderer: any) {
    (Container as any).drawCount++;
    this.__renderCanvas(renderer);
    drawn.push(this);
  };
}