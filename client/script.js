import ClientBlob from "../shared/clientBlob.js";
import { CONFIG } from "../shared/config.js";
import Player from "../shared/player.js";

// creates a websocket connection to localhost
const socket = new WebSocket("ws://localhost:8080");
socket.binaryType = "arraybuffer";

// variable representing the movement direction
let moveDir = 0;
// variable representing the dist from mouse to center of screen
let moveMag = 0;
// variable that contains the xp blobs
let xpBlobs = [];

// easier consts for window size
let w2 = window.innerWidth / 2;
let h2 = window.innerHeight / 2;

// correct them if the window gets resized
window.addEventListener("resize", () => {
  w2 = window.innerWidth / 2;
  h2 = window.innerHeight / 2;
});

// hook an event listener for "mousemove" event
window.addEventListener("mousemove", (e) => {
  // gets delta x/y from screen center
  let dy = e.clientY - h2;
  let dx = e.clientX - w2;

  // math.atan2 calculates the angle
  let dir = Math.atan2(dy, dx);

  moveDir = dir;
  moveMag = Math.sqrt(dy * dy + dx * dx) / 250;
});

// helper function to send packets to the server without repeating
function send(packet) {
  // exit out early if the socket is not ready
  if (socket.readyState != 1) return;

  socket.send(msgpack.encode(packet));
}

function findPlayerById(id) {
  return players.find((x) => x?.id == id);
}

document.getElementById("spawn").addEventListener("click", () => {
  // readyState of 1 means the socket is open
  if (socket.readyState == 1) {
    send(["spawn", [document.getElementById("nameField").value]]);
  }
});

// handles the 'message' event
socket.addEventListener("message", (e) => {
  try {
    const buffer = new Uint8Array(e.data);
    const [type, payload] = msgpack.decode(buffer);

    // console.log(type, payload);

    switch (type) {
      case "addBlob": {
        xpBlobs.push(payload);
        console.log(payload);
        break;
      }

      case "addPlayer": {
        let [id, x, y, name, color, blobs] = payload[0];

        let registeredBlobs = [];
        for (let i = 0; i < blobs.length; i += 4) {
          let blob = new ClientBlob(
            blobs[i],
            blobs[i + 1],
            blobs[i + 2],
            blobs[i + 3],
          );

          registeredBlobs.push(blob);
        }

        let player = new Player(id, name, x, y, color, blobs);
        player.blobs = registeredBlobs;

        if (payload[1]) {
          myPlayer = player;
        }
        players.push(player);

        break;
      }

      case "removePlayer": {
        players = players.filter((player) => player.id != payload[0]);
        break;
      }

      case "updatePlayers": {
        // iterate through the array incrementing by 4
        // data format: [id, x, y, blobs, ...]
        for (let i = 0; i < payload.length; i += 4) {
          // get the player
          let player = findPlayerById(payload[i]);
          // console.error(player);

          // skip any players that dont exist
          // function returns undefined
          // undefined is falsy
          // therefore this works!!
          if (!player) continue;

          // update old positions
          player.dt = 0;

          // update the player data
          player.x = payload[i + 1];
          player.y = payload[i + 2];

          // console.warn(player.blobs[0], payload[3]);

          // iterate and update the blobs of each player
          for (let j = 0; j < payload[i + 3].length; j += 4) {
            let blobI = j / 4;
            // console.log(payload[i + 3], blobI);

            if (!player.blobs[blobI]) continue;

            player.blobs[blobI].lastX = player.blobs[blobI].visualX;
            player.blobs[blobI].lastY = player.blobs[blobI].visualY;
            player.blobs[blobI].lastUpdate = performance.now();

            player.blobs[blobI].x = payload[i + 3][j + 1];
            player.blobs[blobI].y = payload[i + 3][j + 2];
          }
        }

        // to avoid spamming the socket if we send on mousemove event
        // we can send once we receive the update packet
        send(["move", [moveDir, moveMag]]);

        break;
      }
    }
  } catch (e) {
    console.error(e);
  }
});

// client seen players
let players = [];
// stores my specific player
let myPlayer = null;

// client seen blobs
let blobs = [];

// rendering context
const ctx = document.getElementById("gameCanvas").getContext("2d");

// old time for delta calculation
let oldTime = performance.now();
function renderLoop() {
  // gets the current time in ms from application start
  let now = performance.now();
  // find the difference from the last time this function was called
  let dt = now - oldTime;
  // set the old time to the current time
  oldTime = now;

  // render, passing the delta
  render(dt);

  // call using requestAnimationFrame to schedule for the next frame rendering
  requestAnimationFrame(renderLoop);
}

// call initially to begin
renderLoop();

// renderng core logic
function render(dt) {
  // do calculations before rendering
  for (const player of players) {
    player.dt += dt;

    for (const blob of player.blobs) {
      // lerp formula
      // (b - a) * t
      let t = Math.min(1, (performance.now() - blob.lastUpdate) / 67); // normalize 0-1
      blob.visualX = blob.lastX + (blob.x - blob.lastX) * t;
      blob.visualY = blob.lastY + (blob.y - blob.lastY) * t;
    }
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = "rgb(209, 229, 244)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // reduce essentially
  let avgX =
    myPlayer?.blobs?.reduce((s, b) => s + b.visualX, 0) /
    (myPlayer?.blobs?.length || 1);
  let avgY =
    myPlayer?.blobs?.reduce((s, b) => s + b.visualY, 0) /
    (myPlayer?.blobs?.length || 1);

  let xOffset = avgX - ctx.canvas.width / 2;
  let yOffset = avgY - ctx.canvas.height / 2;

  ctx.save();
  ctx.translate(-xOffset, -yOffset);

  ctx.strokeStyle = "rgb(23, 23, 23)";
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.lineWidth = 1;

  // grid lines horizontal
  for (let x = 0; x <= CONFIG.mapSize; x += 32) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.mapSize);
  }
  // grid lines vertical
  for (let y = 0; y <= CONFIG.mapSize; y += 32) {
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.mapSize, y);
  }

  ctx.stroke();
  ctx.restore();

  // render xp blobs
  for (const blob of xpBlobs) {
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(blob[1] - xOffset, blob[2] - yOffset, blob[3], 0, Math.PI * 2);
    ctx.fill();
  }

  if (!myPlayer) return;

  for (const player of players) {
    player.dt += dt;

    ctx.beginPath();
    ctx.fillStyle = player.color;
    player.blobs.forEach((blob) => {
      ctx.arc(
        blob.visualX - xOffset,
        blob.visualY - yOffset,
        35,
        0,
        Math.PI * 2,
      );
    });
    ctx.fill();
  }
}
