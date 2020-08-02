import { BaseGame } from "./base_game";
import { AllResourcesType } from "./typesafe_loader";
import { Entity, AugmentedSprite } from "./entity";
import { HashSet } from "./data_structures/hash";

const serializedClasses: { [key: string]: Function } = {};
export function serialized(constructor: Function) {
  serializedClasses[constructor.name] = constructor;
}

type GenericJSON = {
  [key: string]: string | number | boolean | null | undefined | GenericJSON[] | GenericJSON
};

type SerializeJSON = {
  entities: GenericJSON[];
  stage: number;
  fixedStage: number;
  parallaxStage: number;
};

const run: { [key: string]: boolean } = {};
export const once = (fn: () => void) => {
  if (!run[fn.toString()]) {
    fn();

    run[fn.toString()] = true;
  }
}

export class Serializer<T extends AllResourcesType> {
  game: BaseGame<T>;

  constructor(game: BaseGame<T>) {
    this.game = game;
  }

  getAllEntities(thing: HashSet<Entity> | Entity[]): Entity[] {
    let list: Entity[] = [];

    if (Array.isArray(thing)) {
      list = thing;
    } else {
      list = thing.values();
    }

    let result: Entity[] = [];

    for (const e of list) {
      result = [
        ...result,
        e,
        ...this.getAllEntities(e.children()),
      ];
    }

    return result;
  }

  public serializeEntity(e: Entity): string {
    const result: { [key: string]: any } = {};

    for (const key in this) {
      const val = this[key];

      if (val instanceof AugmentedSprite) {
        result[key] = {
          __type: "AugmentedSprite",
        }
      } else if (val instanceof Entity) {
        result[key] = {
          __type: "NestedEntity",
          __subtype: val.constructor.name,
          __id: val.id,
        };
      } else if (
        typeof (val) === "object" &&
        val !== null &&
        'toJSON' in val
      ) {
        result[key] = (val as any).toJSON();
      } else {
        result[key] = val;
      }
    }

    const getters = Object.entries(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this)))
      .filter(([key, descriptor]) => typeof descriptor.get === 'function');
    // .map(([key]) => key)

    for (const [name, descriptor] of getters) {
      result["get:" + name] = descriptor.get!.bind(e)();
    }

    console.log(result);

    return JSON.stringify({
      __type: "Entity",
      __subtype: this.constructor.name,

      ...result,
    });
  }

  serialize(): string {
    const allEntities = new HashSet(this.getAllEntities(this.game.state.entities));
    const idToEntity: { [key: string]: Entity } = {};

    for (const e of allEntities.values()) idToEntity[e.id] = e;

    const entities = this.game.state.entities.values();
    const e = entities[0];

    once(() => {
      console.log(allEntities);

      const result = JSON.stringify(entities, (key, value) => {
        if (value instanceof Entity) {
          return this.serializeEntity(value);
        } else if (
          typeof value === "number" ||
          typeof value === "string" ||
          typeof value === "boolean" ||
          typeof value === "undefined") {
          return JSON.stringify(value);
        } else {
          console.log("Unhandled:", value);

          throw new Error("Unhandled type!");
        }
      });

      console.log(result);
    });

    return "";
  }
}