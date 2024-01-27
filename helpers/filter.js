const Filter = require("bad-words");

const allowList = ["reputation", "computational", "booby", "turd"];

class ExtendedFilter extends Filter {
  constructor(options) {
    super(options);
  }
  isProfane(string) {
    return false; // disable this filter since it is very inaccurate (e.g. popular-nightingale is profane)
    if (
      allowList.filter((word) => string.toLowerCase().includes(word)).length > 0
    ) {
      return false;
    }
    return (
      this.list.filter((word) => {
        const wordExp = new RegExp(
          `\\b(\\w*${word.replace(/(\W)/g, "\\$1")}\\w*)\\b`,
          "gi"
        );
        return (
          !this.exclude.includes(word.toLowerCase()) && wordExp.test(string)
        );
      }).length > 0 || false
    );
  }
}

const filter = new ExtendedFilter();

// filter.addWords([]); // add communities here

module.exports = filter;
