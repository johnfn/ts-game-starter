import { Entity } from "../library/entity";
import { Assets } from "./assets";
import { IGameState } from "Library";

export class Player extends Entity {
  graphic: Entity;
  speed = 10;

  constructor() {
    super({
      name: "Player",
    });

    this.graphic = new Entity({ name: "PlayerGraphic" });
    this.graphic.texture = Assets.getResource("player");

    this.addChild(this.graphic);
  }

  move(state: IGameState) {
    if (state.keys.down.Right) {
      this.x += this.speed;
    }

    if (state.keys.down.Left) {
      this.x -= this.speed;
    }

    if (state.keys.down.Up) {
      this.y -= this.speed;
    }

    if (state.keys.down.Down) {
      this.y += this.speed;
    }
  }

  update(state: IGameState) {
    this.move(state);
  }
}