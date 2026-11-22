import ts from 'typescript';
import fs from 'node:fs';
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const host = {
  getScriptFileNames: () => parsed.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: (f) =>
    fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};
const service = ts.createLanguageService(host);
for (const f of parsed.fileNames.filter((f) => f.includes('/src/'))) {
  const changes = service.organizeImports({ type: 'file', fileName: f }, {}, {});
  for (const c of changes) {
    let content = fs.readFileSync(c.fileName, 'utf8');
    for (const t of c.textChanges.sort((a, b) => b.span.start - a.span.start))
      content =
        content.slice(0, t.span.start) + t.newText + content.slice(t.span.start + t.span.length);
    fs.writeFileSync(c.fileName, content);
  }
}
service.dispose();
