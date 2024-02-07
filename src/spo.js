import { USB2SNES } from "./usb2snes.js";

/**
 * Interface with Super Punch-Out!! that uses the USB2SNES client
 */
export class SuperPunchOut {
  /**
   * @constructor
   * @param {USB2SNES} client
   */
  constructor(client) {
    this.client_ = client;
  }

  /**
   * Gets the current in-game time as a string (m:ss.cc)
   * @returns {Promise}
   */
  async getGameTime() {
    let buffer = await this.client_.send(USB2SNES.Opcodes.GET_ADDRESS, [SuperPunchOut.Addresses.CENTISECONDS, "5"]);
    return `${buffer[4]}:${buffer[3]}${buffer[2]}.${buffer[1]}${buffer[0]}`;
  }
}

/**
 * Relevant in-game addresses, using USB2SNES offsets 
 * ROM starts at 0x000000
 * WRAM starts at 0xF50000
 * SRAM starts at 0xE00000
 */
SuperPunchOut.Addresses = {
  // These represent each digit, not the total time in that unit
  CENTISECONDS: "F50B26", // 0-9
  DECISECONDS: "F50B27", // 0-9
  SECONDS: "F50B28", // 0-9
  DECOSECONDS: "F50B28", // 0-5
  MINUTES: "F50B2A" // 0-3
};
