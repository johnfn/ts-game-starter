import { Vector2, IVector2 } from "./geometry/vector2";
import { Entity } from "./entity";
import { Rect } from "./geometry/rect";
import { Debug } from "./debug";
import { IGameState } from "Library";

export class Camera {
  private static LERP_SPEED_X = 0.03;
  private static LERP_SPEED_Y = 0.4;


  /**
   * Top left coordinate of the camera.
   */
  private _position = Vector2.Zero;
  private _desiredPosition = Vector2.Zero;
  private _stage: Entity;
  private _canvasWidth: number;
  private _canvasHeight: number;
  private _currentBounds: Rect;

  constructor(props: {
    stage: Entity;
    state: IGameState;
    canvasWidth: number;
    canvasHeight: number;
    scale: number;
    bounds: Rect;
  }) {
    this._stage = props.stage;
    this._canvasWidth = props.canvasWidth / props.scale;
    this._canvasHeight = props.canvasHeight / props.scale;
    this._currentBounds = props.bounds;

    this._immediatelyCenterOn(new Vector2({
      x: this._canvasWidth / 2,
      y: this._canvasHeight / 2
    }));

    this._desiredPosition = this._position;
  }

  public get center(): Vector2 {
    return new Vector2({
      x: this._position.x + this._canvasWidth / 2,
      y: this._position.y + this._canvasHeight / 2
    });
  }

  public setBounds(newBounds: Rect) {
    this._currentBounds = newBounds;
  }

  public getBounds(): Rect {
    return this._currentBounds;
  }

  public cameraFrame(): Rect {
    return new Rect({
      x: this.center.x - this._canvasWidth / 2,
      y: this.center.y - this._canvasHeight / 2,
      width: this._canvasWidth,
      height: this._canvasHeight,
    });
  }

  private halfDimensions(): Vector2 {
    return new Vector2({
      x: this._canvasWidth / 2,
      y: this._canvasHeight / 2
    });
  }

  private _immediatelyCenterOn = (position: IVector2) => {
    this._position = new Vector2(position).subtract(this.halfDimensions());
  };

  centerOn = (position: IVector2, immediate = false) => {
    if (immediate) {
      this._immediatelyCenterOn(position);
    } else {
      this._desiredPosition = new Vector2(position).subtract(this.halfDimensions());
    }
  };

  calculateDesiredPosition = (): Vector2 => {
    let desiredPosition = this._desiredPosition;

    const currentBounds = this._currentBounds;

    if (!currentBounds) {
      console.error("no region for camera!");

      return desiredPosition;
    }

    if (currentBounds.width < this._canvasWidth || currentBounds.height < this._canvasHeight) {
      throw new Error(`There is a region on the map which is too small for the camera at x: ${currentBounds.x} y: ${currentBounds.y}.`);
    }

    // fit the camera rect into the regions rect

    if (desiredPosition.x < currentBounds.left) {
      desiredPosition = desiredPosition.withX(currentBounds.left);
    }

    if (desiredPosition.x + this.cameraFrame().width > currentBounds.right) {
      desiredPosition = desiredPosition.withX(currentBounds.right - this._canvasWidth);
    }

    if (desiredPosition.y < currentBounds.top) {
      desiredPosition = desiredPosition.withY(currentBounds.top);
    }

    if (desiredPosition.y + this.cameraFrame().height > currentBounds.bottom) {
      desiredPosition = desiredPosition.withY(currentBounds.bottom - this._canvasHeight);
    }

    return desiredPosition;
  };

  update = (state: IGameState) => {
    if (Debug.DebugMode) {
      return;
    }

    const desiredPosition = this.calculateDesiredPosition();

    this._position = this._position.lerp2D(desiredPosition, Camera.LERP_SPEED_X, Camera.LERP_SPEED_Y);

    this._position = new Vector2(
      Math.floor(this._position.x / 4) * 4,
      Math.floor(this._position.y / 4) * 4
    );

    this._stage.x = Math.floor(-this._position.x);
    this._stage.y = Math.floor(-this._position.y);
  };
}