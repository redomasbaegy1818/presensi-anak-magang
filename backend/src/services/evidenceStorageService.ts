import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const BACKEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function resolveStorageRoot(): string {
  return path.isAbsolute(env.EVIDENCE_STORAGE_DIR)
    ? path.resolve(env.EVIDENCE_STORAGE_DIR)
    : path.resolve(BACKEND_ROOT, env.EVIDENCE_STORAGE_DIR);
}

function resolveSafeEvidencePath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes('\0') || path.isAbsolute(storageKey)) {
    return null;
  }

  const storageRoot = resolveStorageRoot();
  const resolved = path.resolve(storageRoot, storageKey);
  if (
    resolved === storageRoot ||
    !resolved.startsWith(`${storageRoot}${path.sep}`)
  ) {
    return null;
  }
  return resolved;
}

export interface SavedEvidenceFile {
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
}

/**
 * Saves attendance photo evidence privately outside any public webroot.
 */
export async function savePrivateEvidenceFile(
  buffer: Buffer,
  mimeType: string,
  dateStr: string,
): Promise<SavedEvidenceFile> {
  const ext = MIME_TO_EXT[mimeType] ?? 'jpg';
  const monthFolder = dateStr.slice(0, 7);
  const filename = `${randomUUID()}.${ext}`;
  const storageKey = `${monthFolder}/${filename}`;

  const storageRoot = resolveStorageRoot();
  const targetDir = path.join(storageRoot, monthFolder);
  const targetPath = path.join(targetDir, filename);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return {
    storageKey,
    mimeType,
    fileSizeBytes: buffer.byteLength,
  };
}

export async function deletePrivateEvidenceFile(storageKey: string): Promise<void> {
  const fullPath = resolveSafeEvidencePath(storageKey);
  if (!fullPath) {
    return;
  }
  await fs.unlink(fullPath).catch(() => undefined);
}

export async function readPrivateEvidenceFile(
  storageKey: string,
): Promise<Buffer | null> {
  const fullPath = resolveSafeEvidencePath(storageKey);
  if (!fullPath) {
    return null;
  }
  try {
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}
