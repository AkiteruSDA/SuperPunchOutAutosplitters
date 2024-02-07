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
