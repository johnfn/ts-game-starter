import { Vector2 } from "./vector2"
import { Graphics } from "pixi.js";
import { epsGreaterThan, epsLessThan } from "../epsilon_math";

export class Line {
  private _x1: number;
  private _x2: number;
  private _y1: number;
  private _y2: number;

  public get x1(): number { return this._x1; }
  public get x2(): number { return this._x2; }
  public get y1(): number { return this._y1; }
  public get y2(): number { return this._y2; }

  public get start(): Vector2 { return new Vector2({ x: this.x1, y: this.y1 }); }
  public get end()  : Vector2 { return new Vector2({ x: this.x2, y: this.y2 }); }

  public get angleInDegrees(): number {
    const cx = this._x1;
    const cy = this._y1;

    const ex = this._x2;
    const ey = this._y2;

    const dy = ey - cy;
    const dx = ex - cx;

    let theta = Math.atan2(dy, dx);

    theta *= 180 / Math.PI;

    if (theta < 0) {
      theta = 360 + theta;
    }

    return theta;
  }

  public serialized = "";

  constructor(props: { x1: number, x2: number, y1: number, y2: number } |
                     { start: Vector2, end: Vector2 }) {
    let x1, x2, y1, y2;

    if ('x1' in props) {
      x1 = props.x1;
      x2 = props.x2;
      y1 = props.y1;
      y2 = props.y2;
    } else {
      x1 = props.start.x;
      x2 = props.end.x;
      y1 = props.start.y;
      y2 = props.end.y;
    }

    this._x1 = x1;
    this._y1 = y1;
    this._x2 = x2;
    this._y2 = y2;

    this.serialized = `${ this.x1 }|${ this.x2 }|${ this.y1 }|${ this.y2 }`;
  }

  public get length(): number {
    return Math.sqrt(
      (this.x2 - this.x1) * (this.x2 - this.x1) +
      (this.y2 - this.y1) * (this.y2 - this.y1)
    );
  }

  public get isDegenerate(): boolean {
    return this.length === 0;
  }

  public rotateAbout(origin: Vector2, angle: number): Line {
    const start = this.start;
    const end = this.end;

    return new Line({
      start: start.rotate(origin, angle),
      end: end.rotate(origin, angle),
    });
  }

  public scaleAbout(about: Vector2, amount: Vector2): Line {
    return new Line({
      start: this.start.scale(about, amount),
      end: this.end.scale(about, amount),
    });
  }

  sharesAVertexWith(other: Line): Vector2 | null {
    if (this.start.equals(other.start)) { return this.start; }
    if (this.start.equals(other.end))   { return this.start; }

    if (this.end.equals(other.start)) { return this.end; }
    if (this.end.equals(other.end))   { return this.end; }

    return null;
  }

  static DeserializeLine(s: string): Line {
    const [ x1, x2, y1, y2 ] = s.split("|").map(x => Number(x));

    return new Line({ x1, x2, y1, y2 });
  }

  isXAligned(): boolean {
    return this.x1 === this.x2;
  }

  isYAligned(): boolean {
    return this.y1 === this.y2;
  }

  // Must be horizontally/vertically oriented lines
  // Does not consider intersection, only overlap
  getOverlap(other: Line): Line | undefined {
    const orientedByX = (
      this.x1 === this.x2 &&
      this.x1 === other.x1 &&
      this.x1 === other.x2
    );

    const orientedByY = (
      this.y1 === this.y2 &&
      this.y1 === other.y1 &&
      this.y1 === other.y2
    );

    if (!orientedByX && !orientedByY) { return undefined; }

    const summedLength  = this.length + other.length;
    const overallLength = new Line({
      x1: Math.min(this.x1, other.x1),
      y1: Math.min(this.y1, other.y1),
      x2: Math.max(this.x2, other.x2),
      y2: Math.max(this.y2, other.y2),
    }).length;

    if (overallLength >= summedLength) {
      // These lines do not overlap.

      return undefined;
    }

    if (orientedByX) {
      return new Line({
        x1: this.x1,
        x2: this.x2,
        y1: Math.max(this.y1, other.y1),
        y2: Math.min(this.y2, other.y2),
      });
    } else /* if (orientedByY) */ {
      return new Line({
        y1: this.y1,
        y2: this.y2,
        x1: Math.max(this.x1, other.x1),
        x2: Math.min(this.x2, other.x2),
      });
    }
  }

  // A----B----C----D
  // AD - BC returns AB and CD.
  getNonOverlappingSections(other: Line): Line[] | undefined {
    const orientedByX = (
      this.x1 === this.x2 &&
      this.x1 === other.x1 &&
      this.x1 === other.x2
    );

    const orientedByY = (
      this.y1 === this.y2 &&
      this.y1 === other.y1 &&
      this.y1 === other.y2
    );

    if (!orientedByX && !orientedByY) { return undefined; }

    const summedLength  = new Line(this).length + new Line(other).length;
    const overallLength = new Line({
      x1: Math.min(this.x1, other.x1),
      y1: Math.min(this.y1, other.y1),
      x2: Math.max(this.x1, other.x1),
      y2: Math.max(this.y1, other.y1),
    }).length;

    if (overallLength >= summedLength) {
      // These lines do not overlap.

      return undefined;
    }

    if (orientedByX) {
      return [
        new Line({ x1: this.x1, x2: this.x2, y1: Math.min(this.y1, other.y1), y2: Math.max(this.y1, other.y1), }),
        new Line({ x1: this.x1, x2: this.x2, y1: Math.min(this.y2, other.y2), y2: Math.max(this.y2, other.y2), }),
      ].filter(l => !l.isDegenerate);
    } else /* if (orientedByY) */ {
      return [
        new Line({ y1: this.y1, y2: this.y2, x1: Math.min(this.x1, other.x1), x2: Math.max(this.x1, other.x1), }),
        new Line({ y1: this.y1, y2: this.y2, x1: Math.min(this.x2, other.x2), x2: Math.max(this.x2, other.x2), }),
      ].filter(l => !l.isDegenerate);
    }
  }

