import { CONFIG, getRandomColor } from "./config.js";
import Blob from "./blob.js";

// player class for players
// every player is also a blob
export default class Player {
  constructor(id, name, x, y, color, blobs = []) {
    // super(id, x, y, color, true);
    this.id = id;
    this.x = x;
    this.y = y;
    this.color = color || getRandomColor();

    this.blobs = blobs;
    // set an initial blob
    !blobs.length && this.blobs.push(new Blob(blobs.length, x, y));

    this.vx = 0;
    this.vy = 0;

    this.name = name;

    this.lastX = 0;
    this.lastY = 0;

    this.dt = 0;

    // around 55.5555
    this.speed = 1000 / 9 / 2;

    this.moveDir = null;
  }

  update(dt = 33) {
    // this.moveDir should be truthy, ie not null
    if (this.moveDir !== null) {
      // acceleration
      this.vx = Math.min(
        67,
        this.vx + CONFIG.playerAcceleration * dt * Math.cos(this.moveDir),
      );
      this.vy = Math.min(
        67,
        this.vy + CONFIG.playerAcceleration * dt * Math.sin(this.moveDir),
      );
    } else {
      // deceleration
      this.vx *= CONFIG.playerDecel;
      this.vy *= CONFIG.playerDecel;
    }

    const max = 67;
    this.vx = Math.max(-max, Math.min(max, this.vx));
    this.vy = Math.max(-max, Math.min(max, this.vy));

    // update positions
    this.x += this.vx * this.speed;
    this.y += this.vy * this.speed;

    this.x = Math.max(0, Math.min(this.x, CONFIG.mapSize));
    this.y = Math.max(0, Math.min(this.y, CONFIG.mapSize));

    for (const blob of this.blobs) {
      blob.x += this.vx * this.speed;
      blob.y += this.vy * this.speed;

      blob.x = Math.max(0, Math.min(blob.x, CONFIG.mapSize));
      blob.y = Math.max(0, Math.min(blob.y, CONFIG.mapSize));
    }
  }
}
