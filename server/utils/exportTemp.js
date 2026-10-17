import fs from 'node:fs';
import path from 'node:path';
export function createExportTempDirectory(root) {
  fs.mkdirSync(root, { recursive: true });
  const safeRoot = fs.realpathSync(root);
  const directory = fs.mkdtempSync(path.join(safeRoot, 'export-'));
  return {
    directory,
    cleanup() {
      // Only the server-created immediate child can ever be removed recursively.
      if (path.dirname(directory) !== safeRoot || !path.basename(directory).startsWith('export-')) {
        throw new Error('Unsafe export cleanup path');
      }
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
}
export function validateExportInput({ nodeId, script, sceneVideos, bgMusicPath }) {
  if (nodeId != null && (typeof nodeId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(nodeId))) {
    throw Object.assign(new Error('Invalid export node ID'), { status: 400 });
  }
  if (!script || !Array.isArray(sceneVideos) || !sceneVideos.length || sceneVideos.length > 30 || sceneVideos.some(url => typeof url !== 'string')) {
    throw Object.assign(new Error('Provide a script and 1–30 video URLs'), { status: 400 });
  }
  if (bgMusicPath) throw Object.assign(new Error('Server-local background music paths are not supported'), { status: 400 });
}
