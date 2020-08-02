import { KeyInfoType } from "./keyboard";
import { IGameState } from "Library";
import { Entity } from "./entity";
import { Game } from "../game/game";
import { BaseGame } from "./base_game";
import { IS_DEBUG } from "./environment";

/**
 * const state: GameState = yield CoroutineResult;
 */
export type GameCoroutine = Generator<CoroutineResult, void, IGameState>

export type CoroutineResult = "next" | { frames: number } | { untilKeyPress: keyof KeyInfoType };

type ActiveCoroutine = {
  fn     : GameCoroutine;
  status : 
    | { waiting: false }
    | { waiting: true; type: "frames"  ; frames: number }
    | { waiting: true; type: "untilKey"; untilKey: keyof KeyInfoType }
  name    : string;
  owner   : Entity | Game;
};

export type CoroutineId = number;

export class CoroutineManager {
  private _lastCoroutineId: CoroutineId = -1;
  private _activeCoroutines: { [key: number]: ActiveCoroutine } = [];
  private _game: BaseGame<any>;

  constructor(game: BaseGame<any>) {
    this._game = game;
  }

  startCoroutine(name: string, co: GameCoroutine, owner: Entity | Game): CoroutineId {
    for (const activeCo of Object.values(this._activeCoroutines)) {
      if (activeCo.name === name) {
        if (IS_DEBUG) {
          throw new Error(`Two coroutines with the name ${ name }. Tell grant about this!!!`);
        } else {
          return 0;
        }
      }
    }

    this._activeCoroutines[++this._lastCoroutineId] = {
      fn     : co,
      status : { waiting: false },
      name   : name,
      owner  : owner,
    };

    return this._lastCoroutineId;
  }

  public stopCoroutine(id: CoroutineId): void {
    delete this._activeCoroutines[id];
  }

  public updateCoroutines(state: IGameState): void {
    for (const key of Object.keys(this._activeCoroutines)) {
      const co = this._activeCoroutines[Number(key)];

      if (co.status.waiting) {
        if (co.status.type === "frames") {
          if (co.status.frames-- < 0) {
            co.status = { waiting: false };
          } else {
            continue;
          }
        } else if (co.status.type === "untilKey") {
          if (state.keys.justDown[co.status.untilKey]) {
            co.status = { waiting: false };
          } else {
            continue;
          }
        }
      }

      const { value, done } = co.fn.next(state);

      if (done) {
        this.stopCoroutine(Number(key));

        continue;
      }

      if (value === "next") {
        continue;
      } 

      if (typeof value === "object") {
        if ("frames" in value) {
          co.status = { waiting: true, type: 'frames', frames: value.frames };

          continue;
        } else if ("untilKeyPress" in value) {
          co.status = { waiting: true, type: 'untilKey', untilKey: value.untilKeyPress };

          continue;
        }
      }
    }
  }

  stopCoroutinesOwnedBy(entity: Entity) {
    const ids = Object.keys(this._activeCoroutines).map(k => Number(k));

    for (const id of ids) {
      if (this._activeCoroutines[id].owner === entity) {
        this.stopCoroutine(id);
      }
    }
  }
}
