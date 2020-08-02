import { EPSILON } from "../epsilon_math";
import { Util } from "../util";

export interface IVector2 {
  x: number;
  y: number;
}

export class Vector2 {
  private _x: number;
  private _y: number;

  public get x(): number { return this._x; }
  public get y(): number { return this._y; }

  constructor();
  constructor(x: number, y: number);
  constructor(props: { x: number, y: number });
  constructor(propsOrX: { x: number, y: number } | number = { x: 0, y: 0 }, y?: number) {
    if (typeof propsOrX === "number") {
      this._x = propsOrX;
      this._y = y!;
    } else {
      this._x = propsOrX.x;
      this._y = propsOrX.y;
    }
  }

  public get half(): Vector2 {
    return new Vector2({ x: this.x / 2, y: this.y / 2 });
  }

  public static Zero: Vector2 = new Vector2(0, 0);
  public static One: Vector2 = new Vector2(1, 1);

  static IsVector2(x: any): x is Vector2 {
    return x instanceof Vector2;
  }

  static Random(highX: number, highY: number, lowX = 0, lowY = 0) {
    return new Vector2({
      x: Util.RandRange(lowX, highX),
      y: Util.RandRange(lowY, highY),
    });
  }

  hash(): string {
    return this.toString();
  }

  toString(): string {
    return `[${this.x}, ${this.y}]`;
  }

  invert(): Vector2 {
    return new Vector2({
      x: -this.x,
      y: -this.y,
    });
  }

  round(): Vector2 {
    return new Vector2({
      x: Math.round(this.x),
      y: Math.round(this.y),
    });
  }

  floor(): Vector2 {
    return new Vector2({
      x: Math.floor(this.x),
      y: Math.floor(this.y),
    });
  }

  taxicabDistance(p: Vector2): number {
    return Math.abs(p.x - this.x) + Math.abs(p.y - this.y);
  }

  diagonalDistance(p: IVector2): number {
    return Math.max(Math.abs(p.x - this.x), Math.abs(p.y - this.y));
  }

  distance(p: IVector2): number {
    let dx = Math.abs(p.x - this.x);
    let dy = Math.abs(p.y - this.y);

    return Math.sqrt(dx * dx + dy * dy);
  }

  translate(p: { x: number, y: number }): Vector2 {
    return new Vector2({
      x: this.x + p.x,
      y: this.y + p.y,
    });
  }

  subtract(p: { x: number, y: number }): Vector2 {
    return new Vector2({
      x: this.x - p.x,
      y: this.y - p.y,
    });
  }

  add(p: { x: number, y: number }): Vector2 {
    return new Vector2({
      x: this.x + p.x,
      y: this.y + p.y,
    });
  }

  addX(x: number): Vector2 {
    return new Vector2({
      x: this.x + x,
      y: this.y,
    });
  }

  addY(y: number): Vector2 {
    return new Vector2({
      x: this.x,
      y: this.y + y,
    });
  }

  clampY(low: number, high: number): Vector2 {
    let newY = this.y;

    if (newY < low) { newY = low; }
    if (newY > high) { newY = high; }

    return new Vector2({
      x: this.x,
      y: newY,
    });
  }

  scale(about: { x: number; y: number }, amount: { x: number; y: number }): Vector2 {
    return new Vector2({
      x: (this.x - about.x) * amount.x + about.x,
      y: (this.y - about.y) * amount.y + about.y,
    });
  }

  rotate(origin: Vector2, angle: number): Vector2 {
    angle = angle / (180 / Math.PI);

    return new Vector2({
      x: Math.cos(angle) * (this.x - origin.x) - Math.sin(angle) * (this.y - origin.y) + origin.x,
      y: Math.sin(angle) * (this.x - origin.x) + Math.cos(angle) * (this.y - origin.y) + origin.y,
    });
  }

  equals(other: Vector2 | undefined): boolean {
    if (other === undefined) {
      return false;
    }

    return (
      Math.abs(this.x - other.x) < EPSILON &&
      Math.abs(this.y - other.y) < EPSILON
    );
  }

  multiply(other: Vector2 | number): Vector2 {
    if (typeof other === "number") {
      return new Vector2({
        x: this.x * other,
        y: this.y * other,
      });
    } else {
      return new Vector2({
        x: this.x * other.x,
        y: this.y * other.y,
      });
    }
  }

  divide(other: Vector2 | number): Vector2 {
    if (typeof other === "number") {
      return new Vector2({
        x: this.x / other,
        y: this.y / other,
      });
    } else {
      return new Vector2({
        x: this.x / other.x,
        y: this.y / other.y,
      });
    }
  }

  toJSON(): any {
    return {
      __type: "Vector2",
      x: this.x,
      y: this.y,
    }
  }

  transform(trans: Vector2, scale: number): Vector2 {
    return new Vector2({
      x: Math.floor((this.x - trans.x) * scale),
      y: Math.floor((this.y - trans.y) * scale),
    });
  }

  normalize(): Vector2 {
    if (this.x === 0 && this.y === 0) {
      return this;
    }

    const length = Math.sqrt(this.x * this.x + this.y * this.y);

    return new Vector2({
      x: this.x / length,
      y: this.y / length
    });
  }

  withX(newX: number): Vector2 {
    return new Vector2({
      x: newX,
      y: this.y,
    });
  }

  withY(newY: number): Vector2 {
    return new Vector2({
      x: this.x,
      y: newY,
    });
  }

  invertX(): Vector2 {
    return new Vector2({
      x: -this.x,
      y: this.y,
    });
  }

  lerp(other: Vector2, t: number): Vector2 {
    if (t > 1 || t < 0) { console.error("Lerp t must be between 0 and 1."); }
    if (t === 0) return this;
    if (t === 1) return other;

    return this.scale({ x: 0, y: 0 }, { x: 1 - t, y: 1 - t }).add(other.scale({ x: 0, y: 0 }, { x: t, y: t }))
  }

  lerp2D(other: Vector2, tx: number, ty: number): Vector2 {
    if (tx > 1 || tx < 0 || ty > 1 || ty < 0) { console.error("Lerp t must be between 0 and 1."); }
    return this.scale({ x: 0, y: 0 }, { x: 1 - tx, y: 1 - ty }).add(other.scale({ x: 0, y: 0 }, { x: tx, y: ty }))
  }

  coserp(other: Vector2, t: number): Vector2 {
    t = 0.5 * (1 + Math.cos(2 * t * Math.PI));

    return this.lerp(other, t);
  }

  static Deserialize(obj: any): Vector2 {
    if (!obj.hasOwnProperty("x") || !obj.hasOwnProperty("y")) {
      console.error("Failed deserializing point");
    }

    return new Vector2({
      x: obj.x,
      y: obj.y,
    });
  }

  static Serialize(obj: Vector2): string {
    return JSON.stringify({ x: obj.x, y: obj.y });
  }
}