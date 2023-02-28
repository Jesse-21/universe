const namehash = require("@ensdomains/eth-ens-namehash");
const validation = require("@ensdomains/ens-validation");

function isEncodedLabelhash(hash) {
  return hash.startsWith("[") && hash.endsWith("]") && hash.length === 66;
}

const validRegex = new RegExp("^[A-Za-z0-9-]+$");

function validateName(name) {
  const nameArray = name.split(".");
  const hasEmptyLabels = nameArray.some((label) => label.length == 0);
  if (hasEmptyLabels) throw new Error("Domain cannot have empty labels");
  const normalizedArray = nameArray.map((label) => {
    if (label === "[root]") {
      return label;
    } else {
      return isEncodedLabelhash(label) ? label : namehash.normalize(label);
    }
  });

  const _name = normalizedArray.join(".");
  if (!validation.validate(_name)) {
    throw new Error("Domain cannot have invalid characters");
  }

  if (!validRegex.test(_name.replace(".beb", ""))) {
    throw new Error("Domain cannot have invalid characters valid=(A-Za-z0-9_)");
  }

  return _name;
}

module.exports = { validateName };
