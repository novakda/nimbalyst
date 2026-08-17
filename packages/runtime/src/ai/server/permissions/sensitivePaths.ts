/**
 * Credential and config locations that must never be read or written without an
 * explicit prompt. Mirrors SafePathValidator.FORBIDDEN_PATHS in the Electron
 * main process; the list is duplicated rather than imported because runtime
 * cannot depend on electron. Keep the two in sync.
 *
 * Why this module exists: SafePathValidator governs only the Electron file
 * service and extension-agent tools. The coding agent's native Read/Glob/Grep/LS
 * never consult it, so under `allow-all` -- the mode the UI labels "Allow edits
 * only" -- a read of ~/.aws/credentials was auto-approved with no path check at
 * all. The documented guarantee that these paths are "always blocked" did not
 * hold on that path.
 *
 * These helpers do NOT hard-deny. Callers fall through to the normal permission
 * prompt, so a user who genuinely wants the access can still grant it.
 */

const SENSITIVE_PATH_SEGMENTS = [
  '.ssh',
  '.aws',
  '.gnupg',
  '.docker',
  '.kube',
  '.npmrc',
  '.gitconfig',
  '.netrc',
  '.env',
];

const SENSITIVE_PATH_PREFIXES = ['/etc/'];

export function extractToolTargetPath(input: any): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate =
    input.file_path ?? input.path ?? input.notebook_path ?? input.filePath ?? undefined;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
}

export function isSensitiveToolPath(rawPath: string | undefined): boolean {
  if (!rawPath) return false;
  const normalized = rawPath.replace(/\\/g, '/');
  if (SENSITIVE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  const segments = normalized.split('/').filter(Boolean);
  return segments.some((segment) => SENSITIVE_PATH_SEGMENTS.includes(segment));
}
