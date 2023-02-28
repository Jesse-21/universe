/**
 * return a promise that resolves to true if the first promise to resolve to true.
 * false if all promises resolve to false.
 * @docs https://stackoverflow.com/questions/51160260/clean-way-to-wait-for-first-true-returned-by-promise
 * @param {Promise[]} promises
 * @returns Promise<Boolean>
 */
function firstPromiseToReturnTrue(promises = []) {
  const newPromises = promises.map(
    (p) =>
      new Promise((resolve, reject) =>
        p.then((v) => v && resolve(true), reject)
      )
  );
  newPromises.push(Promise.all(promises).then(() => false));
  return Promise.race(newPromises);
}

module.exports = {
  firstPromiseToReturnTrue,
};
