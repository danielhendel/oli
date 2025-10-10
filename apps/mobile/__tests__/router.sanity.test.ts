import path from 'path';
test('app directory exists', () => {
  const p = path.resolve(__dirname, '..', 'app', '_layout.tsx');
  expect(require('fs').existsSync(p)).toBe(true);
});
