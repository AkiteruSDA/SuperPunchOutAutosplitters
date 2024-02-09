import { parseArgs } from "node:util";
import LiveSplitClient from "livesplit-client";
import { USB2SNES } from "usb2snes-client";
import { SuperPunchOut } from "./spo.js";
import { sleep, csToStr } from "./utils.js";

const ArgKeys = {
  USB2SNES_ADDRESS: "usb2snes-addr",
  LIVESPLIT_ADDRESS: "livesplit-addr"
};

const args = parseArgs({
  options: {
    [ArgKeys.USB2SNES_ADDRESS]: {
      type: "string",
      short: "u"
    },
    [ArgKeys.LIVESPLIT_ADDRESS]: {
      type: "string",
      short: "l"
    }
  }
}).values;

const usb2snes = new USB2SNES(args[ArgKeys.USB2SNES_ADDRESS] || "ws://localhost:23074");
const livesplit = new LiveSplitClient(args[ArgKeys.LIVESPLIT_ADDRESS] || "localhost:16834");

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

  console.log("Connecting to LiveSplit.Server...");
  try {
    await livesplit.connect();
  } catch (ex) {
    close(`Failed to connect to LiveSplit.Server: ${ex}`);
  }
  livesplit.initGameTime();
  livesplit.pauseGameTime();

  let spo = new SuperPunchOut(usb2snes);

  let prevTime = 0;
  let prevKO = false;
  let prevGabby = false;
  let total = 0;

  while (true) {
    let [time, isKO, isInFight, isInCredits, isInGabbyJay] = await Promise.all([
      spo.getGameTime(),
      spo.isKOShowing(),
      spo.isInFight(),
      spo.isInCredits(),
      spo.isInGabbyJay()
    ]);
    if (!prevGabby && isInGabbyJay && !isInCredits) {
      total = 0;
      livesplit.reset();
      livesplit.startTimer();
      livesplit.pauseGameTime();
    }
    if (!prevKO && isKO) {
      livesplit.split();
    }
    if (isInFight) {
      total += time - prevTime;
    }
    prevTime = time;
    prevGabby = isInGabbyJay;
    prevKO = isKO;
    livesplit.setGameTime(csToStr(total));
  }
}

let closing = false;
function close(message) {
  if (!closing) {
    closing = true;
    console.log(`Closing${message ? `: ${message}` : "..."}`);
    usb2snes.close();
    livesplit.disconnect();
    process.exit();
  }
}

process.on("exit", close);
process.on("SIGINT", close);
process.on("SIGTERM", close);
process.on("SIGQUIT", close);

run();
