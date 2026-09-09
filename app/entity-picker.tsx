'use client';
import {useEffect,useState} from 'react';
import {Combobox,ComboboxInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty} from '@/components/ui/combobox';
type Item=Record<string,any>;
export default function EntityPicker({api,table,value,onChange,initial=[],memberId='',branch='',required=false}:{api:(path:string)=>Promise<any>,table:string,value:string,onChange:(v:string)=>void,initial?:Item[],memberId?:string,branch?:string,required?:boolean}){
 const [query,setQuery]=useState(''),[items,setItems]=useState<Item[]>(initial),[error,setError]=useState('');
 const label=(r:Item)=>r.name||r.reference||(r.start_date?`${r.start_date} — ${r.end_date}`:r.id.slice(0,8));
 const [selected,setSelected]=useState<Item|null>(initial.find(r=>r.id===value)||null);
 useEffect(()=>{if(!value)setSelected(null);else setSelected(old=>old?.id===value?old:initial.find(r=>r.id===value)||{id:value,name:value.slice(0,8)})},[value]);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{api('page/'+table+'?'+new URLSearchParams({q:query,limit:'30',...(memberId?{member_id:memberId}:{}),...(branch?{branch}:{})})).then(r=>{if(active){setItems(r.items);setError('')}}).catch(e=>{if(active)setError(e.message)})},250);return()=>{active=false;clearTimeout(timer)}},[api,query,table,memberId,branch]);
 return <div><Combobox items={items} value={selected} onValueChange={(r:Item|null)=>{setSelected(r);onChange(r?.id||'')}} onInputValueChange={setQuery} itemToStringLabel={label} itemToStringValue={(r:Item)=>r.id} isItemEqualToValue={(a:Item,b:Item)=>a.id===b.id} filter={null} required={required}><ComboboxInput placeholder="نام یا شماره را جست‌وجو کنید…" aria-label="جست‌وجو و انتخاب"/><ComboboxContent><ComboboxEmpty>موردی پیدا نشد</ComboboxEmpty><ComboboxList>{(r:Item)=><ComboboxItem key={r.id} value={r}>{label(r)}{r.phone?' · '+r.phone:''}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>{error&&<small role="alert">{error}</small>}</div>
}
