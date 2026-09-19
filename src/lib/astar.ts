import { getDb } from './db';
const SPEED = 25; // km/h nội thành Huế
const START_H = 7;
const BUDGET = 840; // 14h: 07:00→21:00
const MAX_H = 2; // max heritage/day
const MAX_ST = 6000;

function dkm(a1:number,o1:number,a2:number,o2:number){
  const d1=(a2-a1)*Math.PI/180,d2=(o2-o1)*Math.PI/180;
  const x=Math.sin(d1/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(d2/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function tm(km:number){return(km/SPEED)*60;}
function ft(m:number){const t=START_H*60+Math.floor(m);return`${(Math.floor(t/60)%24+'').padStart(2,'0')}:${(t%60+'').padStart(2,'0')}`;}

type SN='BREAKFAST'|'MORNING'|'CAFE_BREAK'|'LUNCH'|'SIESTA'|'AFTERNOON'|'LATE_AFT'|'DINNER'|'EVENING';
const SLOTS:{name:SN;s:number;e:number;pref:string[];req?:'food'|'cafe'}[]=[
  {name:'BREAKFAST',s:0,e:60,pref:['food'],req:'food'},
  {name:'MORNING',s:60,e:210,pref:['heritage','temple','nature','craft_village','experience']},
  {name:'CAFE_BREAK',s:210,e:270,pref:['cafe'],req:'cafe'},
  {name:'LUNCH',s:270,e:360,pref:['food','market'],req:'food'},
  {name:'SIESTA',s:360,e:420,pref:['cafe','art','architecture']},
  {name:'AFTERNOON',s:420,e:570,pref:['heritage','temple','nature','craft_village','experience']},
  {name:'LATE_AFT',s:570,e:660,pref:['market','cafe','nature','craft_village','art']},
  {name:'DINNER',s:660,e:720,pref:['food'],req:'food'},
  {name:'EVENING',s:720,e:840,pref:['market','cafe','experience','nature']},
];
function slot(m:number){return SLOTS.find(s=>m>=s.s&&m<s.e)||null;}
const HC=new Set(['heritage','temple']);
const FC=new Set(['food','market']);
const HV=new Set(['heritage','temple','nature','craft_village']);


class PQ<T>{private i:T[]=[];constructor(private c:(a:T,b:T)=>number){}push(v:T){this.i.push(v);this.i.sort(this.c);}pop(){return this.i.shift();}get empty(){return!this.i.length;}}

const TIPS:Record<string,string[]>={
  heritage:['Mua vé combo di tích tiết kiệm 30%.','Thuê HDV tại chỗ (~100k) hiểu lịch sử.','Đi trước 9h tránh đông, ảnh đẹp.','Mang nước+mũ, khu di tích ít bóng mát.'],
  temple:['Mặc trang phục kín đáo khi vào chùa.','Đẹp nhất sáng sớm khi sương phủ.','Không gian yên tĩnh, hạn chế nói to.'],
  food:['Đi sớm trước 7:30 tránh đông.','Gọi thêm rau sống — đặc trưng Huế.','Quán ngon thường đông, kiên nhẫn chờ xứng đáng.'],
  cafe:['Ngồi tầng 2/ban công view đẹp nhất.','Thử cà phê muối — đặc sản chỉ có ở Huế.','Wifi tốt, nghỉ chân 30-45 phút.'],
  nature:['Mang giày thoải mái, đường có thể trơn.','Ảnh đẹp nhất sáng sớm hoặc hoàng hôn.','Mang nước và kem chống nắng.'],
  market:['Trả giá khoảng 70% giá ban đầu.','Đi buổi sáng hàng tươi nhất.'],
  craft_village:['Đặt trước nếu muốn workshop thủ công.','Thường mất 1-2 tiếng cho trải nghiệm.'],
};
function gtip(cat:string,sn:SN):string{
  if(sn==='BREAKFAST'&&FC.has(cat))return'Đi sớm trước 7:30, quán sáng ngon thường hết trước 9h.';
  if(sn==='DINNER'&&FC.has(cat))return'Thử nem lụi hoặc bánh bèo chén — ăn tối kiểu Huế chính hiệu.';
  if(sn==='LATE_AFT'&&cat==='nature')return'Golden hour — thời điểm hoàn hảo chụp hoàng hôn bên sông Hương.';
  if(sn==='EVENING'&&cat==='market')return'Chợ đêm sôi động nhất sau 19:30, thử các món ăn vặt.';
  const p=TIPS[cat]||['Tận hưởng trải nghiệm!'];return p[Math.floor(Math.random()*p.length)];
}

function gtheme(acts:any[],di:number){
  const cats=Array.from(new Set(acts.filter(a=>!FC.has(a.type)&&a.type!=='cafe'&&a.type!=='rest').map(a=>a.type))).sort().join('+');
  const M:Record<string,[string,string]>={
    'heritage':['Tinh hoa Cố đô','Mặc áo dài truyền thống để chụp ảnh miễn phí tại Đại Nội.'],
    'temple':['Chùa chiền xứ Huế','Di chuyển chậm, thưởng thức không gian thiền.'],
    'heritage+temple':['Di sản Hoàng triều','Vé combo di tích tiết kiệm hơn mua lẻ.'],
    'nature':['Thiên nhiên Huế','Kem chống nắng + mũ rộng vành là bắt buộc.'],
    'craft_village':['Nghệ nhân Huế','Mua quà thủ công trực tiếp từ nghệ nhân, giá tốt hơn chợ.'],
    'experience':['Trải nghiệm Huế','Đặt trước qua điện thoại để đảm bảo chỗ.'],
  };
  const fb=['Nhịp sống Huế mộng mơ','Dạo bước kinh thành','Hoài niệm xứ Huế','Sống chậm như người Huế','Huế — Góc nhìn mới'];
  const m=M[cats];return{theme:m?.[0]||fb[di%fb.length],tip:m?.[1]||`Ngày ${di+1}: Tận hưởng từng phút ở Huế.`};
}

type Nd={lat:number;lng:number;vis:Set<string>;path:any[];g:number;sc:number;hc:number;meals:{b:boolean;l:boolean;d:boolean};lc:string};
function sc(p:any,n:Nd,arr:number,tt:number):number{
  const sl=slot(arr);if(!sl)return-9999;
  let s=p.base_score;
  if(sl.pref.includes(p.category))s+=400;else s-=200;
  if(HC.has(p.category)&&n.hc>=MAX_H)s-=3000;
  if(sl.req==='food'&&FC.has(p.category)){
    if((sl.name==='BREAKFAST'&&!n.meals.b)||(sl.name==='LUNCH'&&!n.meals.l)||(sl.name==='DINNER'&&!n.meals.d))s+=800;
  }
  if(sl.req==='cafe'&&p.category==='cafe')s+=600;
  if(FC.has(p.category)&&sl.req==='food'&&p.meal_type&&p.meal_type!=='any'){
    if(sl.name==='BREAKFAST'&&p.meal_type!=='breakfast')s-=300;
    if((sl.name==='LUNCH'||sl.name==='DINNER')&&p.meal_type==='breakfast')s-=300;
  }
  if(sl.name==='SIESTA'&&HV.has(p.category)&&!p.indoor)s-=1000;
  if(n.lc===p.category&&!FC.has(p.category))s-=500;
  if(HC.has(p.category)&&HC.has(n.lc))s-=800;
  if(tt>40)s-=400;if(tt>60)s-=800;
  s+=(p.popularity||0.5)*100+(p.rating||4)*20;
  return s;
}

export function generateAstarTrip({duration,styles,companion,budget,food,startLat,startLng}:{
  duration:number;styles:string|string[];companion:string;budget:number;food?:string[];startLat?:number;startLng?:number;
}){
  const db=getDb();
  const allP=db.prepare("SELECT *,meal_type FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL AND CAST(lat AS REAL)>15 AND CAST(lat AS REAL)<17").all() as any[];
  const sArr=Array.isArray(styles)?styles:[styles].filter(Boolean);
  allP.forEach(p=>{
    p.base_score=(p.popularity||0.5)*80+(p.rating||4)*15;
    if(sArr.some(s=>s===p.category))p.base_score+=50;
    p.avg_visit_min=Number(p.avg_visit_min)||60;
    p.meal_type=p.meal_type||(FC.has(p.category)?'any':null);
    p.indoor=Number(p.indoor)||0;
    p.lat=Number(p.lat);p.lng=Number(p.lng);
  });
  const dur=Number(duration)||2;
  const days:any[]=[],hl:string[]=[],gv=new Set<string>();
  let aLat=(startLat&&startLat>15&&startLat<17)?startLat:16.4637;
  let aLng=(startLng&&startLng>106&&startLng<109)?startLng:107.5909;

  for(let d=0;d<dur;d++){
    const pq=new PQ<Nd>((a,b)=>b.sc-a.sc);
    pq.push({lat:aLat,lng:aLng,vis:new Set(gv),path:[],g:0,sc:0,hc:0,meals:{b:false,l:false,d:false},lc:''});
    let best:any[]=[],bestSc=-Infinity,st=0;

    while(!pq.empty&&st<MAX_ST){
      const n=pq.pop()!;st++;
      if(n.g>=BUDGET-30||n.path.length>=9){if(n.sc>bestSc){bestSc=n.sc;best=n.path;}continue;}
      if(n.path.length>=4&&n.sc>bestSc){bestSc=n.sc;best=n.path;}
      const cands=allP.filter(p=>!n.vis.has(p.id)&&dkm(n.lat,n.lng,p.lat,p.lng)<15);
      const scored=cands.map(p=>{
        const k=dkm(n.lat,n.lng,p.lat,p.lng),tt=tm(k),arr=n.g+tt;
        return{p,tt,arr,s:sc(p,n,arr,tt)};
      }).sort((a,b)=>b.s-a.s).slice(0,6);

      for(const{p:pl,tt,arr,s}of scored){
        const leave=arr+pl.avg_visit_min;
        if(leave>BUDGET+20||s<-1000)continue;
        const sl=slot(arr);const sn:SN=sl?.name||'EVENING';
        const nv=new Set(n.vis);nv.add(pl.id);
        const nm={...n.meals};
        if(FC.has(pl.category)){if(sn==='BREAKFAST')nm.b=true;if(sn==='LUNCH')nm.l=true;if(sn==='DINNER')nm.d=true;}
        const dur_s=pl.avg_visit_min>=60?`${Math.round(pl.avg_visit_min/60*10)/10} giờ`:`${pl.avg_visit_min} phút`;
        pq.push({lat:pl.lat,lng:pl.lng,vis:nv,path:[...n.path,{
          time:ft(arr),name:pl.name,type:pl.category,duration:dur_s,
          cost:pl.price||'Miễn phí',description:pl.description||'',
          ai_tip:gtip(pl.category,sn),location:pl.address||'TP. Huế',
          lat:pl.lat,lng:pl.lng,place_id:pl.id,
        }],g:leave,sc:n.sc+s,hc:n.hc+(HC.has(pl.category)?1:0),meals:nm,lc:pl.category});
      }
    }

    // Post-process: inject siesta rest
    const fa:any[]=[];let si=false;
    for(let i=0;i<best.length;i++){
      fa.push(best[i]);
      if(!si&&i<best.length-1){
        const ce=ptm(best[i].time)+pvd(best[i].duration);
        const ns=ptm(best[i+1].time);
        if(ce>=300&&ce<=450&&(ns-ce)>=40){
          fa.push({time:ft(ce),name:'Nghỉ trưa — thư giãn',type:'rest',duration:'60 phút',cost:'Miễn phí',
            description:'Nghỉ ngơi tránh nắng. Về khách sạn hoặc quán có máy lạnh.',
            ai_tip:'Ngủ trưa 30 phút — chiều tràn năng lượng khám phá tiếp.',location:'Khách sạn / quán cafe'});
          si=true;
        }
      }
    }
    for(const a of best){if(a.place_id)gv.add(a.place_id);if(HC.has(a.type)&&!hl.includes(a.name))hl.push(a.name);}
    if(best.length>0){const l=best[best.length-1];aLat=l.lat;aLng=l.lng;}
    const t=gtheme(fa,d);
    days.push({day:d+1,theme:t.theme,day_tip:t.tip,activities:fa});
  }

  const CL:Record<string,string>={solo:'một mình',couple:'cặp đôi',family:'gia đình',friends:'nhóm bạn'};
  return{
    title:`Huế ${dur} ngày — Như có hướng dẫn viên riêng`,
    summary:`Lịch trình ${dur} ngày cho ${CL[companion]||companion} — nhịp ngày thực tế: ăn sáng → di tích → nghỉ trưa → khám phá chiều → ẩm thực tối. Tối đa ${MAX_H} di tích/ngày.`,
    total_cost_estimate:budget?`${Number(budget).toLocaleString('vi-VN')} VNĐ`:'Dự kiến 2.000.000 VNĐ',
    highlights:hl.slice(0,5),
    ai_insight:'🎯 Lịch trình theo cách HDV chuyên nghiệp: sáng ăn đặc sản, tham quan khi mát, nghỉ trưa tránh nắng, chiều muộn dạo chơi nhẹ nhàng.',
    days,
  };
}

function ptm(t:string){const[h,m]=t.split(':').map(Number);return(h-START_H)*60+m;}
function pvd(d:string){return d.includes('giờ')?Math.round(parseFloat(d)*60):parseInt(d)||60;}

