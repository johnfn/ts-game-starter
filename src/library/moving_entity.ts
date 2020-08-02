import { Entity, EntityType } from "./entity";
import { Vector2 } from "./geometry/vector2";
import { Texture } from "pixi.js";
import { Rect } from "./geometry/rect";
import { BaseGame } from "./base_game";
import { BaseGameState } from "./base_state";

export class MovingEntity extends Entity {
  entityType  = EntityType.MovingEntity;

  private _velocity   = Vector2.Zero;
  protected _maxSpeed = 50;

  constructor(props: {
    game: BaseGame<{}>;
    texture: Texture;
    collidable: boolean;
  }) {
    super({
      ...props,
      name: "MovingEntity",
    });

    this._collidable = props.collidable;
  }

  public get velocity(): Vector2 {
    return this._velocity;
  }

  public set velocity(dir: Vector2) {
    this._velocity = dir;
  }

  public get maxSpeed(): number {
    return this._maxSpeed;
  }

  public update = (state: BaseGameState) => {

  }

  // Currently just stops moving.
  collide = (other: Entity, intersection: Rect) => {
    // if (!this._collidable) return;

    // this.velocity = Vector2.Zero;
  };

  // It's just shy
  interact = (other: Entity) => {
    return;
  };
}