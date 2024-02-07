import { parseArgs } from "node:util";
import { USB2SNES } from "./usb2snes.js";
import { SuperPunchOut } from "./spo.js";
import { sleep } from "./utils.js";

global.args = parseArgs({
  options: {
    "ws-addr": {
      type: "string",
      short: "w"
    }
  }
}).values;

const usb2snes = new USB2SNES(global.args["ws-addr"]);

async function run() {
  // Initialize USB2SNES client
  console.log("Initializing USB2SNES client...");
  try {
    await usb2snes.init();
    usb2snes.addErrorListener(close);
    usb2snes.addCloseListener(close);
  } catch (message) {
    close(message);
  }

  let deviceList = await usb2snes.send(USB2SNES.Opcodes.DEVICE_LIST);
  if (!deviceList.length) {
    close("No devices connected.");
  }
  console.log(`Device list: ${deviceList}`);

  console.log("Attaching to first device...");
  usb2snes.sendImmediate(USB2SNES.Opcodes.NAME, ["Super Punch-Out!! Autosplitter"]);
  usb2snes.sendImmediate(USB2SNES.Opcodes.ATTACH, [deviceList[0]]);
  // Sleep for 1 second because Attach doesn't trigger a response from the server for some reason
  await sleep(1000);

  console.log("Getting info...");
  let info = await usb2snes.send(USB2SNES.Opcodes.INFO);
  console.log(`Info: ${info}`);

  let spo = new SuperPunchOut(usb2snes);
  while (true) {
    let time = await spo.getGameTime();
    console.log(`Game time: ${time}`);
  }
}

let closing = false;
function close(message) {
  if (!closing) {
    closing = true;
    console.log(`Closing${message ? `: ${message}` : "..."}`);
    usb2snes.close();
    process.exit();
  }
}

process.on("exit", close);
process.on("SIGINT", close);
process.on("SIGTERM", close);
process.on("SIGQUIT", close);

run();
