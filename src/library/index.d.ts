declare module "Library" {
  export interface ModeList {
    Normal: never;
  }

  export type Mode = keyof ModeList;

  type HashSet<T> = import("./data_structures/hash").HashSet<T>;
  type Entity = import("./entity").Entity;
  type KeyboardState = import("./keyboard").KeyboardState;
  type CollisionGrid = import("./collision_grid").CollisionGrid;
  type Camera = import("./camera").Camera;

  export interface IGameState {
    camera: Camera;
    keys: KeyboardState;
    lastCollisionGrid: CollisionGrid;
    entities: HashSet<Entity>;
    spriteToEntity: { [key: number]: Entity };
    renderer: Renderer;
    tick: number;
    toBeDestroyed: Entity[];
    stage: Entity;
    mode: Mode;
  }
}