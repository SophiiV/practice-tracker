import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('DOCX: preserve university forms, captions, rows, typography and long content', () => {
  const script = fileURLToPath(new URL('./document_layout_test.py', import.meta.url));
  const result = spawnSync(process.env.PYTHON_BIN || 'python3', [script], {
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
