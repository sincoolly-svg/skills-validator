import { ScanResult } from './static-scanner';

export type ReportFormat = 'text' | 'markdown' | 'json';

function pluralizeFindings(count: number): string {
  return `${count} finding${count === 1 ? '' : 's'}`;
}

export function renderReport(result: ScanResult, format: ReportFormat): string {
  if (format === 'json') return `${JSON.stringify(result, null, 2)}\n`;

  if (format === 'markdown') {
    const lines = [
      '# Skill Validator Report',
      '',
      `Source: \`${result.source}\``,
      '',
      `Result: **${pluralizeFindings(result.findings.length)}**`,
      ''
    ];
    if (result.findings.length === 0) {
      lines.push('No static-risk findings detected.');
    } else {
      lines.push('| Severity | Rule | Location | Message |', '| --- | --- | --- | --- |');
      for (const finding of result.findings) {
        lines.push(`| ${finding.severity.toUpperCase()} | \`${finding.ruleId}\` | \`${finding.file}:${finding.line}\` | ${finding.message} |`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  const lines = [`Skill Validator: ${result.source}`, `Result: ${pluralizeFindings(result.findings.length)}`];
  for (const finding of result.findings) {
    lines.push(`${finding.severity.toUpperCase()} ${finding.ruleId} ${finding.file}:${finding.line} - ${finding.message}`);
  }
  return `${lines.join('\n')}\n`;
}
