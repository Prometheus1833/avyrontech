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
    package_id:'WEBSITE-PREZENTARE-7-SEC-R1',revision:'R1',created_at:'2026-11-14T20:10:00+02:00',timezone:'Europe/Bucharest',mode:'free_only',status:'executed_with_platform_blockers',
    project_id:'aip_avyron_web',agent_id:'ai-prod-content',content_id:null,sourceRef:'daily-editorial:website-presentation-seven-second',sourceRevision:'R1',updated_at:'2026-11-15T10:55:00+02:00',
    approval:{status:'approved_in_chat',reference:'APROBARE NECESARĂ / Audit 14.11.2026, free_only: aprob',scope:'exact WEBSITE-PREZENTARE-7-SEC-R1 placement matrix'},
    central_theme:'Testul fără logo în 7 secunde pentru website-uri de prezentare',mechanism:['self_reference','immediate_value'],
    creative_fingerprint:'seven-second-logo-cover_scan-interface_dark-violet-lime_real-portfolio_self-reference_r1',
    conversion_path:{service_url:'https://avyron.ro/servicii/website-prezentare-profesional',form_status:'not_used',instagram_bio_exact_service_verified:false},
    asset_pipeline:{source_resolution:'3840x2160 desktop captures; 1080x1920 mobile capture; 128x128 canonical logo',master_resolution:'3200x4000, 3200x1800, 2160x3840',method:'SVG composition with Sharp using real AVYRON captures; Playwright motion render; lossless PDF assembly from approved LinkedIn PNG pages; H.264 MP4 transcode for native upload compatibility',native_export:'1080x1350 PNG, 1600x900 PNG, 1080x1920 PNG, 1080x1920 WebM, 1080x1920 MP4 H.264 yuv420p, 4-page PDF',downsample:'Lanczos3 from larger compositions; source dimensions preserved in provenance',compression:'PNG level 9; browser-recorded WebM; H.264 High profile MP4; PDF 1.3',duration_seconds:19.96,fps:25,artifact_verdict:'pass_no_visible_artifacts_frames_present_no_black_preroll'},
    connector_state:{facebook:'available_verified_publish',instagram:'available_verified_publish_feed_and_reel_story_unsupported_web',threads:'available_verified_publish',tiktok:'available_identity_verified_upload_blocked_in_iab',linkedin:'available_verified_schedule',whatsapp:'available_verified_status_publish',avyron_os:'pending_readback_not_claimed'},
    placement_ledger:[
      {platform:'Facebook',account:'AVYRON Page',placement:'feed',status:'published_verified',url:'https://www.facebook.com/photo/?fbid=122134405592345272&set=a.122101154210345272',qa:'identity_caption_crop_alt_text_cta_route_verified'},
      {platform:'Facebook',account:'Avyron Dev',placement:'feed',status:'published_verified',url:'https://www.facebook.com/photo/?fbid=122117062646343981&set=a.122094069284343981',qa:'identity_caption_crop_verified_cta_anchor_and_route_verified'},
      {platform:'Instagram',account:'@avyrontech',placement:'carousel',status:'published_verified',url:'https://www.instagram.com/avyrontech/p/DfvAPHqEftw/',qa:'five_cards_order_caption_and_alt_text_verified'},
      {platform:'Instagram',account:'@avyrontech',placement:'story',status:'unsupported',url:null,qa:'web_create_menu_exposes_no_story_composer'},
      {platform:'Instagram',account:'@avyrontech',placement:'reel',status:'published_verified',url:'https://www.instagram.com/avyrontech/reel/DfvA09ARna1/',qa:'9x16_cover_caption_video_render_verified'},
      {platform:'Threads',account:'@avyrontech',placement:'post',status:'published_verified',url:'https://www.threads.com/@avyrontech/post/DfvA-26EYZi',qa:'identity_text_asset_verified'},
      {platform:'TikTok',account:'@avyron4',placement:'video',status:'blocked_with_reason',url:null,qa:'official_studio_and_identity_verified_file_chooser_unavailable_in_iab_no_upload'},
      {platform:'WhatsApp',account:'AVYRON Business',placement:'status',status:'published_verified',url:null,qa:'status_1_of_1_asset_caption_and_live_timestamp_verified'},
      {platform:'LinkedIn',account:'Avyron Solutions',placement:'document_carousel',status:'scheduled_verified',url:null,scheduled_for:'2026-11-16T09:05:00+02:00',qa:'identity_four_page_pdf_caption_and_schedule_toast_verified'}
    ],
    external_effects:{publish:'executed_verified_on_accessible_placements',schedule:'linkedin_verified_2026-11-16T09:05:00+02:00',delete_or_replace_previous:'not_authorized_and_not_executed'},files
  };
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
main().catch((error)=>{console.error(error);process.exit(1)});
