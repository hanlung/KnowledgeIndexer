import type { ValidationResult } from '../types/connector.js';
import { pathExists, isDirectory } from '../utils/filesystem.js';

export async function validateLocalPath(
  target: string,
): Promise<ValidationResult> {
  if (!(await pathExists(target))) {
    return { valid: false, errors: [`Path does not exist: ${target}`] };
  }

  if (!(await isDirectory(target))) {
    return { valid: false, errors: [`Path is not a directory: ${target}`] };
  }

  return { valid: true, errors: [] };
}
