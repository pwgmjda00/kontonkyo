'use strict';
/* Read-only inventory. Never equate game count with JOKER support count. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['index.html','jokers.html','joker-test.html'].includes(f)).sort();
const hub=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hubIds=['tombstone','accomplice','thirteenth-hour','four-kingdoms','oblivion'];
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
const hubBridge=hub.includes('joker-score-mode.js')&&hub.includes('FiftyTwoJokerScoreMode.create')&&hubIds.every(id=>hub.includes("'"+id+"'"));
const hubActions=hub.includes('joker-actions.js')&&hub.includes('FiftyTwoJokerActions');
const supported=rows.filter(r=>r.bridge).length+(hubBridge?5:0);
console.log('Hub JOKER bridge:',hubBridge?'5/5 wired':'not fully wired','action hooks:',hubActions?'present':'missing');
console.log('TOTAL SOURCE-WIRED:',supported+'/77','(not a substitute for interaction tests)');
assert.equal(rows.length+hubIds.length,77,'Game inventory must equal 77');
