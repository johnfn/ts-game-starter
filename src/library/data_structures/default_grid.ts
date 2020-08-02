// 2D array that allows for negative indices
export class DefaultGrid<T> {
  private _data: { [key: number]: { [key: number]: T} } = {};
  private _makeDefault: (x: number, y: number) => T;
  private _count = 0;

  constructor(makeDefault: (x: number, y: number) => T) {
    this._makeDefault = makeDefault;
  }

  getCount() {
    return this._count;
  }

  keys(): { x: number, y: number }[] {
    const result: { x: number, y: number }[] = [];

    for (const x of Object.keys(this._data)) {
      const inner = this._data[Number(x)];

      for (const y of Object.keys(inner)) {
        result.push({ 
          x: Number(x), 
          y: Number(y),
        });
      }
    }

    return result;
  }

  values(): T[] {
    const result: T[] = [];

    for (const x of Object.keys(this._data)) {
      const inner = this._data[Number(x)];

      for (const y of Object.keys(inner)) {
        result.push(inner[Number(y)]);
      }
    }

    return result;

  }

  set(x: number, y: number, value: T) {
    if (!this._data[x]) {
      this._data[x] = {};
    }

    if (!this._data[x][y]) {
      this._count++;
    }

    this._data[x][y] = value;
  }

  get(x: number, y: number): T {
    if (!this._data[x]) {
      this._data[x] = {};
    }

    if (this._data[x][y] === undefined) {
      this._data[x][y] = this._makeDefault(x, y);
    }

    return this._data[x][y];
  }
}
