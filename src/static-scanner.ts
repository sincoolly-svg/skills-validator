import { promises as fs } from 'node:fs';
import path from 'node:path';

export type FindingSeverity = 'error' | 'warning';

export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  file: string;
  line: number;
  message: string;
}

export interface ScanResult {
  source: string;
  findings: Finding[];
}

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist']);
const downloadAndExecute = /(?:curl|wget)\b[^|\r\n]*\|\s*(?:sh|bash|zsh)\b|(?:invoke-webrequest|iwr)\b[^|\r\n]*\|\s*(?:iex|invoke-expression)\b/i;
const sensitiveEnvironmentAccess = /\b(?:process\.env(?:\.[A-Za-z_][A-Za-z0-9_]*|\[['"][^'"\]]+['"]\])|\$env:[A-Za-z_][A-Za-z0-9_]*|os\.environ(?:\[[^\]]+\]|\.get\())/i;
const sensitivePathAccess = /(?:~?[/\\]\.ssh[/\\]|\.aws[/\\]credentials|id_(?:rsa|ed25519)|[/\\]etc[/\\](?:passwd|shadow)|\.npmrc|\.git-credentials)/i;
const networkRequest = /\b(?:fetch|axios\.(?:get|post|put|patch|request)|https?\.(?:get|request))\s*\(|\b(?:curl|wget)\b/i;
const dependencyInstall = /\b(?:npm|pnpm|yarn)\s+(?:install|add)\b|\b(?:pip|pip3)\s+install\b|\b(?:gem|cargo|go)\s+install\b/i;
const pathTraversalWrite = /\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|mkdir(?:Sync)?|copyFile(?:Sync)?|rename(?:Sync)?)\s*\([^)]*['"][^'"]*(?:\.\.[/\\])|(?:>|out-file|set-content)\s+['"]?\.\.[/\\]/i;
const destructiveCommand = /\brm\s+-[^\r\n]*r|\brmdir\s+\/s|\bdel\s+\/s|\bremove-item\s+[^\r\n]*-recurse|\bformat\s+[a-z]:/i;
const environmentAssignment = /^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:process\.env(?:\.[A-Za-z_][A-Za-z0-9_]*|\[['"][^'"\]]+['"]\])|\$env:[A-Za-z_][A-Za-z0-9_]*|os\.environ(?:\[[^\]]+\]|\.get\())/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listFiles(root: string, current = ''): Promise<string[]> {
  const directory = path.join(root, current);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const relativePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...await listFiles(root, relativePath));
      continue;
    }
    if (entry.isFile() && !entry.name.startsWith('.env')) files.push(relativePath);
  }

  return files;
}

function hasValidSkillManifest(content: string): boolean {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return false;

  const frontmatterEnd = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (frontmatterEnd === -1) return false;

  const frontmatter = lines.slice(1, frontmatterEnd).join('\n');
  return /^name:\s*\S+/m.test(frontmatter) && /^description:\s*\S+/m.test(frontmatter);
}

export async function scanDirectory(directory: string): Promise<ScanResult> {
  const root = path.resolve(directory);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new Error('Scan target must be a directory');

  const findings: Finding[] = [];
  for (const relativePath of await listFiles(root)) {
    const content = await fs.readFile(path.join(root, relativePath), 'utf8');
    const normalizedFile = relativePath.split(path.sep).join('/');
    if (path.extname(relativePath).toLowerCase() === '.json') {
      try {
        JSON.parse(content);
      } catch {
        findings.push({
          ruleId: 'invalid-configuration',
          severity: 'error',
          file: normalizedFile,
          line: 1,
          message: 'JSON configuration cannot be parsed.'
        });
      }
    }
    if (path.basename(relativePath).toLowerCase() === 'skill.md' && !hasValidSkillManifest(content)) {
      findings.push({
        ruleId: 'invalid-manifest',
        severity: 'error',
        file: normalizedFile,
        line: 1,
        message: 'SKILL.md must include YAML frontmatter with name and description.'
      });
    }
    const lines = content.split(/\r?\n/);
    const environmentVariables = new Set<string>();
    lines.forEach((line, index) => {
      const environmentAssignmentMatch = line.match(environmentAssignment);
      if (environmentAssignmentMatch) environmentVariables.add(environmentAssignmentMatch[1]);
      if (downloadAndExecute.test(line)) {
        findings.push({
          ruleId: 'download-and-execute',
          severity: 'error',
          file: normalizedFile,
          line: index + 1,
          message: 'Downloads remote content and immediately executes it.'
        });
      }
      if (sensitiveEnvironmentAccess.test(line)) {
        findings.push({
          ruleId: 'sensitive-environment',
          severity: 'warning',
          file: normalizedFile,
          line: index + 1,
          message: 'Reads a value from the process environment.'
        });
      }
      if (sensitivePathAccess.test(line)) {
        findings.push({
          ruleId: 'sensitive-path',
          severity: 'warning',
          file: normalizedFile,
          line: index + 1,
          message: 'Accesses a path commonly used for credentials or private keys.'
        });
      }
      const carriesEnvironmentValue = sensitiveEnvironmentAccess.test(line) || [...environmentVariables]
        .some((variable) => new RegExp(`\\b${escapeRegExp(variable)}\\b`).test(line));
      if (networkRequest.test(line) && carriesEnvironmentValue) {
        findings.push({
          ruleId: 'network-exfiltration',
          severity: 'error',
          file: normalizedFile,
          line: index + 1,
          message: 'Sends a process environment value through a network request.'
        });
      }
      if (dependencyInstall.test(line)) {
        findings.push({
          ruleId: 'dependency-install',
          severity: 'warning',
          file: normalizedFile,
          line: index + 1,
          message: 'Installs a dependency from a script or command.'
        });
      }
      if (pathTraversalWrite.test(line)) {
        findings.push({
          ruleId: 'path-traversal-write',
          severity: 'error',
          file: normalizedFile,
          line: index + 1,
          message: 'Writes to a path outside the skill directory.'
        });
      }
      if (destructiveCommand.test(line)) {
        findings.push({
          ruleId: 'destructive-command',
          severity: 'error',
          file: normalizedFile,
          line: index + 1,
          message: 'Contains a recursive delete or destructive system command.'
        });
      }
    });
  }

  return { source: path.basename(root), findings };
}
