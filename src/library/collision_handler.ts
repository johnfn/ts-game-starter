import { Entity } from "./entity";
import { Vector2 } from "./geometry/vector2";
import { CollisionGrid, CollisionResultRect } from "./collision_grid";
import { HashSet } from "./data_structures/hash";
import { Rect } from "./geometry/rect";
import { RectGroup } from "./geometry/rect_group";

export type HitInfo = {
  hit: boolean;
  left?: boolean;
  right?: boolean;
  up?: boolean;
  down?: boolean;
  collisions: CollisionResultRect[];
  interactions: CollisionResultRect[];
};

export class CollisionHandler {
  private _canvasWidth: number;
  private _canvasHeight: number;
  private _tileSize: number;

  constructor(props: {
    canvasWidth: number;
    canvasHeight: number;
    tileWidth: number;
    tileHeight: number;
  }) {
    if (props.tileWidth !== props.tileHeight) {
      throw new Error("Collision handler does not currently support tileWidth != tileHeight");
    }

    this._canvasWidth = props.canvasWidth;
    this._canvasHeight = props.canvasHeight;
    this._tileSize = props.tileWidth;
  }

  buildCollisionGrid = (props: {
    entities: HashSet<Entity>;
    bounds: Rect;
  }): CollisionGrid => {
    const { entities, bounds } = props;

    const grid = new CollisionGrid({
      width: 2 * this._canvasWidth,
      height: 2 * this._canvasHeight,
      cellSize: 4 * this._tileSize,
    });

    const collideableEntities = entities.values().filter(x => x.isCollideable() || x.isInteractable());

    for (const entity of collideableEntities) {
      const collisionRect = entity.collisionBounds().add(entity.positionAbsolute());

      if (collisionRect.intersects(bounds)) {
        const rectOrRectGroup = collisionRect;

        if (rectOrRectGroup instanceof Rect) {
          grid.add(rectOrRectGroup, entity);
        } else {
          grid.addRectGroup(rectOrRectGroup, entity);
        }
      }
    }

    return grid;
  };

  getHitsAt = (grid: CollisionGrid, bounds: Rect | RectGroup, entity: Entity): { hits: CollisionResultRect[]; interactions: CollisionResultRect[] } => {
    const xHits =
      bounds instanceof Rect
        ? grid.getRectCollisions(bounds, entity)
        : grid.getRectGroupCollisions(bounds, entity);

    const hits = xHits.filter(x => !x.otherEntity || (x.otherEntity && !x.otherEntity.isInteractable()));
    const interactions = xHits.filter(x => (x.otherEntity && x.otherEntity.isInteractable()));

    return {
      hits,
      interactions,
    };
  }

  resolveCollisions = (props: {
    entities: HashSet<Entity>;
    grid: CollisionGrid;
  }) => {
    const { entities, grid } = props;

    for (const entity of entities.values()) {
      const hitInfo: HitInfo = {
        hit: false,
        collisions: [],
        interactions: [],
      };

      if (entity.velocity.x === 0 && entity.velocity.y === 0) { continue; }

      let updatedBounds = entity.collisionBounds().add(entity.positionAbsolute());

      const xVelocity = new Vector2({ x: entity.velocity.x, y: 0 });
      const yVelocity = new Vector2({ x: 0, y: entity.velocity.y });

      let delta = Vector2.Zero;

      // resolve x-axis

      delta = delta.add(xVelocity);
      updatedBounds = updatedBounds.add(xVelocity);

      const { hits: xHits, interactions: xInteractions } = this.getHitsAt(grid, updatedBounds, entity);

      if (xHits.length > 0) {
        hitInfo.hit = true;
        hitInfo.right = entity.velocity.x > 0;
        hitInfo.left = entity.velocity.x < 0;
        hitInfo.collisions = [...hitInfo.collisions, ...xHits];

        delta = delta.subtract(xVelocity);
        updatedBounds = updatedBounds.subtract(xVelocity);

        for (let x = 0; x < xVelocity.x; x++) {
          updatedBounds = updatedBounds.add(new Vector2(1, 0));
          delta = delta.add(new Vector2(1, 0));

          const { hits: newXHits } = this.getHitsAt(grid, updatedBounds, entity);

          if (newXHits.length > 0) {
            updatedBounds = updatedBounds.add(new Vector2(-1, 0));
            delta = delta.add(new Vector2(-1, 0));

            break;
          }
        }
      }

      if (xInteractions.length > 0) {
        hitInfo.interactions = [...hitInfo.interactions, ...xInteractions];
      }

      // resolve y-axis

      delta = delta.add(yVelocity);
      updatedBounds = updatedBounds.add(yVelocity);

      const { hits: yHits, interactions: yInteractions } = this.getHitsAt(grid, updatedBounds, entity);

      if (yHits.length > 0) {
        hitInfo.hit = true;
        hitInfo.up = entity.velocity.y < 0;
        hitInfo.down = entity.velocity.y > 0;
        hitInfo.collisions = [...hitInfo.collisions, ...yHits];

        delta = delta.subtract(yVelocity);
        updatedBounds = updatedBounds.subtract(yVelocity);

        for (let y = 0; y < yVelocity.y; y++) {
          updatedBounds = updatedBounds.add(new Vector2(0, 1));
          delta = delta.add(new Vector2(0, 1));

          const { hits: newYHits } = this.getHitsAt(grid, updatedBounds, entity);

          if (newYHits.length > 0) {
            updatedBounds = updatedBounds.add(new Vector2(0, -1));
            delta = delta.add(new Vector2(0, -1));

            break;
          }
        }
      }

      if (yInteractions.length > 0) {
        hitInfo.interactions = [...hitInfo.interactions, ...yInteractions];
      }

      entity.hitInfo = hitInfo;

      hitInfo.hit = hitInfo.collisions.length > 0;

      entity.x = entity.x + delta.x;
      entity.y = entity.y + delta.y;
    }
  };
}