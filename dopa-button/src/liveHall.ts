/** Public GitHub Issues are the submission database.
 * Reading this directly (on opening the hall) removes the approval and
 * publication-deploy steps. Static daily snapshots are an offline fallback.
 */
export const HALL_API='https://api.github.com/repos/pwgmjda00/kontonkyo/issues?state=open&sort=created&direction=desc&per_page=100';
export const HALL_ISSUE='https://github.com/pwgmjda00/kontonkyo/issues/';
export interface HallEntry {issue:number;nickname:string;badge:string;message:string;mode:string;url:string}
export interface HallDay {date:string;entries:HallEntry[]}
export interface PublicIssue {
  number?:unknown;
  title?:unknown;
  state?:unknown;
  body?:unknown;
  html_url?:unknown;
  created_at?:unknown;
  labels?:unknown;
  pull_request?:unknown;
  user?:unknown;
}
const label=(body:string,name:string):string=>{
  const needle='### '+name;
  const at=body.indexOf(needle);
  if(at<0)return '';
  const start=at+needle.length;
  const next=body.indexOf('\n### ',start);
  return body.slice(start,next<0?undefined:next).trim();
};
const clean=(raw:string,max:number):string=>
  [...raw.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()].slice(0,max).join('');
const dangerous=(value:string)=>/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/i.test(value);
function asIssue(value:unknown):PublicIssue|null{
  if(!value||typeof value!=='object')return null;
  return value as PublicIssue;
}
export function japanDay(iso:string):string {
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime()))throw Error('Invalid date');
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function parsePublicHallIssue(raw:unknown):{entry:HallEntry;date:string}|null{
  const item=asIssue(raw);
  if(!item||!Number.isSafeInteger(item.number)||Number(item.number)<1
      ||item.state!=='open'||typeof item.title!=='string'
      ||!item.title.startsWith('[ドパ殿堂応募]')
      ||item.html_url!==HALL_ISSUE+item.number
      ||item.pull_request ||typeof item.body!=='string'
      ||typeof item.created_at!=='string')return null;
  const labels=Array.isArray(item.labels)?item.labels:[];
  if(labels.some(v=>v&&typeof v==='object'&&'name' in v&&(v as {name:unknown}).name==='dopa-hall-hide'))return null;
  const consent=label(item.body,'同意');
  if(!/-\s*\[x\]/i.test(consent))return null;
  const nickname=clean(label(item.body,'公開ニックネーム'),16);
  const message=clean(label(item.body,'ひと言'),60);
  const badge=clean(label(item.body,'飾りたい称号'),25);
  const kind=clean(label(item.body,'好きなモード'),15);
  if(!nickname||!message||nickname==='_No response_'||message==='_No response_'||dangerous(nickname+' '+message))return null;
  let date:string;
  try{date=japanDay(item.created_at);}catch{return null;}
  return {date,entry:{
    issue:Number(item.number),nickname,
    badge:badge==='_No response_'?'':badge,
    message,mode:['🟠 パチンコ','🪙 パチスロ','🎭 どっちも'].includes(kind)?kind:'🎭 どっちも',
    url:String(item.html_url),
  }};
}
export function assembleHall(issues:readonly unknown[],now=new Date()):HallDay[]{
  const today=japanDay(now.toISOString());
  const todayTimestamp=Date.parse(today+'T00:00:00Z');
  const groups=new Map<string,HallEntry[]>();
  const issueIds=new Set<number>();
  const seenNames=new Set<string>();
  for(const raw of issues){
    const parsed=parsePublicHallIssue(raw);
    if(!parsed)continue;
    const {date,entry}=parsed;
    const age=Math.floor((todayTimestamp-Date.parse(date+'T00:00:00Z'))/86400000);
    if(age<0||age>=30||issueIds.has(entry.issue))continue;
    issueIds.add(entry.issue);
    const key=date+'|'+entry.nickname.toLocaleLowerCase('ja');
    if(seenNames.has(key))continue;
    const day=groups.get(date)??[];
    if(day.length>=20)continue;
    day.push(entry);
    groups.set(date,day);
    seenNames.add(key);
  }
  return [...groups].sort((a,b)=>b[0].localeCompare(a[0])).map(([date,entries])=>({
    date,entries:entries.sort((a,b)=>b.issue-a.issue),
  }));
}
export async function fetchPublicHall(signal?:AbortSignal):Promise<HallDay[]>{
  const response=await fetch(HALL_API,{signal,cache:'no-store',headers:{'Accept':'application/vnd.github+json'}});
  if(!response.ok)throw new Error(response.status===403?'GitHubの閲覧回数制限に達しました':'殿堂の取得に失敗しました');
  const value:unknown=await response.json();
  if(!Array.isArray(value))throw new Error('殿堂のデータ形式を確認できませんでした');
  return assembleHall(value);
}
