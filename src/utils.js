/**
 * Returns a promise that resolves after ms milliseconds.
 * @param {number} ms
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Convert centiseconds to LiveSplit's game time string format
 * @param {number} cs
 */
export function csToStr(cs) {
  let mins = Math.floor(cs / 6000);
  let csStr = `${cs - mins * 6000}`.padStart(4, "0");
  return `${mins}:${csStr[0]}${csStr[1]}.${csStr[2]}${csStr[3]}`;
}
