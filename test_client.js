const io = require("socket.io-client");

const socket = io("http://localhost:3000");

console.log("TEST CLIENT: Connecting...");

socket.on("connect", () => {
  console.log("TEST CLIENT: Connected to Unified Server!");
});

socket.on("update", (data) => {
  console.log("TEST CLIENT: [GAME DATA RECEIVED]", JSON.stringify(data).substring(0, 100) + "...");
});

socket.on("state_update", (state) => {
  console.log("TEST CLIENT: [STATE UPDATE RECEIVED]");
});

setTimeout(() => {
    console.log("TEST CLIENT: Timeout, closing.");
    process.exit(0);
}, 15000);
