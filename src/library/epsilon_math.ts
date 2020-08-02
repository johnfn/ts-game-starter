export const EPSILON = 0.0000001;

export const epsEqual = (x: number, y: number) => {
  return Math.abs(x - y) < EPSILON;
}

export const epsGreaterThan = (x: number, y: number) => {
  return (x + EPSILON - y) > 0;
}

export const epsLessThan = (x: number, y: number) => {
  return (x - EPSILON - y) < 0;
}