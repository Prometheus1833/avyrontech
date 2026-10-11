import type { FileRow } from './data';
export const MAX_FILE=10*1024*1024,MAX_TOTAL=60*1024*1024,MAX_FILES=20;
const types:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv',txt:'text/plain',svg:'image/svg+xml'};
export function inspectUpload(filename:string,mime:string,bytes:Uint8Array){
 const ext=filename.toLowerCase().split('.').pop()||'',expected=types[ext];if(!expected||mime!==expected||!bytes.length||bytes.length>MAX_FILE)throw new Error('file_type_or_size');
 const starts=(list:number[])=>list.every((v,i)=>bytes[i]===v),text=new TextDecoder().decode(bytes),head=text.slice(0,16);
 if(['png'].includes(ext)&&!starts([137,80,78,71,13,10,26,10]))throw new Error('file_signature');
 if(['jpg','jpeg'].includes(ext)&&!starts([255,216,255]))throw new Error('file_signature');
 if(ext==='pdf'&&!head.startsWith('%PDF-'))throw new Error('file_signature');
 if(ext==='gif'&&!/^GIF8[79]a/.test(head))throw new Error('file_signature');
 if(ext==='webp'&&!(head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'))throw new Error('file_signature');
 if(['doc','xls'].includes(ext)&&!starts([208,207,17,224,161,177,26,225]))throw new Error('file_signature');
 if(['docx','xlsx'].includes(ext)&&(!starts([80,75,3,4])||!text.includes('[Content_Types].xml')||!text.includes(ext==='docx'?'word/':'xl/')))throw new Error('file_signature');
 if(['txt','csv','svg'].includes(ext)&&(bytes.includes(0)||text.includes('\uFFFD')))throw new Error('file_encoding');
 // SVG is accepted as a private downloadable source only, never injected into HTML or previewed.
 if(ext==='svg'&&(!/<svg\b/i.test(text)||/<!DOCTYPE|<!ENTITY|<\s*(script|foreignObject|iframe|object|embed|image|use|style|animate|set)\b|\bon[a-z]+\s*=|href\s*=|url\s*\(|javascript:|data:/i.test(text)))throw new Error('unsafe_svg');
 return {filename:Array.from(filename,c=>c.charCodeAt(0)<32||'/\\"<>'.includes(c)?'_':c).join('').slice(0,160)||`file.${ext}`,mime:expected};
}
export type MalwareScanHook=(file:Pick<FileRow,'id'|'mime_type'|'size'>,stream:ReadableStream)=>Promise<'clean'|'rejected'|'unavailable'>;
export function fileResponse(file:FileRow,body:ReadableStream){return new Response(body,{headers:{'Content-Type':file.mime_type,'Content-Disposition':`attachment; filename="${file.original_filename.replace(/[^\x20-\x7E]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(file.original_filename)}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'}});}
