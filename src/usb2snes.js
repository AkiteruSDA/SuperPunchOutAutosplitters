import WebSocket from "ws";

/**
 * Client for the USB2SNES WebSocket server
 */
export class USB2SNES {
  constructor (addr) {
    this.addr_ = addr;
    this.ws_ = null;
    this.commands_ = [];
    this.processing_ = false;
    this.onMessage_ = this.onMessage_.bind(this);
  }

  /**
   * Initialize the WebSocket client
   * @returns {Promise<undefined>}
   */
  init() {
    return new Promise((resolve, reject) => {
      try {
        this.ws_ = new WebSocket(this.addr_);
        this.ws_.addEventListener("error", (e) => reject(`Error connecting to USB2SNES server${e.message ? `: ${e.message}` : ""}`));
        this.ws_.addEventListener("open", () => {
          // Remove error/open initialization listeners that are no longer required
          this.ws_.removeAllListeners();
          // Add message handler
          this.ws_.addEventListener("message", this.onMessage_);
          resolve();
        });
      } catch (ex) {
        reject(`Error creating USB2SNES client${ex.message ? `: ${ex.message}` : ""}`);
      }
    });
  }

  /**
   * Immediately send a command to the WebSocket server. Does not resolve any result.
   * Use only for opcodes that do not trigger a response from the server, such as "Attach" and "Name".
   * Otherwise, use this.send.
   * @param {string} opcode
   * @param {Array=} opt_operands
   * @param {Array=} opt_flags
   * @param {string=} opt_space
   */
  sendImmediate(opcode, opt_operands = [], opt_flags = [], opt_space = USB2SNES.Spaces.SNES) {
    this.send_({
      opcode,
      operands: opt_operands,
      flags: opt_flags,
      space: opt_space
    });
  }

  /**
   * Send a command to the WebSocket server. Returns a promise that eventually resolves the result based on the command queue.
   * @param {string} opcode
   * @param {Array=} opt_operands
   * @param {Array=} opt_flags
   * @param {string=} opt_space
   * @returns {Promise<object|buffer>}
   */
  send(opcode, opt_operands = [], opt_flags = [], opt_space = USB2SNES.Spaces.SNES) {
    let resolve = null;
    let prom = new Promise((res) => {
      resolve = res;
    });
    this.commands_.push({
      opcode,
      operands: opt_operands,
      flags: opt_flags,
      space: opt_space,
      resolve
    });
    this.processCommands_();
    return prom;
  }

  send_(command) {
    let obj = {
      [USB2SNES.Keys.OPCODE]: command.opcode,
      [USB2SNES.Keys.SPACE]: command.space,
    };
    if (command.operands.length) {
      obj[USB2SNES.Keys.OPERANDS] = command.operands;
    }
    if (command.flags.length) {
      obj[USB2SNES.Keys.FLAGS] = command.flags;
    }
    this.ws_.send(JSON.stringify(obj));
  }

  onMessage_(message) {
    let command = this.commands_.shift();
    let toResolve = Buffer.isBuffer(message.data) ? message.data : JSON.parse(message.data)[USB2SNES.Keys.RESULTS];
    command.resolve(toResolve);
    if (this.commands_.length) {
      this.send_(this.commands_[0]);
    } else {
      this.processing_ = false;
    }
  }

  processCommands_() {
    if (this.processing_) {
      return;
    }
    this.processing_ = true;
    this.send_(this.commands_[0]);
  }

  /**
   * Add an error handler to the WebSocket client
   * @param {Function} handler
   */
  addErrorListener(handler) {
    this.ws_.addEventListener("error", (e) => handler(`USB2SNES client error${e.message ? `: ${e.message}` : ""}`));
  }

  /**
   * Add an close handler to the WebSocket client
   * @param {Function} handler
   */
  addCloseListener(handler) {
    this.ws_.addEventListener("close", (e) => handler(`Connection closed (${e.code})${e.reason ? `: ${e.reason}` : ""}`));
  }

  /**
   * Close the WebSocket client
   */
  close() {
    if (this.ws_) {
      console.log("Closing USB2SNES client...");
      this.ws_.removeAllListeners();
      if (this.ws_.readyState === WebSocket.OPEN) {
        this.sendImmediate(USB2SNES.Opcodes.CLOSE);
      }
      this.ws_.close();
      this.ws_ = null;
    }
  }
}

/**
 * Keys for a USB2SNES command object/response: https://github.com/Skarsnik/QUsb2snes/blob/master/docs/Protocol.md#performing-a-request
 */
USB2SNES.Keys = {
  // Sent
  OPCODE: "Opcode",
  SPACE: "Space",
  FLAGS: "Flags",
  OPERANDS: "Operands",

  // Received
  RESULTS: "Results"
};

/**
 * Valid spaces for a command: https://github.com/Skarsnik/QUsb2snes/blob/master/docs/Protocol.md#performing-a-request
 */
USB2SNES.Spaces = {
  SNES: "SNES",
  CMD: "CMD"
};

/**
 * USB2SNES opcodes from https://github.com/Skarsnik/QUsb2snes/blob/687455a4c32d8e0712611950d9ad368facc4d40a/usb2snes.h#L104
 */
USB2SNES.Opcodes = {
  // Format is [argument to send]->what is returned, {} mean a result json reply
  // Size are in hexformat

  // Connection
  DEVICE_LIST: "DeviceList", // List the available Device {portdevice1, portdevice2, portdevice3...}
  ATTACH: "Attach", // Attach to the devise using the name [portdevice]
  APP_VERSION: "AppVersion", // Give the version of the App {version}
  NAME: "Name", // Specificy the name of the client [name]
  CLOSE: "Close", // TODO this close the connection server side

  // Special
  INFO: "Info", // Give information about the sd2snes firmware {firmwareversion, versionstring, romrunning, flag1, flag2...}TOFIX
  BOOT: "Boot", // Boot a rom [romname] TOTEST
  MENU: "Menu", // Get back to the menu TOTEST
  RESET: "Reset", // Reset TOTEST
  BINARY: "Binary", // TODO Send data directly to the sd2snes I guess?
  STREAM: "Stream", // TODO
  FENCE: "Fence", // TODO
  GET_ADDRESS: "GetAddress", // Get the value of the address, space is important [offset, size]->datarequested TOFIX multiarg form
  PUT_ADDRESS: "PutAddress", // put value to the address  [offset, size] then send the binary data.
                             // Also support multiple request in one [offset1, size1, offset2, size2] TOFIX work on size check/boundary
  PUT_IPS: "PutIPS", // Apply a patch - [name, size] then send binary data
                     // a special name is 'hook' for the sd2snes
  GET_FILE: "GetFile", // Get a file - [filepath]->{size}->filedata
  PUT_FILE: "PutFile", // Post a file -  [filepath, size] then send the binary data
  LIST: "List", // LS command - [dirpath]->{typefile1, namefile1, typefile2, namefile2...}
  REMOVE: "Remove", // remove a file [filepath]
  RENAME: "Rename", // rename a file [filepath, newfilename]
  MAKE_DIR: "MakeDir" // create a directory [dirpath]
};
