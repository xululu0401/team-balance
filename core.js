(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const DEMO={people:[{id:'p1',name:'成员A',hours:8},{id:'p2',name:'成员B',hours:8},{id:'p3',name:'成员C',hours:8}],tasks:[{id:'t1',name:'客户方案',hours:6,eligible:['p1','p2'],current:'p1',locked:false},{id:'t2',name:'预算复核',hours:5,eligible:['p1','p3'],current:'p1',locked:false},{id:'t3',name:'素材整理',hours:4,eligible:['p1','p2','p3'],current:'p1',locked:false},{id:'t4',name:'上线检查',hours:3,eligible:['p1','p2','p3'],current:'p2',locked:false}]};
function normalize(data){
 if(!data||!Array.isArray(data.people)||!Array.isArray(data.tasks)||data.people.length<1||data.people.length>4||data.tasks.length<1||data.tasks.length>10)throw Error('需要1–4名成员、1–10项任务。');
 const ids=new Set(),names=new Set();
 const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||Array.from(v.trim()).length>24||/[\u0000-\u001f]/.test(v))throw Error(label+'须为1–24字，不含控制字符。');return v.trim();};
 const id=(v,label)=>{if(typeof v!=='string'||!/^[-\w]{1,32}$/.test(v)||ids.has(v))throw Error(label+'标识无效或重复。');ids.add(v);return v;};
 const hours=(v,max,label)=>{if(!['string','number'].includes(typeof v)||String(v).trim()===''||!/^\d+(?:\.\d{1,2})?$/.test(String(v)))throw Error(label+'须为普通十进制小时数。');let n=Number(v);if(!Number.isFinite(n)||n<.25||n>max||!Number.isInteger(n*4))throw Error(label+`须为0.25–${max}小时，按0.25递增。`);return n;};
 const people=data.people.map((p,i)=>{if(!p||typeof p!=='object')throw Error('成员格式无效');let name=text(p.name,`成员${i+1}名称`);if(names.has(name))throw Error('成员名称不能重复。');names.add(name);return{id:id(p.id,'成员'),name,hours:hours(p.hours,80,`成员${i+1}可用工时`)};});
 const valid=new Set(people.map(p=>p.id));
 const tasks=data.tasks.map((t,i)=>{if(!t||typeof t!=='object'||!Array.isArray(t.eligible)||new Set(t.eligible).size!==t.eligible.length||t.eligible.some(x=>!valid.has(x)))throw Error(`任务${i+1}可承接成员无效。`);if(t.current!==null&&!valid.has(t.current))throw Error(`任务${i+1}当前负责人无效。`);if(typeof t.locked!=='boolean')throw Error(`任务${i+1}锁定状态无效。`);if(t.locked&&(t.current===null||!t.eligible.includes(t.current)))throw Error(`任务${i+1}锁定负责人必须属于可承接成员。`);return{id:id(t.id,'任务'),name:text(t.name,`任务${i+1}名称`),hours:hours(t.hours,24,`任务${i+1}工时`),eligible:[...t.eligible],current:t.current,locked:t.locked};});
 return {people,tasks};
}
const cmp=(a,b)=>a.n*b.d-b.n*a.d;
function peak(load,caps){let r={n:0,d:1};for(let i=0;i<load.length;i++){let v={n:load[i],d:caps[i]};if(cmp(v,r)>0)r=v;}return r;}
function solve(input){const data=normalize(input),{people,tasks}=data,caps=people.map(p=>p.hours*4),index=new Map(people.map((p,i)=>[p.id,i]));
 const currentLoad=people.map(()=>0);let unassigned=0;const currentViolations=[];
 tasks.forEach(t=>{if(t.current===null)unassigned+=t.hours;else{currentLoad[index.get(t.current)]+=t.hours*4;if(!t.eligible.includes(t.current))currentViolations.push(t.id);}});
 const choices=tasks.map(t=>(t.locked?[t.current]:t.eligible).map(p=>index.get(p)));
 const blocked=tasks.filter((t,i)=>!choices[i].length).map(t=>t.id);
 const base={data,totalHours:tasks.reduce((a,t)=>a+t.hours,0),capacityHours:people.reduce((a,p)=>a+p.hours,0),currentLoad:currentLoad.map(x=>x/4),currentPeak:peak(currentLoad,caps),unassigned,currentViolations,blocked};
 if(blocked.length)return{...base,status:'blocked',assignment:[],loads:[],peak:null,nodes:0};
 const order=tasks.map((t,i)=>i).sort((a,b)=>choices[a].length-choices[b].length||tasks[b].hours-tasks[a].hours||a-b);
 const load=people.map(()=>0),assign=tasks.map(()=>-1);let best=null,bestAssign=null,nodes=0;
 function visit(depth){nodes++;const current=peak(load,caps);if(best&&cmp(current,best)>=0)return;
 if(depth===tasks.length){best=current;bestAssign=assign.slice();return;}
 let k=order[depth],u=tasks[k].hours*4;
 let opts=choices[k].slice().sort((a,b)=>(load[a]+u)*caps[b]-(load[b]+u)*caps[a]||a-b);
 for(const p of opts){assign[k]=p;load[p]+=u;visit(depth+1);load[p]-=u;}
 }
 visit(0);
 const resultLoad=people.map(()=>0);bestAssign.forEach((p,i)=>resultLoad[p]+=tasks[i].hours);
 return {...base,status:best.n<=best.d?'fits':'overloaded',assignment:bestAssign.map(p=>people[p].id),loads:resultLoad,peak:best,nodes,changed:tasks.filter((t,i)=>t.current!==people[bestAssign[i]].id).length};
}
function pack(data){return JSON.stringify({kind:'team-balance',version:1,data:normalize(data)},null,2);}
function unpack(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>50000)throw Error('备份须小于50KB。');let x;try{x=JSON.parse(text);}catch{throw Error('备份不是有效JSON。');}if(!x||x.kind!=='team-balance'||x.version!==1)throw Error('不是分工配平器v1备份。');return normalize(x.data);}
function csvCell(v){let s=String(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
const api={demo:()=>clone(DEMO),normalize,solve,pack,unpack,csvCell};root.AppCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
