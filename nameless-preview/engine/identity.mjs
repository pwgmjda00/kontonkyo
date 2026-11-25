// Display identity only: persistent life IDs and save format remain unchanged.
export function identity(id){if(id==='hero')return '#000';const m=/^life-([1-9]\d*)$/.exec(id??'');return m?'#'+m[1].padStart(3,'0'):id;}
export function identityEnding(s){return s.endings?.includes('nameless')?'#000 → ∅　あなたを識別する必要は、もうない。':'';}
