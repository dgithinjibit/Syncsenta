const fs   = require('fs');
const path = require('path');
const lib  = 'C:/Users/hp/codes/Ascendra/studio/src/lib';
const modules = ['sandbox','curriculum','chat','progress','session','teacher','telemetry'];

let issues = [];

modules.forEach(function(mod) {
  fs.readdirSync(path.join(lib, mod)).forEach(function(file) {
    if (file === 'index.ts') return;
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
    var content = fs.readFileSync(path.join(lib, mod, file), 'utf8');
    var lines = content.split('\n');
    lines.forEach(function(line, i) {
      if (line.indexOf("from '") !== -1 || line.indexOf('from "') !== -1) {
        if (line.indexOf('../..') !== -1) {
          issues.push(mod + '/' + file + ':' + (i+1) + ' | ' + line.trim());
        }
        if (line.indexOf('/lib/lib/') !== -1) {
          issues.push(mod + '/' + file + ':' + (i+1) + ' | ' + line.trim());
        }
      }
    });
  });
});

if (issues.length === 0) {
  console.log('No obvious relative import issues found in moved files.');
} else {
  console.log('ISSUES:');
  issues.forEach(function(i) { console.log('  ' + i); });
}
