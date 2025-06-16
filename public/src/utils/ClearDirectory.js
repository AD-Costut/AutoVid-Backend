const path = require("path");
const fs = require("fs");

const clearDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.lstatSync(fullPath).isFile()) {
        fs.unlinkSync(fullPath);
      }
    }
  }
};

module.exports = { clearDirectory };
