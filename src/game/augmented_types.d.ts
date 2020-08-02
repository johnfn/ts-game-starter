import { Player } from "./player";
import { Overlay } from "./overlay";
import { GameMap } from "./game_map";
import { Camera } from "../library/camera";
import { Cinematics } from "./cinematics";
import { Sfx } from "./sfx";

declare module "Library" {
  export interface ModeList {
    Dialog: never;
    Menu: never;
  }

  export interface IGameState {
    player: Player;
  }
}