// 2D array that allows for negative indices
export class Grid<T> {
  private _data: { [key: number]: { [key: number]: T} } = {};

  getCount() {
    let count = 0;

    for (const key of Object.keys(this._data)) {
      const inner = this._data[Number(key)];

      count += Object.keys(inner).length;
    }

    return count;
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

  set(x: number, y: number, value: T) {
    if (!this._data[x]) {
      this._data[x] = {};
    }

    this._data[x][y] = value;
  }

  get(x: number, y: number): T | null {
    if (!this._data[x]) {
      return null;
    }

    if (this._data[x][y] === undefined) {
      return null;
    }

    return this._data[x][y];
  }

  getOrDefault(x: number, y: number, otherwise: T): T {
    const result = this.get(x, y);

    if (result === null) {
      return otherwise;
    } else {
      return result;
    }
  }
}
