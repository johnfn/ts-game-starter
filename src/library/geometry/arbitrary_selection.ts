import { Util } from '../util';
import { Line } from './line';
import { Rect } from './rect';
import { Vector2 } from './vector2';

const MAX_SIZE = 500;

export class ArbitrarySelection {
  cover: Rect[] = [];
  outlinesDirty = true;
  oldOutlines: Line[][] = [];

  constructor(cover: Rect[] = []) {
    this.cover = cover;
  }

  public get x(): number {
    if (this.cover.length === 0) { return 0; }

    return Util.MinBy(this.cover, r => r.x)!.x;
  }

  public get y(): number {
    if (this.cover.length === 0) { return 0; }

    return Util.MinBy(this.cover, r => r.y)!.y;
  }

  public get w(): number {
    if (this.cover.length === 0) { return 0; }

    return Util.MaxBy(this.cover, r => r.right)!.right -
           Util.MinBy(this.cover, r => r.x)!.x;
  }

  public get h(): number {
    if (this.cover.length === 0) { return 0; }

    return Util.MaxBy(this.cover, r => r.bottom)!.bottom -
           Util.MinBy(this.cover, r => r.y)!.y;
  }

  public get pos(): Vector2 {
    return new Vector2({ x: this.x, y: this.y });
  }

  public get bounds(): Rect {
    return new Rect({
      x: this.x,
      y: this.y,
      width: this.w,
      height: this.h,
    });
  }

  public get isEmpty(): boolean {
    return this.cover.length === 0;
  }

  reset(): void {
    this.cover = [];
    this.oldOutlines = [];
  }

  addRect(rectToAdd: Rect): void {
    const subsumingRects = this.cover.filter(r => r.completelyContains(rectToAdd));
    const intersectingRects = this.cover.filter(r => r.intersects(rectToAdd, { edgesOnlyIsAnIntersection: false }));

    if (subsumingRects.length > 0) {
      return;
    }

    for (const rect of intersectingRects) {
      this.subtractRect(rect.getIntersection(rectToAdd)!);
    }

    this.cover.push(rectToAdd);
    this.outlinesDirty = true;
  }

  subtractRect(rectToSubtract: Rect): void {
    const intersectingRects = this.cover.filter(r => r.intersects(rectToSubtract, { edgesOnlyIsAnIntersection: false }));

    for (const rect of intersectingRects) {
      // rectToSubtract completely contains rect

      if (rectToSubtract.completelyContains(rect)) {
        continue;
      }

      // rectToSubtract partially contains rect

      const subrectToRemove = rectToSubtract.getIntersection(rect)!;

      // rect completely contains subtractedRect

      // -------------------------
      // |          A            |
      // |                       |
      // |-----------------------|
      // |  B  |   hole    |  C  |
      // |-----------------------|
      // |                       |
      // |          D            |
      // -------------------------

      const newRects = [
        { x: rect.x                               , y: rect.y                               , width: rect.width                                                   , height: subrectToRemove.y - rect.y }, // A
        { x: rect.x                               , y: subrectToRemove.y                    , width: subrectToRemove.x - rect.x                               , height: subrectToRemove.height }, // B
        { x: subrectToRemove.x + subrectToRemove.width, y: subrectToRemove.y                    , width: rect.x + rect.width - (subrectToRemove.width + subrectToRemove.x), height: subrectToRemove.height }, // C
        { x: rect.x                               , y: subrectToRemove.y + subrectToRemove.height, width: rect.width                                                   , height: rect.y + rect.height - (subrectToRemove.y + subrectToRemove.height) }, // D
      ].filter(r => r.width > 0 && r.height > 0)
       .map(r => new Rect(r));

      this.cover = this.cover.concat(newRects);
    }

    for (const rect of intersectingRects) {
      this.cover.splice(this.cover.indexOf(rect), 1);
    }

    this.outlinesDirty = true;

    if (this.isEmpty) {
      this.reset();
    }
  }

  // O(n^2) scc algorithm until someone convinces me I need a faster one
  getConnectedComponents(): Rect[][] {
    const components: Rect[][] = [];
    const seenRects: { [key: string]: boolean } = {}

    for (const rect of this.cover) {
      if (seenRects[rect.serialize()]) { continue; }

      const component = this.getConnectedComponentFrom(rect);

      components.push(component);

      for (const seen of component) {
        seenRects[seen.serialize()] = true;
      }
    }

    return components;
  }

  private getConnectedComponentFrom(start: Rect): Rect[] {
    const component: { [key: string]: boolean } = { };
    let edge = [start];

    while (edge.length > 0) {
      let newEdge: Rect[] = [];

      for (const rect of edge) {
        if (component[rect.serialize()]) { continue; }

        const intersectingRects = this.cover.filter(r => r.intersects(rect, { edgesOnlyIsAnIntersection: true }));

        component[rect.serialize()] = true;
        newEdge = newEdge.concat(intersectingRects);
      }

      edge = newEdge;
    }

    return Object.keys(component).map(r => Rect.DeserializeRect(r));
  }

