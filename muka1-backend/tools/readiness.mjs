// Read-only readiness inspection. This script never creates, updates or deletes a service or a row.
const required=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','MUKA1_BACKUP_KEY'];
const missing=required.filter(name=>!process.env[name]);
const report={ready:false,missing,checks:{},note:'No production mutations performed'};
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
async function api(path,body) {
 const response=await fetch('https://api.cloudflare.com/client/v4/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();
 if(!response.ok||!data.success)throw Error('Cloudflare access denied or unavailable (HTTP '+response.status+')');
 return data.result;
}
try {
 if(missing.length===0) {
  if(!/^[a-f0-9]{32}$/i.test(account))throw Error('Invalid account ID format');
  const databases=await api('accounts/'+account+'/d1/database?per_page=100');
  const game=databases.find(d=>d.name==='muka1-db');
  report.checks.gameDatabase=Boolean(game);
  report.checks.analyticsDatabase=databases.some(d=>d.name==='kontonkyo-analytics-db');
  const settings=await api('accounts/'+account+'/workers/scripts/muka1-api/settings');
  report.checks.existingAdminSecret=(settings.bindings||[]).some(b=>b.name==='ADMIN_TOKEN'&&b.type==='secret_text');
  report.checks.existingDatabaseBinding=(settings.bindings||[]).some(b=>b.name==='DB'&&b.type==='d1'&&b.id===game?.uuid);
  if(game) {
   // Only static SELECT statements are permitted in this inspection.
   const queries=["SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name","SELECT COUNT(*) AS n FROM votes","SELECT COUNT(*) AS n FROM submissions","SELECT COUNT(*) AS n FROM submissions WHERE status='approved'"];
   const results=[];
   for(const sql of queries){if(!/^SELECT /i.test(sql))throw Error('Read-only inspection violation');results.push(await api('accounts/'+account+'/d1/database/'+game.uuid+'/query',{sql,params:[]}));}
   const schema=results[0][0]?.results||[];
   report.checks.schemaObjects=schema.length;
   report.checks.votesCount=results[1][0]?.results?.[0]?.n;
   report.checks.submissionsCount=results[2][0]?.results?.[0]?.n;
   report.checks.approvedCount=results[3][0]?.results?.[0]?.n;
   const names=new Set(schema.map(r=>r.name));
   report.checks.expectedLegacyTables=['votes','submissions'].every(n=>names.has(n));
  }
  report.ready=Boolean(report.checks.gameDatabase&&report.checks.existingAdminSecret&&report.checks.existingDatabaseBinding&&report.checks.expectedLegacyTables);
 }
} catch(error){report.error=error.message;}
console.log(JSON.stringify(report,null,2));
