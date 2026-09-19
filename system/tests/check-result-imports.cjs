const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('src/modules/StudyResults/import-drafts.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', compiled)(loaded, loaded.exports);
const { splitDraft, mergeDrafts } = loaded.exports;
const range = (filename, row, sheet = 'Results') => ({ filename, sheet, rowStart: row, rowEnd: row, columnStart: 1, columnEnd: 2 });
const input = { title: 'Safety', type: 'table', sourceFilename: 'first.xlsx', description: 'Original description', reportSectionId: 'safety', content: {
  headers: ['Event', 'N'], rows: [['A', '1'], ['B', '2'], ['C', '3']],
  provenance: { header: [range('first.xlsx', 2)], rows: [3, 4, 5].map(row => [range('first.xlsx', row)]) },
} };
const original = JSON.stringify(input);
const split = splitDraft(input, 1, false);
assert.deepEqual(split.map(d => d.content.rows.length), [1, 2]);
assert.deepEqual(split[1].content.provenance.header, [range('first.xlsx', 2)]);
assert.deepEqual(split[1].content.provenance.rows, [[range('first.xlsx', 4)], [range('first.xlsx', 5)]]);
assert.match(split[1].sourceLocation, /rows 2–2.*rows 4–5/);
assert.equal(split[1].description, input.description);
assert.equal(split[1].reportSectionId, 'safety');
const merged = mergeDrafts(split);
assert.deepEqual(merged.content.rows, input.content.rows);
assert.match(merged.sourceLocation, /rows 2–5/);
assert.equal(JSON.stringify(input), original, 'Split/merge mutated the original provenance');
const promoted = splitDraft(input, 1, true);
assert.deepEqual(promoted[1].content.headers, ['B', '2']);
assert.deepEqual(promoted[1].content.provenance.header, [range('first.xlsx', 4)]);
assert.deepEqual(promoted[1].content.rows, [['C', '3']]);
assert.throws(() => splitDraft(input, 0, false), /Choose a split/);
assert.throws(() => splitDraft(input, 2, true), /needs a header/);
const other = { ...input, sourceFilename: 'second.csv', content: { headers: ['Different'], rows: [['D']], provenance: {
  header: [{ ...range('second.csv', 1, undefined), columnEnd: 1 }], rows: [[{ ...range('second.csv', 2, undefined), columnEnd: 1 }]],
} } };
const different = mergeDrafts([input, other]);
assert.deepEqual(different.content.rows.slice(-2), [['Different', ''], ['D', '']]);
assert.equal(different.sourceFilename, 'first.xlsx; second.csv');
assert.match(different.sourceLocation, /first.xlsx/);
assert.match(different.sourceLocation, /second.csv/);
const resplit = splitDraft(different, 3, true);
assert.deepEqual(resplit[1].content.headers, ['Different', '']);
assert.deepEqual(resplit[1].content.rows, [['D', '']]);
assert.equal(resplit[1].sourceFilename, 'second.csv');
console.log('PASS: split, header promotion, merge, unequal headers, multiple sources, re-split, and provenance preservation');
