// @vitest-environment node
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {it,expect} from 'vitest';
import {DOCUMENT_TEMPLATES,applicableTemplatePayload,templateFields} from '../shared/documents/templates';
import {FAMILY_LEGAL_NOTES,LEGAL_SOURCES,TEMPLATE_STAGES} from '../shared/documents/legal';
import {TEMPLATE_META} from '../features/documents/presentation';
import {plainText,documentIssues,replaceVariables} from '../shared/documents/model';
import {serviceDocumentProfile} from '../shared/documents/services';
import {documentRenderer} from '../shared/documents/design';
it('gives all families four practical traits, a project stage and reviewable official legal references',()=>{
 for(const t of DOCUMENT_TEMPLATES){expect(TEMPLATE_META[t.id].traits).toHaveLength(4);expect(TEMPLATE_META[t.id].stage).toBe(TEMPLATE_STAGES[t.id]);expect(t.payload.labels.__avyron_stage).toBe(`${TEMPLATE_STAGES[t.id]}/5`);for(const source of FAMILY_LEGAL_NOTES[t.id].references)expect(new URL(LEGAL_SOURCES[source].url).protocol).toBe('https:');}
});
it('keeps B2C, international terms and DPA conditional without inventing a withdrawal waiver',()=>{
 const offer=DOCUMENT_TEMPLATES.find(t=>t.id==='offer')!;
 expect(templateFields(applicableTemplatePayload(offer.payload,'offer',{contract_capacity:'B2B'}))).not.toContain('consumer_withdrawal_information');
 const b2c=applicableTemplatePayload(offer.payload,'offer',{contract_capacity:'B2C',cross_border:'yes'});
 expect(plainText(b2c.body)).toContain('OUG nr. 34/2014');
 expect(templateFields(b2c)).toEqual(expect.arrayContaining(['consumer_withdrawal_information','consumer_performance_request','governing_terms','jurisdiction_terms']));
 const incomplete=replaceVariables(b2c,{'provider.address':'Bd. Independenței nr. 20, mun. Iași, jud. Iași'});
 expect(plainText(incomplete.body)).toContain('Activitate / corespondență: Bd. Independenței');
 expect(documentIssues(incomplete).some(issue=>issue.includes('provider.registered_address')||issue.includes('Sediu social confirmat'))).toBe(true);
});
it('uses a new renderer namespace without altering the old or classic export cache',()=>{
 const p=DOCUMENT_TEMPLATES[0].payload;
 expect(documentRenderer(p)).toMatch(/r2/);
 expect(documentRenderer({...p,labels:{__avyron_design:'2026'}})).toMatch(/r1/);
 expect(documentRenderer({...p,labels:{}})).toBe('classic');
});
it('appends only unchanged shared masters and fills only verified missing company identifiers',()=>{
 const db=new DatabaseSync(':memory:');try{
 for(const f of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')&&f<'0116_').sort())db.exec(readFileSync('cloudflare/d1/migrations/'+f,'utf8'));
 const old=db.prepare("SELECT payload_json FROM document_template_versions WHERE id='offer_v2_avyron2026'").get()!.payload_json;
 db.exec("INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,created_at) SELECT 'framework_custom_v3',template_id,3,payload_json,required_fields_json,1 FROM document_template_versions WHERE id='framework_v2_avyron2026'; UPDATE document_template_versions SET review_status='retired' WHERE id='report_v2_avyron2026'; UPDATE document_company_profile SET legal_name='DIGITAL ECOTECH SOLUTIONS S.R.L.',tax_id='55055976',registration_number=NULL,address='Bd. Independenței nr. 20, mun. Iași, jud. Iași'");
 db.exec(readFileSync('cloudflare/d1/migrations/0116_document_legal_financial_sync.sql','utf8'));
 expect(db.prepare("SELECT count(*) n FROM document_template_versions WHERE id LIKE '%_v3_avyron_legal202611' AND review_status='review_required'").get()!.n).toBe(9);
 expect(db.prepare("SELECT payload_json FROM document_template_versions WHERE id='offer_v2_avyron2026'").get()!.payload_json).toBe(old);
 expect(db.prepare('SELECT address,registered_address,registration_number FROM document_company_profile').get()).toMatchObject({address:'Bd. Independenței nr. 20, mun. Iași, jud. Iași',registered_address:null,registration_number:'J2026041938009'});
 expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 }finally{db.close()}
},20_000);

it('adds legal guidance to existing catalog profiles while preserving their authored delivery scope',()=>{
 const custom=JSON.stringify({fields:{pages:'Pagini'},deliverables:'Livrare aprobată',documents:['offer']});
 const profile=serviceDocumentProfile({entity_key:'website',category:'Website'},custom);
 expect(profile.deliverables).toBe('Livrare aprobată');expect(profile.legalNotes?.join(' ')).toContain('Legea nr. 365/2002');
});
