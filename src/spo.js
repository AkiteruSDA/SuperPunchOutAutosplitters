import { USB2SNES } from "usb2snes-client";

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
   * Gets the current in-game time in centiseconds
   * @returns {Promise<number>}
   */
  async getGameTime() {
    let buffer = await this.client_.send(USB2SNES.Opcodes.GET_ADDRESS, [SuperPunchOut.Addresses.CENTISECONDS, "5"]);
    return buffer[0]
      + buffer[1] * 10
      + buffer[2] * 100
      + buffer[3] * 1000
      + buffer[4] * 6000;
  }

  /**
   * Gets whether KO or TKO is showing on screen
   * @returns {Promise<boolean>}
   */
  async isKOShowing() {
    let buffer = await this.client_.send(USB2SNES.Opcodes.GET_ADDRESS, [SuperPunchOut.Addresses.COUNTER_GRAPHIC, "1"]);
    return buffer[0] === SuperPunchOut.CounterGraphics.TKO || buffer[0] === SuperPunchOut.CounterGraphics.KO;
  }

  /**
   * Gets whether you are currently in a fight
   * @returns {Promise<boolean>}
   */
  async isInFight() {
    let buffer = await this.client_.send(USB2SNES.Opcodes.GET_ADDRESS, [SuperPunchOut.Addresses.IN_FIGHT, "1"]);
    return buffer[0] === 1;
  }

  /**
   * Gets whether you are currently in the Gabby Jay fight
   * @returns {Promise<boolean>}
   */
  async isInGabbyJay() {
    let buffer = await this.client_.send(USB2SNES.Opcodes.GET_ADDRESS, [SuperPunchOut.Addresses.CURRENT_FIGHT, "2"]);
    return buffer[0] === 9 && buffer[1] === 0;
  }
}

/**
 * Relevant in-game addresses, using USB2SNES offsets 
 * ROM starts at 0x000000
 * WRAM starts at 0xF50000
 * SRAM starts at 0xE00000
 */
SuperPunchOut.Addresses = {
  COUNTER_GRAPHIC: "F50BD0", // Don't really know what to call this
  IN_FIGHT: "F50001",
  CURRENT_FIGHT: "F50990",

  // These represent each digit, not the total time in that unit
  CENTISECONDS: "F50B26", // 0-9
  DECISECONDS: "F50B27", // 0-9
  SECONDS: "F50B28", // 0-9
  DECOSECONDS: "F50B28", // 0-5
  MINUTES: "F50B2A" // 0-3
};

SuperPunchOut.CounterGraphics = {
  TKO: 0x0C,
  KO: 0x0D,
};
