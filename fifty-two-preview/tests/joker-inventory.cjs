'use strict';
/* Read-only inventory. Never equate game count with JOKER support count. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['index.html','jokers.html','joker-test.html'].includes(f)).sort();
const hub=fs.readFileSync(path.join(root,'index.html'),'utf8');
const embedded=(hub.match(/(?:name|title)\s*:\s*['"`][^'"`]+['"`]/g)||[]);
const rows=pages.map(file=>{
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const bridge=source.includes('joker-score-mode.js')&&source.includes('FiftyTwoJokerScoreMode.create');
 const actions=source.includes('joker-actions.js')&&source.includes('FiftyTwoJokerActions');
 const legacy=source.includes('FiftyTwoJokers')&&!bridge;
 return {game:file.replace(/\.html$/,''),bridge,actions,legacy};
});
assert.equal(rows.length,72,'Expected 72 standalone games');
console.log('FIFTY-TWO JOKER source audit: 72 standalone + 5 hub games = 77');
console.log('Standalone bridge:',rows.filter(r=>r.bridge).length,'action hooks:',rows.filter(r=>r.actions).length);
console.log('Not bridged:',rows.filter(r=>!r.bridge).map(r=>r.game).join(', ')||'none');
console.log('Legacy JOKER references:',rows.filter(r=>r.legacy).map(r=>r.game).join(', ')||'none');
console.log('Hub games require separate manual verification; do not count them as supported by this audit.');
