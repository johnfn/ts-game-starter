export class Pair<T extends { hash(): string }, U extends { hash(): string }> {
  private _first: T;
  private _second: U;

  constructor(first: T, second: U) {
    this._first  = first;
    this._second = second;
  }

  hash(): string {
    return `${ this._first.hash() }|${ this._second.hash() }`
  }

  get first() {
    return this._first;
  }

  get second() {
    return this._second;
  }
}