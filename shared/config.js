// default configurations for the game
export const CONFIG = {
  // how big the map is
  mapSize: 8192,
  // how fast players accelerate
  playerAcceleration: 1.006,
  // how fast players decelerate
  playerDecel: Math.pow(0.993, 200),
};

// generator function, lazy evaluation
export function getRandomColor() {
  const letters = "0123456789ABCDEF";

  let color = "#";

  for (let i = 0; i < 6; i++) {
    // hex codes are 6 chars

    // adds a char to the hex string
    // (0 | ...) bitwise floor shortcut
    // Math.random() * letters.length -> expands from 0-1 to 0-16 (floored)
    color += letters[0 | (Math.random() * letters.length)];
  }

  return color;
}
