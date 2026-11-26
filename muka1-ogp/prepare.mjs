import {readFile,writeFile} from 'node:fs/promises';
const src=await readFile('../muka1-preview/phrases.js','utf8');
const match=src.match(/Object\.freeze\((\{[\s\S]*\})\)/);
if(!match)throw Error('phrase data missing');
await writeFile('phrases.json',JSON.stringify(JSON.parse(match[1])));
const response=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf');
if(!response.ok)throw Error('font download failed');
await writeFile('font.ttf',new Uint8Array(await response.arrayBuffer()));
