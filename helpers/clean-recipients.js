const { isAddress, isENS } = require("./validate-and-convert-address");

const cleanRecipients = (recipients) => {
  const channelRecipientsInput = [];
  recipients
    .map((r) => {
      const arr = r.split("@");
      if (!arr.length || arr.length !== 2)
        throw new Error(`Invalid recipient ${r}`);
      return arr;
    })
    .forEach((r) => {
      const locale = r[0];
      const domains = r[1]?.split(".");
      if (!domains || domains.length !== 2) {
        throw new Error(`Invalid recipient domain ${r}`);
      }
      const domain = domains[0];
      const tld = domains[1];
      if (isAddress(locale)) {
        channelRecipientsInput.push({
          recipientType: 0, // user
          locale,
          domain,
          tld,
        });
      } else if (isENS(locale)) {
        channelRecipientsInput.push({
          recipientType: 0, // user
          locale,
          domain,
          tld,
        });
      } else {
        channelRecipientsInput.push({
          recipientType: 1, // role
          locale,
          domain,
          tld,
        });
      }
    });
  return channelRecipientsInput;
};

module.exports = {
  cleanRecipients,
};
