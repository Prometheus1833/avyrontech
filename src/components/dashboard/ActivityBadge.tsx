export default function ActivityBadge({count,label,placement="icon"}:{count?:number;label:string;placement?:"icon"|"card"}) {
  if(!Number.isFinite(count)||!count||count<1)return null;
  return <span aria-label={`${count} ${label}`} className={`pointer-events-none absolute ${placement==="card"?"right-2 top-2":"-right-2 -top-2"} grid h-[18px] min-w-[18px] place-items-center rounded-full bg-fuchsia-700 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#090e1d]`}>{count>99?"99+":count}</span>;
}
