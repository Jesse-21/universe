const namehash = require("@ensdomains/eth-ens-namehash");
const validation = require("@ensdomains/ens-validation");

function isEncodedLabelhash(hash) {
  return hash.startsWith("[") && hash.endsWith("]") && hash.length === 66;
}

const validRegex = new RegExp("^[A-Za-z0-9-_]+$");

function validateName(name) {
  const prefix = name.startsWith("op_") ? "op_" : "";
  const nameArray = name.replace("op_", "").split(".");
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

  if (!validRegex.test(_name.replace(".beb", "").replace(".cast", ""))) {
    throw new Error(
      "Domain cannot have invalid characters valid=(A-Za-z0-9-_)"
    );
  }

  return prefix + _name;
}

module.exports = { validateName };
