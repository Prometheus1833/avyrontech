// Conservative vocabulary gate: a client must confirm a proposal, but invented
// services, figures or details should not reach that confirmation in the first place.
const grammar=new Set(`a ai al ale am ar as avea avem au ca care cate cat ce cel cea cei cele cu da daca dar de decat din dintre doresc doreste dorim dorit dori e este eu ei el ea fie fi fost foarte i iar imi in intr intre la le lor lui ma mai mi ne ni noi nu o pe pentru pot prin sa se si spre sunt suntem tot toate tu un una unele unui unor va voi vom vor vrem vreau vrea doar numai clar clara clare clari claritate formulare formularea raspuns raspunsul proiect proiectul proiectului prezentare prezentarea prezentarii serviciu servicii serviciile serviciilor afacere afacerea activitate activitatea companie compania domeniu domeniul solutie solutia`.split(/\s+/));
const words=(text:string):string[]=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
export function groundedRephrase(source:string,suggestion:string){
 const original=words(source),proposed=words(suggestion),known=new Set(original);
 const stem=(word:string)=>word.replace(/(iilor|iului|ului|elor|ilor|iile|ii|ul|le|ea|ia|a|e|i)$/,'');
 if(['nu','fara','nici'].some(word=>known.has(word)!==proposed.includes(word)))return false;
 return proposed.every(word=>known.has(word)||(!/\d/.test(word)&&(grammar.has(word)||word.length>=5&&original.some(item=>item.length>=5&&stem(item)===stem(word)))));
}
