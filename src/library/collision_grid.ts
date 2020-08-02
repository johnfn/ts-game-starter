import { Graphics } from "pixi.js";
import { Rect } from "./geometry/rect";
import { Entity } from "./entity";
import { Vector2 } from "./geometry/vector2";
import { DefaultGrid } from "./data_structures/default_grid";
import { RectGroup } from "./geometry/rect_group";
import { Debug } from "./debug";

export type CollisionResultRect = {
  firstRect: Rect;
  secondRect: Rect;
  otherEntity?: Entity;
  thisEntity?: Entity;
  overlap: Rect;
};

type CollisionResultPoint = {
  firstRect: Rect;
  secondRect: Rect;
  firstEntity?: Entity;
  secondEntity?: Entity;
  overlap: Vector2;
};

export class CollisionGrid {
  private _position: Vector2 = Vector2.Zero;
  private _width: number;
  private _height: number;
  private _cellSize: number;
  private _numCellsPerRow: number;
  private _numCellsPerCol: number;
  private _cells: DefaultGrid<Cell>;
  private _renderLines: Graphics | null = null;

  constructor(props: {
    width: number;
    height: number;
    cellSize: number;
  }) {
    const { width, height, cellSize } = props;

    this._width = width;
    this._height = height;
    this._cellSize = cellSize;

    this._numCellsPerRow = Math.ceil(width / cellSize);
    this._numCellsPerCol = Math.ceil(height / cellSize);

    this._cells = new DefaultGrid<Cell>((x, y) => new Cell(
      new Vector2({ x: x * cellSize, y: y * cellSize }),
      cellSize
    ));
  }

  debug() {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        // Draw cell

        Debug.DrawRect(new Rect({
          x: x * this._cellSize,
          y: y * this._cellSize,
          width: this._cellSize,
          height: this._cellSize,
        }), 0xff0000, true, "fixed");

        for (const obj of this._cells.get(x, y).colliders) {
          Debug.DrawRect(obj.rect, 0xff0000, true, "fixed");
        }
      }
    }
  }

  public get topLeft() {
    return this._position;
  }

  public get center() {
    return this._position.add({ x: this._width / 2, y: this._height / 2 })
  }

  /** 
   * Checks if the provided rect would collide with anything on the grid. If an
   * entity is passed in, ignores that entity when checking for collisions.
   * (Does not add the rect to the grid.)
   */
  getRectCollisions = (rect: Rect, skipEntity?: Entity): CollisionResultRect[] => {
    const cells: Cell[] = [];

    const lowX = Math.floor(rect.x / this._cellSize);
    const highX = Math.ceil((rect.x + rect.width) / this._cellSize);

    const lowY = Math.floor(rect.y / this._cellSize);
    const highY = Math.ceil((rect.y + rect.height) / this._cellSize);

    for (let x = lowX; x < highX; x++) {
      for (let y = lowY; y < highY; y++) {
        cells.push(this._cells.get(x, y));
      }
    }

    const collisions: CollisionResultRect[] = [];

    for (const cell of cells) {
      for (const { rect: rectInCell, entity: entityInCell } of cell.colliders) {
        if (entityInCell === skipEntity) {
          continue;
        }

        const overlap = rect.getIntersection(rectInCell);

        if (overlap) {
          collisions.push({
            firstRect: rectInCell,
            otherEntity: entityInCell,

            secondRect: rect,
            thisEntity: skipEntity,

            overlap,
          });
        }
      }
    }

    return collisions;
  };

  getRectGroupCollisions = (group: RectGroup, entity?: Entity): CollisionResultRect[] => {
    let collisions: CollisionResultRect[] = [];

    for (const rect of group.getRects()) {
      collisions = [
        ...collisions,
        ...this.getRectCollisions(rect, entity),
      ];
    }

    return collisions;
  }

  /** 
   * Same as collidesRect but immediately returns true if there's a collision.
   */
  collidesRectFast = (rect: Rect, entity?: Entity): boolean => {
    const corners = rect.getCorners();
    const cells = corners.map(corner => this._cells.get(
      Math.floor(corner.x / this._cellSize),
      Math.floor(corner.y / this._cellSize),
    ));

    const uniqueCells: { [key: string]: Cell } = {};

    for (const cell of cells) {
      uniqueCells[cell.hash()] = cell;
    }

    const values = Object.values(uniqueCells);

    for (const cell of values) {
      for (const { rect: rectInCell, entity: entityInCell } of cell.colliders) {
        if (entityInCell === entity) {
          continue;
        }

        const overlap = rect.intersects(rectInCell);

        if (overlap) {
          return true;
        }
      }
    }

    return false;
  };

  collidesPoint = (point: Vector2, takeFirst = false): CollisionResultPoint[] => {
    const cell = this._cells.get(
      Math.floor(point.x / this._cellSize),
      Math.floor(point.y / this._cellSize),
    );
    const collisions: CollisionResultPoint[] = [];

    for (const { rect, entity: entityInCell } of cell.colliders) {
      const overlap = rect.contains(point);

      if (overlap) {
        collisions.push({
          firstRect: rect,
          firstEntity: entityInCell,

          secondRect: rect,
          secondEntity: undefined,

          overlap: point,
        });

        if (takeFirst) {
          return collisions;
        }
      }
    }

    return collisions;
  };

  /**
   * Get all collisions on the grid.
   */
  getAllCollisions = (): CollisionResultRect[] => {
    const result: CollisionResultRect[] = [];

    for (let cell of this.cells) {
      const cellRects = cell.colliders;

      for (let i = 0; i < cellRects.length; i++) {
        for (let j = i; j < cellRects.length; j++) {
          if (i === j) continue;

          const collider1 = cellRects[i];
          const collider2 = cellRects[j];

          const intersection = collider1.rect.getIntersection(collider2.rect, false);

          if (intersection !== undefined) {
            result.push({
              firstRect: collider1.rect,
              secondRect: collider2.rect,
              otherEntity: collider1.entity,
              thisEntity: collider2.entity,
              overlap: intersection,
            })
          }
        }
      }
    }

    return result;
  }

  public get cells(): Cell[] {
    return this._cells.values();
  }

  clear = () => {
    for (const cell of this._cells.values()) {
      cell.removeAll();
    }
  };

  // Add a rect to the hash grid.
  // Checks each corner, to handle entities that span multiply grid cells.
  add = (rect: Rect, associatedEntity?: Entity) => {
    const startX = Math.floor(rect.x / this._cellSize);
    const stopX = Math.floor(rect.right / this._cellSize);
    const startY = Math.floor(rect.y / this._cellSize);
    const stopY = Math.floor(rect.bottom / this._cellSize);

    for (let x = startX; x <= stopX; x++) {
      for (let y = startY; y <= stopY; y++) {
        this._cells.get(x, y).add(rect, associatedEntity);
      }
    }
  };

  addRectGroup = (group: RectGroup, associatedEntity?: Entity) => {
    for (const rect of group.getRects()) {
      this.add(rect, associatedEntity);
    }
  }
}

type CellItem = {
  rect: Rect;
  entity?: Entity;
};

export class Cell {
  private _bounds: Rect;
  private _rects: CellItem[] = [];

  constructor(topLeft: Vector2, cellSize: number) {
    this._bounds = Rect.FromPoint(topLeft, cellSize);
  }

  public get colliders(): CellItem[] {
    return this._rects;
  }

  add = (rect: Rect, entity?: Entity) => {
    this._rects.push({ rect, entity });
  };

  removeAll = () => {
    this._rects = [];
  };

  hash(): string {
    return this._bounds.toString();
  }
}