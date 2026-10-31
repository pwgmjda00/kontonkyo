import {describe,expect,it} from 'vitest';
import {assembleHall,japanDay,parsePublicHallIssue} from './liveHall';
const sample=(id=123,when='2026-10-31T00:30:00Z')=>({
  number:id,html_url:'https://github.com/pwgmjda00/kontonkyo/issues/'+id,
  title:'[ドパ殿堂応募] ドパ王',state:'open',created_at:when,
  labels:[],user:{login:'tester',type:'User'},
  body:[
    '### 公開ニックネーム','', 'ドパ王'+id,'',
    '### 好きなモード','', '🟠 パチンコ','',
    '### 飾りたい称号','', '🎉 最初の一撃','',
    '### ひと言','', '今日もPUSHが止まらん！','',
    '### 同意','', '- [X] このニックネーム・称号・ひと言を公開サイトに掲載してよい',
  ].join('\n'),
});
describe('Immediate public Dopa hall',()=>{
  it('publishes opted-in entries without human approval',()=>{
    const entry=parsePublicHallIssue(sample());
    expect(entry?.entry.nickname).toBe('ドパ王123');
    expect(entry?.entry.badge).toContain('最初の一撃');
    expect(entry?.date).toBe('2026-10-31');
  });
  it('does not publish closed, hidden, consentless, malformed or external submissions',()=>{
    const original=sample();
    expect(parsePublicHallIssue({...original,state:'closed'})).toBeNull();
    expect(parsePublicHallIssue({...original,labels:[{name:'dopa-hall-hide'}]})).toBeNull();
    expect(parsePublicHallIssue({...original,body:original.body.replace('- [X]','- [ ]')})).toBeNull();
    expect(parsePublicHallIssue({...original,html_url:'https://evil.example/123'})).toBeNull();
    expect(parsePublicHallIssue({...original,pull_request:{url:'x'}})).toBeNull();
    expect(parsePublicHallIssue({...original,title:'an unrelated issue'})).toBeNull();
    expect(parsePublicHallIssue({...original,body:original.body.replace('今日もPUSHが止まらん！','https://evil.example')})).toBeNull();
    expect(parsePublicHallIssue({...original,created_at:'invalid'})).toBeNull();
  });
  it('groups by Japanese day and truncates oversized text',()=>{
    expect(japanDay('2026-10-31T15:01:00Z')).toBe('2026-11-01');
    const original=sample();
    const item={...original,body:original.body.replace('今日もPUSHが止まらん！','😎'.repeat(200))};
    const out=parsePublicHallIssue(item);
    expect([...out!.entry.message].length).toBe(60);
  });
  it('does not duplicate issues, caps at twenty profiles per day, excludes old entries',()=>{
    const today=new Date('2026-10-31T15:10:00Z'); // Nov 1 JST
    const entries=Array.from({length:30},(_,i)=>sample(100+i,'2026-10-31T15:05:00Z'));
    const archive=sample(7,'2026-09-05T12:00:00Z');
    const result=assembleHall([...entries,...entries,archive],today);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-11-01');
    expect(result[0].entries).toHaveLength(20);
    expect(new Set(result[0].entries.map(x=>x.issue)).size).toBe(20);
  });
});