  getOutlines(): Line[][] {
    if (!this.outlinesDirty) {
      return this.oldOutlines;
    }

    let result: Line[][] = [];
    const components = this.getConnectedComponents();

    for (const c of components) {
      const outline = this.getOutlineFor(c);
      const outlineComponents = this.getComponentsOfOutline(outline);

      result = result.concat(outlineComponents)
    }

    this.oldOutlines = result;
    this.outlinesDirty = false;

    return result;
  }

  private getOutlineFor(comp: Rect[]): Line[] {
    let allLines: (Line | undefined)[] = [];

    for (const rect of comp) {
      allLines.push.apply(allLines, rect.getLinesFromRect());
    }

    // Alternate solution if this proves too hard:
    // Subdivide all lines on intersection points, then remove all
    // duplicates.

    // Actually that might even be better heh

    // The strategy here is to basically remove all overlapping segments. it's
    // hard because a single line could be overlapping with multiple other
    // lines.

    for (let i = 0; i < allLines.length; i++) {
      const line1 = allLines[i];
      if (!line1) { continue; }

      for (let j = 0; j < allLines.length; j++) {
        const line2 = allLines[j];
        if (!line2) { continue; }
        if (line1 === line2) { continue; }

        const intersection = line1.getOverlap(line2);

        if (intersection) {
          allLines[i] = undefined;
          allLines[j] = undefined;

          const newLines = line1.getNonOverlappingSections(line2);

          allLines = allLines.concat(newLines);

          break;
        }
      }
    }

    return allLines.filter(l => l !== undefined) as Line[];
  }

  private getComponentsOfOutline(outline: Line[]): Line[][] {
    // Store lookup table by start and end vertex
    let lookupTable: { [key: number]: Line[] } = [];

    for (const line of outline) {
      const idx1 = line.x1 * MAX_SIZE + line.y1;
      const idx2 = line.x2 * MAX_SIZE + line.y2;

      if (!lookupTable[idx1]) { lookupTable[idx1] = []; }
      if (!lookupTable[idx2]) { lookupTable[idx2] = []; }

      lookupTable[idx1].push(line);
      lookupTable[idx2].push(line);
    }

    let result: Line[][] = [];
    let visited: { [key: string]: boolean } = {};

    for (const line of outline) {
      if (visited[line.serialized]) { continue; }
      visited[line.serialized] = true;

      const sequence = [line];

      while (true) {
        const current = sequence[sequence.length - 1];
        const candidates = lookupTable[current.x1 * MAX_SIZE + current.y1].concat(lookupTable[current.x2 * MAX_SIZE + current.y2]);
        const next = candidates.filter(l => l !== current && !visited[l.serialized])[0];

        if (!next) { break; }

        visited[next.serialized] = true;
        sequence.push(next);
      }

      result.push(sequence);
    }

    return result;
  }

  addArbitraryShape(pixels: Vector2[], canvasSize: Vector2): void {
    this.outlinesDirty = true;

    const covered: boolean[] = new Array(MAX_SIZE * MAX_SIZE);
    const rects: Rect[] = [];

    const ll = pixels.length;

    for (let i = 0; i < ll; i++) {
      const p = pixels[i];

      covered[p.x * MAX_SIZE + p.y] = false;
    }

    for (let x = 0; x < canvasSize.x; x++) {
      for (let y = 0; y < canvasSize.y; y++) {
        if (covered[x * MAX_SIZE + y] !== false) { continue; }

        let squareSize = 2;

        outer:
        for (; squareSize < MAX_SIZE; squareSize++) {
          const endSquareX = x + squareSize;
          const endSquareY = y + squareSize;

          for (let bottomLineX = x; bottomLineX < endSquareX; bottomLineX++) {
            if (covered[bottomLineX * MAX_SIZE + (y + squareSize - 1)] === undefined ||
                covered[bottomLineX * MAX_SIZE + (y + squareSize - 1)] === true)  {
              squareSize--;
              break outer;
            }
          }

          for (let bottomLineY = y; bottomLineY < endSquareY; bottomLineY++) {
            if (covered[(x + squareSize - 1) * MAX_SIZE + bottomLineY] === undefined ||
                covered[(x + squareSize - 1) * MAX_SIZE + bottomLineY] === true) {

              squareSize--;
              break outer;
            }
          }
        }

        for (let sx = x; sx < x + squareSize; sx++) {
          for (let sy = y; sy < y + squareSize; sy++) {
            covered[sx * MAX_SIZE + sy] = true;
          }
        }

        rects.push(new Rect({
          x: x,
          y: y,
          width: squareSize,
          height: squareSize,
        }));
      }
    }

    for (const r of rects) {
      this.addRect(r);
    }
  }

  clone(): ArbitrarySelection {
    const result = new ArbitrarySelection(this.cover.slice(0));

    result.outlinesDirty = this.outlinesDirty;
    result.oldOutlines = this.oldOutlines;

    return result;
  }

  translate(p: Vector2): void {
    this.cover = this.cover.map(x => x.translate(p));
    this.oldOutlines = this.oldOutlines.map(l => l.map(ll => ll.translate(p)));
  }

  contains(p: Vector2): boolean {
    if (this.cover.length === 0) { return true; }

    for (const r of this.cover) {
      if (r.contains(p)) { return true; }
    }

    return false;
  }
}