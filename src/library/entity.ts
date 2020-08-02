import { Vector2, IVector2 } from "./geometry/vector2";
import { Rect } from "./geometry/rect";
import { Sprite, Texture, MaskData, Container } from "pixi.js";
import { getUniqueID } from "./util";
import { RectGroup } from "./geometry/rect_group";
import { BaseGameState } from "./base_state";
import { GameReference, FixedStageName, StageName, ParallaxStageName } from "./base_game";
import { CoroutineId, GameCoroutine } from "./coroutine_manager";
import { IGameState, Mode } from "Library";
import { HitInfo } from "./collision_handler";
import { serialized } from "./serializer";

export enum EntityType {
  NormalEntity,

  /** 
   * The collision information for this entity will be calculated by the main
   * game loop.
   */
  MovingEntity,
}

export class AugmentedSprite extends Sprite {
  entity!: Entity;
}


// export class ModeEntity extends Entity<GameState> {
//   shouldUpdate(state: GameState) {
//     return this.activeModes.includes(state.mode);
//   }
// }

// TODO: probably make less of these methods abstract?
export class Entity {
  /**
   * This is the name that is displayed in the hierarchy.
   */
  public name: string;

  public activeModes: Mode[] = ["Normal"];

  public id = getUniqueID();

  public velocity = Vector2.Zero;

  /**
   * The PIXI Sprite that this Entity wraps.
   */
  public sprite: AugmentedSprite;

  public hitInfo: HitInfo = { hit: false, collisions: [], interactions: [] };

  protected _collidable: boolean;
  protected _interactable: boolean;

  constructor(props: {
    name: string;
    collidable?: boolean;
    texture?: Texture;
    interactable?: boolean;
  }) {
    this.sprite = new AugmentedSprite(props.texture);
    this.name = props.name;
    this.sprite.entity = this;

    this._collidable = props.collidable ?? false;
    this._interactable = props.interactable ?? false;

    if (props.interactable && props.collidable) {
      throw new Error("Cant be both interactable and collideable");
    }

    this.startUpdating();

    this.sprite.sortableChildren = true;
    this.sprite.anchor.set(0);
  }

  addChild(child: Entity, x: number | null = null, y: number | null = null) {
    this.sprite.addChild(child.sprite);

    if (x !== null) child.x = x;
    if (y !== null) child.y = y;
  }

  removeChild(child: Entity) {
    this.sprite.removeChild(child.sprite);
  }

  startCoroutine(name: string, coroutine: GameCoroutine): CoroutineId {
    return GameReference.coroutineManager.startCoroutine(name, coroutine, this);
  }

  stopCoroutine(id: CoroutineId): void {
    GameReference.coroutineManager.stopCoroutine(id);
  }

  startUpdating() {
    GameReference.state.entities.put(this);
  }

  stopUpdating() {
    GameReference.state.entities.remove(this);
  }

  shouldUpdate(state: IGameState): boolean {
    return this.activeModes.includes(state.mode);
  }

  update(state: IGameState): void { }

  firstUpdate(state: IGameState): void { }

  setCollideable(isCollideable: boolean) {
    this._collidable = isCollideable;
  }

  setTexture(newTexture: Texture) {
    this.sprite.texture = newTexture;
  }

  /** 
   * Used for collision detection. (x, y) is relative to the sprite, btw, not
   * the map or anything else.
   */
  public collisionBounds(): Rect | RectGroup {
    return new Rect({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height
    })
  }

  /** 
   * Returns the position of this Entity relative to the stage (rather than its
   * parent, like position would).
   */
  public positionAbsolute(): Vector2 {
    if (this.parent && (
      this.parent.name === FixedStageName ||
      this.parent.name === StageName ||
      this.parent.name === ParallaxStageName
    )) {
      return this.position;
    }

    return this.position.add(this.parent?.positionAbsolute() ?? new Vector2());
  }

  public get center(): Vector2 {
    return new Vector2(this.position).add({
      x: this.width / 2,
      y: this.height / 2
    });
  }

  children(): Entity[] {
    const children = this.sprite.children;
    const result: Entity[] = [];

    for (const child of children) {
      if (child instanceof AugmentedSprite) {
        result.push(child.entity);
      }
    }

    return result;
  }

  destroy(state: BaseGameState) {
    state.toBeDestroyed.push(this);
  }

  hash(): string {
    return `[Entity ${this.id}]`;
  }

  isCollideable(): boolean {
    return this._collidable;
  }

  isInteractable(): boolean {
    return this._interactable;
  }

  dimensions(): Vector2 {
    const bounds = this.collisionBounds();

    if (bounds instanceof Rect) {
      return new Vector2(bounds.x, bounds.y);
    } else {
      throw new Error("oh no grant doesnt handle this case!!!");
    }
  }

  // Sprite wrapper stuff

  public get parent(): Entity | null {
    const parent = this.sprite.parent;

    if (parent instanceof AugmentedSprite) {
      const entityParent = parent.entity;

      if (entityParent) {
        return entityParent;
      }
    }

    return null;
  }

  private queuedUpdates: ((state: IGameState) => void)[] = [];
  private firstUpdateCalled = false;

  baseUpdate(state: IGameState): void {
    if (this.shouldUpdate(state)) {
      for (const cb of this.queuedUpdates) {
        cb(state);
      }

      if (!this.firstUpdateCalled) {
        this.firstUpdateCalled = true;
        this.firstUpdate(state);
      }
      this.update(state);
    }

    this.queuedUpdates = [];
  }

  addOnClick(listener: (state: IGameState) => void) {
    this.sprite.interactive = true;

    this.sprite.on('click', () => {
      this.queuedUpdates.push(listener);
    });
  }

  addOnMouseOver(listener: (state: IGameState) => void) {
    this.sprite.interactive = true;

    this.sprite.on('mouseover', () => {
      this.queuedUpdates.push(listener);
    });
  }

  addOnMouseOut(listener: (state: IGameState) => void) {
    this.sprite.interactive = true;

    this.sprite.on('mouseout', () => {
      this.queuedUpdates.push(listener);
    });
  }

  public get x(): number { return this.sprite.x; }
  public set x(value: number) { this.sprite.x = value; }

  public get y(): number { return this.sprite.y; }
  public set y(value: number) { this.sprite.y = value; }

  public get width(): number { return this.sprite.width; }
  public set width(value: number) { this.sprite.width = value; }

  public get height(): number { return this.sprite.height; }
  public set height(value: number) { this.sprite.height = value; }

  public get alpha(): number { return this.sprite.alpha; }
  public set alpha(value: number) { this.sprite.alpha = value; }

  public get position(): Vector2 { return new Vector2({ x: this.x, y: this.y }); }
  public set position(value: Vector2) { this.x = value.x; this.y = value.y; }

  public get zIndex(): number { return this.sprite.zIndex; }
  public set zIndex(value: number) { this.sprite.zIndex = value; this.sprite.parent && this.sprite.parent.sortChildren(); }

  public get visible(): boolean { return this.sprite.visible; }
  public set visible(value: boolean) { this.sprite.visible = value; }

  public set texture(value: Texture) { this.sprite.texture = value; }

  public set mask(value: Container | MaskData) { this.sprite.mask = value; }
  public get mask(): Container | MaskData { return this.sprite.mask; }

  public get scale(): Vector2 { return new Vector2({ x: this.sprite.scale.x, y: this.sprite.scale.y }); }
  public set scale(value: Vector2) {
    this.sprite.scale.x = value.x;
    this.sprite.scale.y = value.y;
  }

  public distance(other: IVector2) {
    return this.position.distance(other);
  }
}
