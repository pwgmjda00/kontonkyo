import { EVENTS, EVENT_BY_ID } from './probability';
import type { ProbabilityEvent, ProbabilityWorkerResponse, AnimationId } from './probability';
import type { Mode } from './records';
export type Phase = 'READY'|'COUNTDOWN'|'ROUND'|'GAP'|'DRAWING'|'BONUS'|'PAUSED'|'GAME_OVER';
export interface Bonus { kind:'actual'|'theater'|'casual'|'preview'; theme:AnimationId; event:ProbabilityEvent|null; tier:'super'|'hot'|'normal'|null }
export interface GameState { phase:Phase;mode:Mode;score:number;prompt:'go'|'stop';remainingMs:number;roundMs:number;countdown:number;bonus:Bonus|null;token:number;error:string|null;lastDrawMs:number }
interface Success {mode:Mode;score:number;wasStop:boolean;hits:ProbabilityEvent[]}
interface Options {roll:()=>Promise<ProbabilityWorkerResponse>;rollGaming:()=>Promise<ProbabilityWorkerResponse>;onPlay?:(mode:Mode)=>void;onSuccess?:(result:Success)=>void;onGameOver?:(result:{mode:Mode;score:number})=>void;now?:()=>number;randomGo?:()=>boolean}
interface Target {phase:Phase;remaining:number;bonus:Bonus|null}
const eligible=EVENTS.filter(e=>e.bonusEligible);
const initial=():GameState=>({phase:'READY',mode:'normal',score:0,prompt:'go',remainingMs:1500,roundMs:1500,countdown:3,bonus:null,token:0,error:null,lastDrawMs:0});
export class GameController {
 private value=initial();private listeners=new Set<()=>void>();private deadline=0;private target:Target|null=null;private previewReturn:Phase|null=null;private effects=true;private generation=0;private dead=false;
 constructor(private options:Options){}
 get state():GameState{return this.value;}
 getInputToken(){return this.value.token;}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private now(){return this.options.now?.()??performance.now();}
 private update(patch:Partial<GameState>){if(this.dead)return;this.value={...this.value,...patch};this.listeners.forEach(fn=>fn());}
 private phase(phase:Phase,patch:Partial<GameState>={}){this.update({...patch,phase,token:this.value.token+1});}
 setMode(mode:Mode){if(!['normal','dopa','gaming'].includes(mode)||!['READY','GAME_OVER'].includes(this.value.phase))return false;this.update({mode});return true;}
 setEffectsEnabled(enabled:boolean){this.effects=enabled;}
 private countdown(now:number,target:Target){this.target=target;this.deadline=now+900;this.phase('COUNTDOWN',{remainingMs:900,countdown:3,bonus:null});}
 private nextRound(now:number){const word=new Uint32Array(1);const go=this.options.randomGo?this.options.randomGo():((crypto.getRandomValues(word)[0]!&1)===0);const duration=Math.max(700,1500-this.value.score*25);this.deadline=now+duration;this.phase('ROUND',{prompt:go?'go':'stop',roundMs:duration,remainingMs:duration,bonus:null,countdown:0});}
 press(now=this.now(),token?:number){
  if(this.dead||(token!==undefined&&token!==this.value.token))return;
  if(['READY','GAME_OVER'].includes(this.value.phase)){this.generation++;this.previewReturn=null;this.target=null;this.update({score:0,error:null,bonus:null});this.options.onPlay?.(this.value.mode);this.countdown(now,{phase:'ROUND',remaining:0,bonus:null});return;}
  if(this.value.phase!=='ROUND')return;
  if(now>=this.deadline){if(this.value.prompt==='stop')this.success(now);else this.fail();return;}
  if(this.value.prompt==='go')this.success(now);else this.fail();
 }
 private fail(){this.phase('GAME_OVER',{remainingMs:0,bonus:null});this.options.onGameOver?.({mode:this.value.mode,score:this.value.score});}
 private success(now:number){
  if(this.value.phase!=='ROUND')return;
  const wasStop=this.value.prompt==='stop';const mode=this.value.mode;const score=this.value.score+1;const generation=this.generation;
  this.phase('DRAWING',{score,remainingMs:0});
  const pending=mode==='gaming'?this.options.rollGaming():this.options.roll();
  pending.then(result=>{
   if(this.dead||generation!==this.generation)return;
   if(result.error)throw new Error(result.error);
   const hits=mode==='gaming'?[]:result.hits.map(id=>EVENT_BY_ID.get(id)).filter((e):e is ProbabilityEvent=>Boolean(e));
   this.options.onSuccess?.({mode,score,wasStop,hits});
   this.update({lastDrawMs:result.durationMs});
   let bonus:Bonus|null=null;
   if(this.effects&&mode==='gaming'&&result.tier&&result.tier!=='normal')bonus={kind:'casual',theme:result.tier==='super'?'cosmos':'numbers',event:null,tier:result.tier};
   if(this.effects&&mode!=='gaming'&&result.trigger){const event=result.candidateId?EVENT_BY_ID.get(result.candidateId)||null:null;bonus={kind:event?'actual':'theater',theme:event?.animationId??(['freeze','numbers','cosmos'] as const)[score%3],event:event??eligible[score%eligible.length]!,tier:null};}
   const next:Target={phase:bonus?'BONUS':'GAP',remaining:bonus?4500:220,bonus};
   if(this.value.phase==='PAUSED'||(this.value.phase==='COUNTDOWN'&&this.target?.phase==='DRAWING')){this.target=next;return;}
   const time=this.now();this.deadline=time+next.remaining;this.phase(next.phase,{bonus,remainingMs:next.remaining});
  }).catch(error=>{if(this.dead||generation!==this.generation)return;this.update({error:`抽選処理を完了できませんでした。再試行で再抽選せず、このプレイを終了します。${error instanceof Error?' '+error.message:''}`});this.fail();});
  void now;
 }
 tick(now=this.now()){
  const phase=this.value.phase;if(['READY','GAME_OVER','PAUSED','DRAWING'].includes(phase))return;
  const remaining=Math.max(0,this.deadline-now);
  if(phase==='COUNTDOWN'){
   if(remaining>0){this.update({remainingMs:remaining,countdown:Math.ceil(remaining/300)});return;}
   const target=this.target;this.target=null;
   if(!target||target.phase==='ROUND'&&target.remaining<=0){this.nextRound(now);return;}
   this.deadline=now+target.remaining;this.phase(target.phase,{remainingMs:target.remaining,bonus:target.bonus,countdown:0});return;
  }
  this.update({remainingMs:remaining});
  if(remaining>0)return;
  if(phase==='ROUND'){if(this.value.prompt==='stop')this.success(now);else this.fail();}
  else if(phase==='GAP')this.nextRound(now);
  else if(phase==='BONUS')this.skipBonus(now);
 }
 pause(now=this.now()){
  if(!['ROUND','GAP','DRAWING','BONUS','COUNTDOWN'].includes(this.value.phase))return;
  if(this.value.phase==='ROUND'&&now>=this.deadline){if(this.value.prompt==='go'){this.fail();return;}this.success(now);}
  if(this.value.phase!=='COUNTDOWN')this.target={phase:this.value.phase,remaining:Math.max(0,this.deadline-now),bonus:this.value.bonus};
  this.phase('PAUSED');
 }
 resume(now=this.now()){
  if(this.value.phase!=='PAUSED')return;
  const target=this.target??{phase:'ROUND' as const,remaining:0,bonus:null};
  this.countdown(now,target);
 }
 skipBonus(now=this.now()){
  if(this.value.phase!=='BONUS')return;
  if(this.previewReturn){const previous=this.previewReturn;this.previewReturn=null;this.phase(previous,{bonus:null,remainingMs:1500});return;}
  this.countdown(now,{phase:'GAP',remaining:120,bonus:null});
 }
 preview(event:ProbabilityEvent,now=this.now()){
  if(!['READY','GAME_OVER'].includes(this.value.phase))return false;
  this.previewReturn=this.value.phase;this.deadline=now+4500;this.phase('BONUS',{bonus:{kind:'preview',theme:event.animationId,event,tier:null},remainingMs:4500});return true;
 }
 destroy(){this.dead=true;this.generation++;this.listeners.clear();}
}
