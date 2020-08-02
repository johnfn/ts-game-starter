const KeyInfo = () => ({
  Q       : false,
  W       : false,
  E       : false,
  R       : false,
  T       : false,
  Y       : false,
  U       : false,
  I       : false,
  O       : false,
  P       : false,
  A       : false,
  S       : false,
  D       : false,
  F       : false,
  G       : false,
  H       : false,
  J       : false,
  K       : false,
  L       : false,
  Z       : false,
  X       : false,
  C       : false,
  V       : false,
  B       : false,
  N       : false,
  M       : false,
  Up      : false,
  Down    : false,
  Left    : false,
  Right   : false,
  Shift   : false,
  Spacebar: false,
  Enter   : false,
});

export type KeyInfoType = ReturnType<typeof KeyInfo>;

interface QueuedKeyboardEvent {
  isDown: boolean;
  event : KeyboardEvent;
}

export class KeyboardState {
  public down     = KeyInfo();
  public justDown = KeyInfo();
  public justUp   = KeyInfo();

  private _queuedEvents: QueuedKeyboardEvent[] = [];

  constructor() {
    document.addEventListener("keydown", e => this.keyDown(e), false);
    document.addEventListener("keyup"  , e => this.keyUp(e),   false);
    window.addEventListener("blur"     , () => { 
      this.clear();
    }, false);
  }

  public clear() {
    this.down          = KeyInfo(); 
    this.justDown      = KeyInfo(); 
    this.justUp        = KeyInfo(); 
    this._queuedEvents = [];
  }

  private keyUp(e: KeyboardEvent): void {
    // Since events usually happen between two ticks, we queue them up to be
    // processed on the next tick.

    this._queuedEvents.push({ event: e, isDown: false });
  }

  private keyDown(e: KeyboardEvent): void {
    this._queuedEvents.push({ event: e, isDown: true });
  }

  private eventToKey(event: KeyboardEvent): string {
    const number = event.keyCode || event.which;
    let str: string;

    switch (number) {
      case 13: str = "Enter"; break;
      case 16: str = "Shift"; break;
      case 37: str = "Left" ; break;
      case 38: str = "Up"   ; break;
      case 39: str = "Right"; break;
      case 40: str = "Down" ; break;

      /* A-Z */
      default: str = String.fromCharCode(number);
    }

    if (str === " ") {
      return "Spacebar";
    }

    if (str.length === 1) {
      return str.toUpperCase();
    }

    return str[0].toUpperCase() + str.slice(1);
  }

  update(): void {
    for (const key of Object.keys(this.justDown)) {
      this.justDown[key as keyof KeyInfoType] = false;
      this.justUp[key as keyof KeyInfoType] = false;
    }

    for (const queuedEvent of this._queuedEvents) {
      const key = this.eventToKey(queuedEvent.event);

      if (queuedEvent.isDown) {
        if (!this.down[key as keyof KeyInfoType]) {
          this.justDown[key as keyof KeyInfoType] = true;
        }

        this.down[key as keyof KeyInfoType] = true;
      } else {
        if (this.down[key as keyof KeyInfoType]) {
          this.justUp[key as keyof KeyInfoType] = true;
        }
        
        this.down[key as keyof KeyInfoType] = false;
      }
    }

    this._queuedEvents = [];
  }
}