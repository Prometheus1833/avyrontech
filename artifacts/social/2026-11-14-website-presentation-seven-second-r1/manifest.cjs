const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const sharp=require('sharp');
const root=__dirname;

async function main(){
  const files=[];
  for(const dir of ['masters','exports','previews','sources']){
    for(const name of fs.readdirSync(path.join(root,dir)).sort()){
      const p=path.join(root,dir,name),st=fs.statSync(p);
      if(!st.isFile())continue;
      const b=fs.readFileSync(p),row={path:path.relative(root,p),bytes:st.size,sha256:crypto.createHash('sha256').update(b).digest('hex')};
      try{const m=await sharp(p).metadata();row.width=m.width;row.height=m.height;row.format=m.format;}catch{}
      files.push(row);
    }
  }
  for(const name of ['package.md','sources.md','render.cjs','montage.cjs','video-qa.cjs','manifest.cjs']){
    const p=path.join(root,name),b=fs.readFileSync(p);
    files.push({path:name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});
  }
  const manifest={
    package_id:'WEBSITE-PREZENTARE-7-SEC-R1',revision:'R1',created_at:'2026-11-14T20:10:00+02:00',timezone:'Europe/Bucharest',mode:'free_only',status:'pending_approval',
    project_id:'aip_avyron_web',agent_id:'ai-prod-content',content_id:null,sourceRef:'daily-editorial:website-presentation-seven-second',sourceRevision:'R1',updated_at:'2026-11-14T20:10:00+02:00',
    central_theme:'Testul fără logo în 7 secunde pentru website-uri de prezentare',mechanism:['self_reference','immediate_value'],
    creative_fingerprint:'seven-second-logo-cover_scan-interface_dark-violet-lime_real-portfolio_self-reference_r1',
    conversion_path:{service_url:'https://avyron.ro/servicii/website-prezentare-profesional',form_status:'not_used',instagram_bio_exact_service_verified:false},
    asset_pipeline:{source_resolution:'3840x2160 desktop captures; 1080x1920 mobile capture; 128x128 canonical logo',master_resolution:'3200x4000, 3200x1800, 2160x3840',method:'SVG composition with Sharp using real AVYRON captures; Playwright motion render',native_export:'1080x1350 PNG, 1600x900 PNG, 1080x1920 PNG, 1080x1920 WebM',downsample:'Lanczos3 from larger compositions; source dimensions preserved in provenance',compression:'PNG level 9; browser-recorded WebM',duration_seconds:19.96,fps:25,artifact_verdict:'pass_no_visible_artifacts_frames_present_no_black_preroll'},
    connector_state:{facebook:'available_read_only_not_reverified_for_publish',instagram:'available_read_only_not_reverified_for_publish',threads:'available_read_only_not_reverified_for_publish',tiktok:'available_read_only_not_reverified_for_publish',linkedin:'available_read_only_not_reverified_for_publish',whatsapp:'not_checked_for_publish',avyron_os:'awaiting_connection'},
    external_effects:{publish:'not_executed',schedule:'not_executed',delete_or_replace_previous:'not_authorized'},files
  };
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
main().catch((error)=>{console.error(error);process.exit(1)});
