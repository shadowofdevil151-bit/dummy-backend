import fs from "fs"

function cleanupFiles(filePaths) {
  if (!Array.isArray(filePaths)) return { deleted: [], failed: [] };

  const results = { deleted: [], skipped: [], failed: [] };

  filePaths.forEach((path) => {
    if (!path) {
      results.skipped.push(path);
      return;
    }

    try {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
        results.deleted.push(path);
      } else {
        results.skipped.push(path);
      }
    } catch (err) {
      results.failed.push({ path, error: err.message });
    }
  });

  return results;
}

export {cleanupFiles}