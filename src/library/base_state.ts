import { Renderer } from "pixi.js";
import { KeyboardState } from "./keyboard";
import { Entity } from "./entity";
import { HashSet } from "./data_structures/hash";
import { IGameState } from "Library";
import { Mode } from "Library";
import { CollisionGrid } from "./collision_grid";
import { Camera } from "./camera";

export class BaseGameState implements Partial<IGameState> {
  camera           !: Camera;
  keys: KeyboardState;
  renderer         !: Renderer;
  entities = new HashSet<Entity>();
  toBeDestroyed: Entity[] = [];
  stage            !: Entity;
  spriteToEntity: { [key: number]: Entity } = {};
  mode: Mode = "Normal";
  lastCollisionGrid!: CollisionGrid;

  constructor() {
    this.keys = new KeyboardState();
  }
}
