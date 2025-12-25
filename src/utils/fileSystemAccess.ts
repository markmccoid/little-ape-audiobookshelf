import { Directory, File, Paths } from "expo-file-system";
import ReactNativeBlobUtil from "react-native-blob-util";

// Clean the filename. Replace any non word chars or . with underscore.
export const getCleanFileName = (filename: string) =>
  filename.replace(/[^\w.]+/g, "_").replace(/_$/, "");

// ------------------------------------------------------------
// Read directory
// ------------------------------------------------------------
export const readFileSystemDir = async (dirName = ""): Promise<string[]> => {
  const base = Paths.document;
  const dir = dirName ? new Directory(base, dirName) : new Directory(base);

  try {
    const entries = await dir.list();
    return entries.map((e) => e.name ?? "");
  } catch (e) {
    console.log("Error reading directory:", e);
    return [];
  }
};

// ------------------------------------------------------------
// Delete file or directory
// ------------------------------------------------------------

export const deleteFromFileSystem = (filename?: string) => {
  if (!filename) return;

  try {
    // Construct file path using document directory as base
    const file = new File(Paths.document, filename);

    // If it's a file → delete it
    if (file.exists) {
      file.delete();
      console.log(`File deleted: ${file.uri}`);
      return;
    }

    // If not a file, try as directory (recursive delete)
    // const dir = new Directory(Paths.document, filename);

    // if (dir.exists) {
    //   dir.delete(); // deletes directory + all contents recursively
    //   console.log(`Directory deleted: ${dir.uri}`);
    //   return;
    // }

    console.log(`Nothing found to delete at: ${filename}`);
  } catch (error) {
    console.error("Delete operation failed:", error);
  }
};

// ------------------------------------------------------------
// Download a file
// ------------------------------------------------------------
export const downloadToFileSystem = async (
  downloadLink: string,
  filename: string,
  dirName = ""
) => {
  const cleanFileName = getCleanFileName(filename);
  const base = Paths.document;

  const destinationDir = dirName ? new Directory(base, dirName) : new Directory(base);

  try {
    destinationDir.create(); // safe even if exists
  } catch {}

  // Write into a specific file
  const destinationFile = new File(destinationDir, cleanFileName);

  try {
    const file = await File.downloadFileAsync(downloadLink, destinationFile);
    return { uri: file.uri, cleanFileName };
  } catch (e) {
    throw new Error(`downloadToFileSystem failed: ${e}`);
  }
};

/**
 * Downloads a file using react-native-blob-util so we can get progress & cancel.
 *
 * @param downloadLink string | { url: string; authHeader?: Record<string,string> } - link or ABS object
 * @param filename desired filename (will be cleaned)
 * @param progress callback (received, total)
 * @returns { task, cancelDownload, cleanFileName, fileUri }
 */
export const downloadFileBlob = (
  downloadLink: { url: string; authHeader?: Record<string, string>; libraryItemId: string },
  filename: string,
  progress: (received: number, total: number) => void
) => {
  // Clean filename
  // const getCleanFileName = (fn: string) => fn.replace(/[^\w.]+/g, "_").replace(/_$/, "");
  const cleanFileNameOnly = getCleanFileName(filename);
  const cleanFileName = `${downloadLink.libraryItemId}_${cleanFileNameOnly}`;

  // react-native-blob-util dirs (native paths, NO file:// prefix)
  const dirs = ReactNativeBlobUtil.fs.dirs;
  const blobTargetPath = `${dirs.DocumentDir}/${cleanFileName}`; // e.g. /data/user/0/.../files/<name>

  // For systems that expect a file:// URI (expo APIs), provide:
  // Try to create a file:// uri using Paths.document if available, else fallback
  // Paths.document often is 'file:///...' — to be safe, assemble file:// + relative name if possible
  let fileUri = `file://${blobTargetPath}`; // reliable for most consumers

  // Prepare headers
  let includeHeaders: Record<string, string> | undefined = downloadLink.authHeader;

  const downloadUri = downloadLink.url;

  // Blob config - write to native path (no file://)
  const config = {
    // path must be native path without "file://"
    path: blobTargetPath,
    // overwrite: true // not a formal option here; blob will overwrite existing file at same path
  };

  // Start fetch
  const task = ReactNativeBlobUtil.config(config).fetch("GET", downloadUri, includeHeaders);

  // Cancel function
  const cancelDownload = async () => {
    try {
      await task.cancel();
    } catch (e) {
      // swallow cancel errors
    }
  };

  // Throttled progress reporting
  let lastUpdateTime = 0;
  const updateInterval = 100; // ms
  task.progress({ interval: 120 }, (received: number, total: number) => {
    const now = Date.now();
    if (now - lastUpdateTime >= updateInterval) {
      lastUpdateTime = now;
      // use rAF to avoid jank
      requestAnimationFrame(() => {
        try {
          progress(received, total);
        } catch (e) {
          // ignore progress handler errors
        }
      });
    }
  });

  // Return the active task and helpers. Consumers can await task.catch / task.then as needed.
  return {
    task, // the blob-util fetch task (has .cancel(), .progress(), .then(), .catch())
    cancelDownload,
    cleanFileName,
    // fileUri is file://... which is handy for expo APIs (Audio, File, etc.)
    fileUri,
    // native path without file:// in case callers want the raw path blob wrote to
    nativePath: blobTargetPath,
  };
};

// ------------------------------------------------------------
// Calculate Global Progress of group of downloads
// Each Library Item can have multiple files to download and we
// download them one at a time in a batch, this will calculate
// the global progress of the batch.
// ------------------------------------------------------------
export const calculateGlobalProgress = (
  numberOfFilesDownloaded: number,
  numberOfFiles: number,
  received: number,
  total: number,
  downloadCompleted: boolean
) => {
  // console.log("TOTS", downloadCompleted, numberOfFiles, numberOfFilesDownloaded, received, total);
  if (downloadCompleted) return 100;
  const slotSize = Math.round(100 / numberOfFiles);
  const fileFillAmount = Math.round(slotSize * (received / total));
  const finishedUpToAmount = Math.round((numberOfFilesDownloaded - 1) * slotSize);

  const totalFillAmount = Math.round(finishedUpToAmount + fileFillAmount);

  return Math.min(totalFillAmount, 100);
};
// ------------------------------------------------------------
// Check file OR directory
// ------------------------------------------------------------
export const fileOrDirectory = async (fullPath: string) => {
  // Try Directory first
  try {
    const dir = new Directory(fullPath);
    const list = await dir.list(); // will throw if not directory
    return { exists: true, isDirectory: true };
  } catch {}

  // Try File
  try {
    const file = new File(fullPath);
    const stat = await file.stat(); // will throw if not file
    return { exists: true, isDirectory: false };
  } catch {}

  return { exists: false, isDirectory: false };
};
