const fs = require('fs');
const path = require('path');

process.env.PORT = process.env.PORT || '3002';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

const serverPath = path.join(__dirname, '.next', 'standalone', 'apps', 'admin', 'server.js');

if (!fs.existsSync(serverPath)) {
  throw new Error(`Could not find the admin standalone server at ${serverPath}`);
}

require(serverPath);
