import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { glob } from 'glob';
import type {
  Connector,
  ConnectorScanResult,
  ScanOptions,
  ValidationResult,
} from '../../types/connector.js';
import type { SourceMetadata } from '../../types/source.js';
import { validateLocalPath } from '../base-connector.js';
import { pathExists } from '../../utils/filesystem.js';
import { DEFAULT_CONFIG, SUPPORTED_LANGUAGES } from '../../config/defaults.js';
import { parseFile } from './git-parser.js';
import { groupIntoFeatures } from './git-feature-extractor.js';
import { logger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

async function getGitInfo(
  repoPath: string,
): Promise<{ sha: string; remoteUrl: string | null }> {
  try {
    const { stdout: sha } = await execFileAsync(
      'git',
      ['rev-parse', 'HEAD'],
      { cwd: repoPath },
    );

    let remoteUrl: string | null = null;
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['remote', 'get-url', 'origin'],
        { cwd: repoPath },
      );
      remoteUrl = stdout.trim();
    } catch {
      // No remote configured
    }

    return { sha: sha.trim(), remoteUrl };
  } catch {
    return { sha: '', remoteUrl: null };
  }
}

function buildGlobPattern(): string {
  const extensions = [...SUPPORTED_LANGUAGES.values()]
    .flat()
    .map((ext) => ext.slice(1)); // Remove leading dot
  return `**/*.{${extensions.join(',')}}`;
}

export function createGitConnector(): Connector {
  return {
    type: 'git',
    name: 'Git Repository',

    async validate(target: string): Promise<ValidationResult> {
      const pathResult = await validateLocalPath(target);
      if (!pathResult.valid) return pathResult;

      const gitDir = resolve(target, '.git');
      if (!(await pathExists(gitDir))) {
        return {
          valid: false,
          errors: [`Not a git repository: ${target}`],
        };
      }

      return { valid: true, errors: [] };
    },

    async scan(
      target: string,
      options: ScanOptions,
    ): Promise<ConnectorScanResult> {
      const absPath = resolve(target);
      const userExcludes = options.exclude ?? [];
      const exclude = [
        ...(DEFAULT_CONFIG.scanOptions.exclude ?? []),
        ...userExcludes,
      ].map((e) => `${e}/**`);

      const files = await glob(buildGlobPattern(), {
        cwd: absPath,
        absolute: true,
        ignore: exclude,
      });

      logger.info(`Found ${files.length} source files to parse`);

      const parsedFiles = (
        await Promise.all(files.map((f) => parseFile(f)))
      ).filter((f) => f !== null);

      logger.info(
        `Parsed ${parsedFiles.length} files with code elements`,
      );

      const rawFeatures = groupIntoFeatures(parsedFiles, absPath);

      return { rawFeatures };
    },

    async getSourceMetadata(target: string): Promise<SourceMetadata> {
      const absPath = resolve(target);
      const { sha, remoteUrl } = await getGitInfo(absPath);

      return {
        url: remoteUrl ?? absPath,
        type: 'git',
        lastIndexedAt: new Date().toISOString(),
        version: sha || undefined,
      };
    },
  };
}
