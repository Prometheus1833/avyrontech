/** Shared navigation and server authorization vocabulary. No secret or runtime state. */
export const departments = ['general', 'sales', 'developer', 'marketing', 'finance', 'support'] as const;
export type Department = typeof departments[number];
export const departmentLabels: Record<Department, string> = {general:'General',sales:'Sales',developer:'Developer',marketing:'Marketing',finance:'Finance',support:'Support'};
export const centers = [
  {id:'surveys',name:'Smart Surveys',group:'Clienți și livrare',detail:'Discovery, răspunsuri, materiale și briefuri aprobate.',roles:['sales','developer','marketing','support']},
  {id:'approvals',name:'Approval Center',group:'AI și control',detail:'Aprobări AI, revizuire și decizii pe versiunea exactă.',roles:[]},
  {id:'runs',name:'AI Activity / Agent Runs',group:'AI și control',detail:'Pași, rezultate, erori și consum înregistrat.',roles:[]},
  {id:'automations',name:'Automation Center',group:'AI și control',detail:'Reguli, execuții, retry și următoarea rulare.',roles:[]},
  {id:'briefing',name:'AVY Briefing',group:'AI și control',detail:'Priorități și preferințe pentru sinteza de dimineață.',roles:['general','sales','developer','marketing','finance','support']},
  {id:'profitability',name:'Client Profitability',group:'Clienți și livrare',detail:'Venituri, costuri, ore, marjă și evaluarea relației.',roles:['finance']},
  {id:'contracts',name:'Contracts & Renewals',group:'Clienți și livrare',detail:'Contracte, valori, termene și reînnoiri.',roles:[]},
  {id:'changes',name:'Change Requests',group:'Clienți și livrare',detail:'Modificări separate de proiect și costuri aprobate.',roles:[]},
  {id:'sla',name:'SLA & Deadlines',group:'Clienți și livrare',detail:'Termene, responsabil și avertizare înainte de scadență.',roles:['sales','developer','support']},
  {id:'deliverables',name:'Deliverables Tracker',group:'Clienți și livrare',detail:'Livrabilele proiectelor la care ai acces.',roles:['general','sales','developer','marketing','support']},
  {id:'onboarding',name:'Client Onboarding',group:'Clienți și livrare',detail:'Checklist reutilizabil pentru pornirea unui proiect.',roles:['sales','support']},
  {id:'offboarding',name:'Client Offboarding',group:'Clienți și livrare',detail:'Predare, export, backup și arhivare urmărite explicit.',roles:['developer','support']},
  {id:'appointments',name:'Programări',group:'Clienți și livrare',detail:'Calendar, responsabil și protecție contra suprapunerilor.',roles:[]},
  {id:'infrastructure',name:'Infrastructure Health',group:'Infrastructură și securitate',detail:'Stare verificată, sursă și vechimea ultimei probe.',roles:['developer']},
  {id:'integrations',name:'Integrations Health',group:'Infrastructură și securitate',detail:'Conexiuni, erori și conturi care așteaptă activare.',roles:[]},
  {id:'security',name:'Security Center',group:'Infrastructură și securitate',detail:'Evenimente de acces, incidente și constatări.',roles:[]},
  {id:'errors',name:'Error Center',group:'Infrastructură și securitate',detail:'Erori API, email, automatizări și agenți într-un singur loc.',roles:['developer']},
  {id:'backup',name:'Backup & Recovery',group:'Infrastructură și securitate',detail:'Dovezi de backup, teste de restaurare și cereri controlate.',roles:[]},
  {id:'domains',name:'Domains & Digital Assets',group:'Cunoaștere și active',detail:'Domenii, expirări, DNS, SSL, valoare și oportunități.',roles:['developer','sales']},
  {id:'documents',name:'Knowledge / Documents Hub',group:'Cunoaștere și active',detail:'Caută documente, cunoștințe aprobate și materiale interne.',roles:[]},
  {id:'vault',name:'Asset Vault',group:'Cunoaștere și active',detail:'Inventar de active și secrete criptate, cu acces auditat.',roles:[]},
  {id:'plugins',name:'Pluginuri',group:'Cunoaștere și active',detail:'Capabilități AVY Engine, starea revizuirii și permisiuni.',roles:[]},
  {id:'privacy',name:'Privacy & Consent',group:'Conformitate și creștere',detail:'Cereri, dovezi de consimțământ și politici active.',roles:[]},
  {id:'compliance',name:'Legal / Compliance Calendar',group:'Conformitate și creștere',detail:'Termene contractuale, accesibilitate și revizuirea politicilor.',roles:[]},
  {id:'experiments',name:'Experiment Center',group:'Conformitate și creștere',detail:'Ipoteze, perioade și concluzii ale experimentelor.',roles:[]},
  {id:'comments',name:'Comentarii',group:'Conformitate și creștere',detail:'Moderare centralizată pentru blog și pagini.',roles:['marketing','support']},
  {id:'visits',name:'Vizite',group:'Conformitate și creștere',detail:'Trafic first-party pe pagini, zile și conversii.',roles:['sales','marketing']},
  {id:'newsletter',name:'Abonați / Newsletter',group:'Conformitate și creștere',detail:'Registru de abonați, proveniență și consimțământ.',roles:['marketing']},
] as const;
export type CenterId = typeof centers[number]['id'];
export type StaffPolicy = {department:Department;job_title:string;read:CenterId[];write:CenterId[];revision:number};
export const defaultReads = (department:Department):CenterId[] => centers.filter(c=>(c.roles as readonly string[]).includes(department)).map(c=>c.id);
export const ownerOnly: readonly CenterId[] = ['approvals','runs','automations','contracts','changes','appointments','integrations','security','backup','documents','vault','plugins','privacy','compliance','experiments'];
export const centerIds = centers.map(c=>c.id);
