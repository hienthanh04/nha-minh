import test from "node:test";
import assert from "node:assert/strict";
import {blankSlots,validateSlots,weeklyCount,workloadLabel,relatedDuties,responsibleId,vietnamToday,mondayOf,selectedWeek,addDays} from "../src/lib/kitchen/rules.ts";

const members = Array.from({length:5},(_,i)=>({id:"test-"+i,display_name:"Test "+i,member_slot:i+1}));
const slots=blankSlots().map((s,i)=>({...s,assigned_to:members[i%5].id}));
const base={id:"duty",date:"2026-09-11",duty_type:"cook",slot_number:1,assigned_to:members[0].id,
 delegated_to:null,completed_by:null,completed_at:null,status:"unconfirmed",updated_at:"2026-09-01T00:00:00Z"};
test("15 canonical slots, three original assignments each",()=>assert.equal(validateSlots(slots,members),null));
test("need five profiles",()=>assert.match(validateSlots(slots,members.slice(0,4)),/5/));
test("reject incomplete week",()=>assert.match(validateSlots(slots.slice(1),members),/15/));
test("reject duplicate slot",()=>assert.match(validateSlots([slots[1],...slots.slice(1)],members),/trùng/));
test("reject invalid 4/2 distribution",()=>assert.match(validateSlots(slots.map((s,i)=>i===0?{...s,assigned_to:members[1].id}:s),members),/3/));
test("unconfirmed duty gives no credit",()=>assert.equal(weeklyCount([base],members[0].id,"2026-09-07"),0));
test("normal completion gives original member one credit",()=>{
 assert.equal(weeklyCount([{...base,status:"completed",completed_by:members[0].id}],members[0].id,"2026-09-07"),1);
});
test("delegation switches responsibility, preserves original trace, credits actual performer",()=>{
 const duty={...base,delegated_to:members[1].id,status:"completed",completed_by:members[1].id};
 assert.equal(responsibleId(duty),members[1].id);
 assert.equal(weeklyCount([duty],members[0].id,"2026-09-07"),0);
 assert.equal(weeklyCount([duty],members[1].id,"2026-09-07"),1);
 assert.equal(relatedDuties([duty],members[0].id).length,1);
 assert.equal(relatedDuties([duty],members[1].id).length,1);
});
test("late completion credited to duty date, not click date",()=>{
 const duty={...base,status:"completed",completed_by:members[0].id,completed_at:"2026-09-15T15:00:00Z"};
 assert.equal(weeklyCount([duty],members[0].id,"2026-09-07"),1);
 assert.equal(weeklyCount([duty],members[0].id,"2026-09-14"),0);
});
for(const [count,label] of [[2,"Thiếu 1"],[3,"Đủ"],[4,"Dư 1"]]) {
 test(count+"/3 = "+label,()=>{
  const rows=Array.from({length:count},(_,i)=>({...base,id:String(i),status:"completed",completed_by:members[0].id}));
  assert.equal(workloadLabel(weeklyCount(rows,members[0].id,"2026-09-07")),label);
 });
}
test("Vietnam midnight and Sunday/Monday independent of phone timezone",()=>{
 assert.equal(vietnamToday(new Date("2026-09-13T16:59:59Z")),"2026-09-13");
 const monday=vietnamToday(new Date("2026-09-13T17:00:00Z"));
 assert.equal(monday,"2026-09-14");
 assert.equal(mondayOf(monday),"2026-09-14");
 assert.equal(mondayOf("2026-09-13"),"2026-09-07");
});
test("week input normalization and invalid dates",()=>{
 assert.equal(selectedWeek("2026-09-13"),"2026-09-07");
 assert.equal(selectedWeek("invalid","2026-09-13"),"2026-09-07");
 assert.equal(selectedWeek("2026-02-31","2026-09-13"),"2026-09-07");
 assert.equal(addDays("2026-12-28",7),"2027-01-04");
});

