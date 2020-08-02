import { Rect } from "./rect";
import { Vector2 } from "./vector2";


export class RectGroup {
  private _rects: Rect[];

  constructor(rects: Rect[]) {
    this._rects = rects;
  }

  intersects(other: Rect | RectGroup) {
    if (other instanceof Rect) {
      for (const rect of this._rects) {
        if (rect.intersects(other)) {
          return true;
        }
      }

      return false;
    }

    if (other instanceof RectGroup) {
      for (const r1 of this._rects) {
        for (const r2 of this._rects) {
          if (r1.intersects(r2)) {
            return true;
          }
        }
      }

      return false;
    }
  }

  getRects(): Rect[] {
    return this._rects;
  }

  add(delta: Vector2): RectGroup {
    const newRects = this._rects.map(rect => rect.add(delta));

    return new RectGroup(newRects);
  }

  subtract(delta: Vector2): RectGroup {
    const newRects = this._rects.map(rect => rect.subtract(delta));

    return new RectGroup(newRects);
  }
}