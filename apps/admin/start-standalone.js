const fs = require('fs');
const path = require('path');

process.env.PORT = process.env.PORT || '3002';

const candidatePaths = [
  path.join(__dirname, '.next', 'standalone', 'server.js'),
  path.join(__dirname, '.next', 'standalone', 'apps', 'admin', 'server.js'),
];

const serverPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

if (!serverPath) {
  throw new Error(
    `Could not find a standalone Next server. Checked: ${candidatePaths.join(', ')}`,
  );
}

require(serverPath);
