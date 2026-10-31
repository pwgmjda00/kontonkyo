import type { MachineDrawEntry } from './machineLottery';
import { machineEmojiPack } from './machineEmoji';
import { machineTrivia } from './machineTrivia';
import { stickerLevel,STICKER_TIERS,getEquippedBadge,type RewardProfile } from './machineRewards';

const W=1080,H=1350;
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number){
  let line='',lines=0;
  const chars=Array.from(text);
  for(const c of chars){
    const next=line+c;
    if(ctx.measureText(next).width>maxWidth && line){
      ctx.fillText(line,x,y+lines*lineHeight);lines++;line=c;
      if(lines>=maxLines-1)break;
    }else line=next;
  }
  if(lines<maxLines)ctx.fillText(line,x,y+lines*lineHeight);
}
export function makeCollectionCard(machine:MachineDrawEntry,profile:RewardProfile):HTMLCanvasElement{
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const c=canvas.getContext('2d');if(!c)throw Error('この端末は画像生成に対応していません');
  const pack=machineEmojiPack(machine);
  const fact=machineTrivia(machine);
  const count=profile.counts[machine.id]??0,level=stickerLevel(count);
  const badge=getEquippedBadge(profile);
  const bg=c.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#160820');bg.addColorStop(.5,'#471a67');bg.addColorStop(1,'#0a1728');
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let i=0;i<25;i++){
    const x=((i*227)%980)+48,y=((i*367)%1150)+95;
    c.beginPath();c.arc(x,y,2+(i%4),0,2*Math.PI);
    c.fillStyle=i%3===0?'#ffed8c':'#c5a2ef';c.globalAlpha=.38;c.fill();c.globalAlpha=1;
  }
  c.strokeStyle='#f4d478';c.lineWidth=9;rounded(c,28,28,W-56,H-56,48);c.stroke();
  c.strokeStyle='#a37bca';c.lineWidth=2;rounded(c,48,48,W-96,H-96,37);c.stroke();
  c.fillStyle='#ffe19c';c.font='bold 32px system-ui,sans-serif';c.fillText('DOPA COLLECTORS  ✦  COLLECTION CARD',92,130);
  c.fillStyle='#e1ccff';c.font='bold 27px system-ui,sans-serif';c.fillText('ドパボタン｜当選記念ステッカー',92,186);
  c.fillStyle='#31143c';rounded(c,85,232,910,340,36);c.fill();
  c.textAlign='center';
  c.font='96px "Apple Color Emoji","Noto Color Emoji",system-ui';c.fillText(pack.icons.slice(0,5).join(' '),W/2,373,830);
  c.font='bold 60px system-ui,sans-serif';c.fillStyle='#ffeb99';c.fillText(STICKER_TIERS[level].emoji+' '+STICKER_TIERS[level].name,W/2,470);
  c.textAlign='left';
  c.fillStyle='#fff';c.font='bold 54px system-ui,sans-serif';
  wrap(c,machine.machine,92,667,900,71,2);
  c.fillStyle='#e1c5ff';c.font='bold 32px system-ui,sans-serif';c.fillText(machine.publishedProbability+'   ｜   '+count+'回 獲得',92,787);
  c.fillStyle='#f6d991';c.font='bold 31px system-ui,sans-serif';wrap(c,pack.chant,92,881,875,48,3);
  c.fillStyle='#e4dcf0';c.font='28px system-ui,sans-serif';wrap(c,fact.highlight,92,1075,880,42,2);
  c.fillStyle='#ffd995';c.font='bold 29px system-ui,sans-serif';
  const name=profile.alias||'ドパコレクター';
  c.fillText('🏷️ '+name+(badge?'  ｜  '+badge.emoji+badge.name:''),92,1173,900);
  c.fillStyle='#a7b1bf';c.font='23px system-ui,sans-serif';c.fillText('ゲーム内記念カード｜現金・換金性なし｜#ドパボタン',92,1234,900);
  return canvas;
}
function blobFromCanvas(canvas:HTMLCanvasElement):Promise<Blob>{
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('画像を書き出せませんでした')),'image/png');
  });
}
function safeFile(name:string):string {
  return name.normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').slice(0,40)||'machine';
}
export async function shareMachineCard(machine:MachineDrawEntry,profile:RewardProfile):Promise<'shared'|'saved'|'cancelled'> {
  const canvas=makeCollectionCard(machine,profile);
  const blob=await blobFromCanvas(canvas);
  const filename='dopa-'+safeFile(machine.machine)+'-'+Date.now()+'.png';
  const file=new File([blob],filename,{type:'image/png'});
  const nav=navigator as Navigator & {canShare?:(data:{files:File[]})=>boolean;share?:(data:{files?:File[];title?:string;text?:string})=>Promise<void>};
  if(typeof nav.share==='function'&&typeof nav.canShare==='function'&&nav.canShare({files:[file]})){
    try{
      await nav.share({files:[file],title:machine.machine+'｜ドパボタン',text:'#ドパボタン #ドパコレクターズ'});
      return 'shared';
    }catch(e){
      if(e instanceof DOMException&&e.name==='AbortError')return 'cancelled';
      // Fall through to a local download on unsupported or failed share.
    }
  }
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),120000);
  return 'saved';
}
export function collectionTweet(machine:MachineDrawEntry,profile:RewardProfile){
  const pack=machineEmojiPack(machine);
  const count=profile.counts[machine.id]??0;
  const badge=getEquippedBadge(profile);
  return `${pack.icons.slice(0,5).join(' ')}\nドパボタンで「${machine.machine}」をGET！\nステッカー：${STICKER_TIERS[stickerLevel(count)].name}（${count}回）${badge?'\n称号：'+badge.emoji+badge.name:''}\n#ドパボタン #ドパコレクターズ`;
}