  clone(): Line {
    return new Line({ x1: this.x1, x2: this.x2, y1: this.y1, y2: this.y2 });
  }

  translate(p: Vector2): Line {
    return new Line({
      x1: this.x1 + p.x,
      x2: this.x2 + p.x,

      y1: this.y1 + p.y,
      y2: this.y2 + p.y,
    });
  }

  transform(trans: Vector2, scale: number): Line {
    return new Line({
      start: this.start.transform(trans, scale),
      end: this.end.transform(trans, scale),
    });
  }

  toJSON(): any {
    return {
      x1     : this.x1,
      x2     : this.x2,
      y1     : this.y1,
      y2     : this.y2,
      reviver: "Line",
    };
  }

  toString(): string {
    return `Line: [(${ this.x1 },${ this.y1 }) -> (${ this.x2 },${ this.y2 })]`;
  }

  equals(other: Line | null) {
    if (other === null) { return false; }

    return (
      this.x1 === other.x1 &&
      this.x2 === other.x2 &&
      this.y1 === other.y1 &&
      this.y2 === other.y2
    ) || (
      this.x1 === other.x2 &&
      this.x2 === other.x1 &&
      this.y1 === other.y2 &&
      this.y2 === other.y1
    );
  }

  withNewEnd(newEnd: Vector2): Line {
    return new Line({
      x1: this.x1,
      y1: this.y1,
      x2: newEnd.x,
      y2: newEnd.y,
    });
  }

  withNewStart(newStart: Vector2): Line {
    return new Line({
      x1: newStart.x,
      y1: newStart.y,
      x2: this.x2,
      y2: this.y2,
    });
  }

  static Deserialize(obj: any): Line {
    if (
      !obj.hasOwnProperty("x1") ||
      !obj.hasOwnProperty("y1") ||
      !obj.hasOwnProperty("x2") ||
      !obj.hasOwnProperty("y2")) {

      console.error("Failed deserializing Rect");
    }

    return new Line({
      x1: obj.x1,
      y1: obj.y1,
      x2: obj.x2,
      y2: obj.y2,
    });
  }

  static Serialize(obj: Line): string {
    return JSON.stringify({
      x1: obj.x1,
      y1: obj.y1,
      x2: obj.x2,
      y2: obj.y2,
    });
  }

  drawOnto(graphics: Graphics, color = 0xff0000) {
    graphics.lineStyle(3, color, 1);

    graphics.moveTo(this.x1, this.y1);
    graphics.lineTo(this.x2, this.y2);
  }

  /** 
   * Returns the point where these two lines, if extended arbitrarily, would
   * intersect.
   */
  lineIntersection(other: Line): Vector2 {
    const p1 = this.start;
    const p2 = this.end;
    const p3 = other.start;
    const p4 = other.end;

    const s = (
      (p4.x - p3.x) * 
      (p1.y - p3.y) - 
      (p4.y - p3.y) * 
      (p1.x - p3.x)) / (
      (p4.y - p3.y) * 
      (p2.x - p1.x) - 
      (p4.x - p3.x) * 
      (p2.y - p1.y)
    );

    const x = p1.x + s * (p2.x - p1.x);
    const y = p1.y + s * (p2.y - p1.y);

    return new Vector2({ x, y });
  }

  /**
   * Returns the point where these two segments exist, if there is one.
   */
  segmentIntersection(other: Line): Vector2 | null {
    const lineIntersection = this.lineIntersection(other);

    const x = lineIntersection.x;
    const y = lineIntersection.y;

    if (
      (
        // within us

        epsGreaterThan(x, Math.min(this.x1, this.x2)) &&
        epsLessThan   (x, Math.max(this.x1, this.x2)) &&
        epsGreaterThan(y, Math.min(this.y1, this.y2)) &&
        epsLessThan   (y, Math.max(this.y1, this.y2))
      ) && (
        // within other

        epsGreaterThan(x, Math.min(other.x1, other.x2)) &&
        epsLessThan   (x, Math.max(other.x1, other.x2)) &&
        epsGreaterThan(y, Math.min(other.y1, other.y2)) &&
        epsLessThan   (y, Math.max(other.y1, other.y2))
      )
    ) {
      return lineIntersection;
    }

    return null;
  }

  normalize(): Line {
    const mag = Math.sqrt(
      (this.x1 - this.x2) ** 2 +
      (this.y1 - this.y2) ** 2
    );

    return new Line({
      start: this.start,
      end: new Vector2({
        x: this.start.x + (this.end.x - this.start.x) / mag,
        y: this.start.x + (this.end.y - this.start.y) / mag,
      })
    })
  }

  hash(): string {
    return this.toString();
  }

  add(x: Vector2): Line {
    return new Line({ 
      start: this.start.add(x),
      end: this.end.add(x),
    })
  }
}
