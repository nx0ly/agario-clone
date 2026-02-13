import { getRandomColor } from "./config.js";

export default class ClientBlob {
  constructor(id, x, y, scale, isPlayer = false) {
    this.id = id;
    this.x = x;
    this.y = y;

    this.lastX = x;
    this.lastY = y;

    this.lastUpdate = 0;

    this.visualX = x;
    this.visualY = y;

    this.player = isPlayer;

    this.xp = 0;
    // todo: add some sort of function here instead
    this.scale = scale;

    // this.color = color || getRandomColor();
  }
}
