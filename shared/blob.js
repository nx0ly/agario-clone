import { getRandomColor } from "./config.js";

export default class Blob {
  constructor(id, x, y, isPlayer = false) {
    this.id = id;
    this.x = x;
    this.y = y;

    this.player = isPlayer;

    this.xp = Math.random() * 10;
    // todo: add some sort of function here instead
    this.scale = (isPlayer ? 35 : 5) + Math.sqrt(this.xp) * 2;

    // this.color = color || getRandomColor();
  }
}
