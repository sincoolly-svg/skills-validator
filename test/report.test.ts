import { describe, expect, it } from 'vitest';
import { renderReport } from '../src/report';

const result = {
  source: 'example-skill',
  findings: [{
    ruleId: 'sensitive-environment',
    severity: 'warning' as const,
    file: 'runner.js',
    line: 4,
    message: 'Reads a value from the process environment.'
  }]
};

describe('renderReport', () => {
  it('renders valid JSON without source contents', () => {
    const output = renderReport(result, 'json');
    expect(JSON.parse(output)).toEqual(result);
    expect(output).not.toContain('process.env');
  });

  it('renders a readable Markdown summary', () => {
    const output = renderReport(result, 'markdown');
    expect(output).toContain('# Skill Validator Report');
    expect(output).toContain('example-skill');
    expect(output).toContain('sensitive-environment');
    expect(output).toContain('runner.js:4');
  });

  it('renders a concise terminal summary', () => {
    const output = renderReport(result, 'text');
    expect(output).toContain('example-skill');
    expect(output).toContain('1 finding');
    expect(output).toContain('WARNING');
  });
});
