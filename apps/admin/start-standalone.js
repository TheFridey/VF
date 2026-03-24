const fs = require('fs');
const path = require('path');

process.env.PORT = process.env.PORT || '3002';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

const appRoot = __dirname;
const standaloneAppRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'admin');
const serverPath = path.join(standaloneAppRoot, 'server.js');

function syncDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

if (!fs.existsSync(serverPath)) {
  throw new Error(`Could not find the admin standalone server at ${serverPath}`);
}

// Next's monorepo standalone output expects static assets inside the nested app folder.
syncDirectory(path.join(appRoot, '.next', 'static'), path.join(standaloneAppRoot, '.next', 'static'));
syncDirectory(path.join(appRoot, 'public'), path.join(standaloneAppRoot, 'public'));

require(serverPath);
