// Original vector pictograms, drawn on one grid. Photographs remain illustrative.
const paths={
 family:'<path d="M3 14 16 4l13 10M6 13v14h20V13"/><circle cx="11" cy="15" r="2.2"/><circle cx="21" cy="15" r="2.2"/><circle cx="16" cy="22" r="2"/><path d="M7 24v-2a4 4 0 0 1 6-3m6 0a4 4 0 0 1 6 3v2M12 28v-1a4 4 0 0 1 8 0v1"/>',
 tree:'<path d="M7 4h13l5 5v16H7zM20 4v6h5M11 13h9M11 17h6M4 9v20h17"/><path d="M19 29v-6m0 0-4-3m4 3 5-3"/><circle cx="14" cy="19" r="1.5"/><circle cx="25" cy="19" r="1.5"/>',
 home:'<path d="M3 14 15 4l11 9M7 12v16h16V12M12 28v-9h6v9"/><path d="M25 17v12m-3-3 3 3 3-3M3 28h24"/><path d="M11 13h7"/>',
 document:'<path d="M6 3h15l5 5v14M21 3v6h5M10 13h11M10 17h8M10 21h5M6 3v25h10"/><circle cx="23" cy="25" r="6"/><path d="m20 25 2 2 4-4"/>',
 briefcase:'<rect x="3" y="10" width="26" height="17" rx="3"/><path d="M11 10V5h10v5M3 17c8 5 18 5 26 0M14 18v5h4v-5"/><path d="M8 6V3M24 6V3"/>',
 building:'<path d="M4 28V9l11-5v24M15 12h12v16M2 28h28M9 12v2m0 5v2M20 17h2m-2 5h2M11 28v-4h4"/><circle cx="25" cy="5" r="2"/><path d="M25 7v5M23 5h-4"/>'
};
export const icon=name=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
export const practiceVisuals={
 family:{ro:{tag:'Familie',alt:'Scenă ilustrativă de dialog și analiză într-o consultație de dreptul familiei.'},en:{tag:'Family',alt:'Illustrative discussion and assessment in a family law consultation.'}},
 tree:{ro:{tag:'Patrimoniu',alt:'Compoziție ilustrativă: înscrisuri succesorale, plic și cheie, într-un dosar de patrimoniu.'},en:{tag:'Inheritance',alt:'Illustrative estate folio with succession records, an envelope and a key.'}},
 home:{ro:{tag:'Proprietate',alt:'Arhitectură rezidențială contemporană, ilustrație pentru dreptul imobiliar.'},en:{tag:'Property',alt:'Contemporary residential architecture illustrating property law.'}},
 document:{ro:{tag:'Obligații civile',alt:'Scenă ilustrativă de examinare a clauzelor unui contract civil.'},en:{tag:'Civil obligations',alt:'Illustrative review of the clauses in a civil contract.'}},
 briefcase:{ro:{tag:'Raporturi de muncă',alt:'Scenă ilustrativă de analiză a unui document privind raporturile de muncă.'},en:{tag:'Employment',alt:'Illustrative assessment of an employment-related document.'}},
 building:{ro:{tag:'Societăți',alt:'Documente contractuale într-un cadru contemporan de consultanță pentru societăți, ilustrativ.'},en:{tag:'Companies',alt:'Illustrative contractual records in a contemporary business advisory setting.'}}
};
export const articleAlt=(article,lang)=>lang==='ro'?{
 'prima-consultatie':'Scenă ilustrativă de pregătire a unei consultații, cu analiza documentelor.',
 'situatii-internationale':'Dosar juridic și două cercuri conectate, cu un contur stilizat al Europei, ilustrație pentru situații transfrontaliere.',
 'contracte-pentru-societati':'Dosar contractual pregătit pentru analiză în cadrul unei societăți, scenă ilustrativă.'
}[article.slug]:{
 'prima-consultatie':'Illustrative consultation preparation and document assessment.',
 'situatii-internationale':'A legal folio and two connected rings with a stylised outline of Europe, illustrating cross-border matters.',
 'contracte-pentru-societati':'Illustrative contract file prepared for a business legal review.'
}[article.slug];
