const { execFileSync } = require('child_process');
const path = require('path');

function getDriveRoot(currentWorkingDirectory) {
  const parsed = path.parse(currentWorkingDirectory);
  return parsed.root.replace(/[\\/]+$/, '');
}

function getFilesystemName(driveRoot) {
  const output = execFileSync('fsutil', ['fsinfo', 'volumeinfo', driveRoot], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const match = output.match(/File System Name\s*:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  const driveRoot = getDriveRoot(process.cwd());
  const filesystemName = getFilesystemName(driveRoot);

  if (filesystemName && filesystemName.toLowerCase() !== 'ntfs') {
    console.error(
      [
        'Next.js production builds are blocked on this Windows filesystem.',
        `Current drive: ${driveRoot}`,
        `Detected filesystem: ${filesystemName}`,
        'Move the repo to an NTFS path or run the build inside WSL/Linux to avoid the',
        "known Next.js 'EISDIR ... readlink ... _app.js' failure on exFAT/FAT volumes.",
      ].join('\n'),
    );
    process.exit(1);
  }
} catch (error) {
  console.warn(
    `Unable to verify the Windows filesystem before build: ${error instanceof Error ? error.message : String(error)}`,
  );
}

