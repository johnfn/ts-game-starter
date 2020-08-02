let lastUsedId = 0;

export const getUniqueID = () => {
  return lastUsedId++;
};

export class Util {
  static MinBy<T>(list: T[], fn: (T: T) => number): T | undefined {
    let lowestT    : T | undefined = undefined;
    let lowestValue: number | undefined = undefined;

    for (const item of list) {
      const value = fn(item);

      if (lowestValue === undefined || value < lowestValue) {
        lowestT = item;
        lowestValue = value;
      }
    }

    return lowestT;
  }

  static MaxBy<T>(list: T[], fn: (T: T) => number): T | undefined {
    let highestT    : T | undefined = undefined;
    let highestValue: number | undefined = undefined;

    for (const item of list) {
      const value = fn(item);

      if (highestValue === undefined || value > highestValue) {
        highestT = item;
        highestValue = value;
      }
    }

    return highestT;
  }

  static RandRange(low: number, high: number): number {
    return Math.floor(Math.random() * (high - low) + low);
  }

  public static SortByKey<T>(array: T[], key: (x: T) => number): T[] {
    return array.sort((a, b) => {
      return key(a) - key(b)
    });
  }

  public static ReplaceAll(
    str   : string,
    mapObj: { [key: string]: string }
  ): string {
    const re = new RegExp(Object.keys(mapObj).join('|'), 'gi')

    return str.replace(re, matched => {
      return mapObj[matched.toLowerCase()]
    });
  }

  public static Debounce<F extends (...args: any[]) => void>(
    func: F,
    waitMilliseconds = 50,
    options = {
      isImmediate: false,
    }
  ): F {
    let timeoutId: any; // types are different on node vs client, so we have to use any.

    const result = (...args: any[]) => {
      const doLater = () => {
        timeoutId = undefined;
        if (!options.isImmediate) {
          func.apply(this, args);
        }
      }

      const shouldCallNow = options.isImmediate && timeoutId === undefined;

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(doLater, waitMilliseconds);

      if (shouldCallNow) {
        func.apply(this, args);
      }
    }

    return result as any;
  }

  public static FormatDate(d: Date): string {
    const monthName = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][d.getMonth()]

    return `${monthName} ${d.getDate()}, ${('00' + d.getHours()).substr(-2)}:${(
      '00' + d.getMinutes()
    ).substr(-2)}:${('00' + d.getSeconds()).substr(-2)}`;
  }

  public static FlattenByOne<T>(arr: T[][]): T[] {
    let result: T[] = []

    for (const obj of arr) {
      result = result.concat(obj)
    }

    return result
  }

  public static PadString(string: string, length: number, intersperse = "", character = " ") {
    return string + intersperse + character.repeat(length - string.length);
  }
}
