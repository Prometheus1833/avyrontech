/** A dedicated public survey surface; private links never share a cached response. */
export async function serveSurveyHost(request:Request,assets:{fetch:(r:Request)=>Promise<Response>}):Promise<Response|null>{
 const url=new URL(request.url);if(url.hostname!=='surveys.avyron.ro')return null;
 if(url.pathname.startsWith('/api/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const privatePage=url.pathname.startsWith('/s/')||url.pathname==='/auth';
 const base={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cache-Control':privatePage?'private, no-store':'public, max-age=300','X-Robots-Tag':privatePage?'noindex, nofollow':'index, follow'};
 if(url.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /intern/\nSitemap: https://surveys.avyron.ro/sitemap.xml\n',{headers:{...base,'Content-Type':'text/plain; charset=utf-8'}});
 if(url.pathname==='/sitemap.xml')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://surveys.avyron.ro/</loc></url></urlset>',{headers:{...base,'Content-Type':'application/xml; charset=utf-8'}});
 if(url.pathname==='/surveys')return Response.redirect(`https://surveys.avyron.ro/${url.search}`,301);
 if(url.pathname==='/gdpr'||url.pathname==='/termeni')return Response.redirect(`https://avyron.ro${url.pathname}`,302);
 if(url.pathname.startsWith('/assets/')||['/favicon.ico','/favicon.svg','/site.webmanifest','/apple-touch-icon.png'].includes(url.pathname))return assets.fetch(request);
 const known=url.pathname==='/'||url.pathname==='/auth'||/^\/s\/[a-f0-9]{64}$/.test(url.pathname);
 const path=url.pathname==='/'?'/surveys/index.html':known?'/_shell.html':'/404.html';
 let asset=await assets.fetch(new Request(new URL(path,url.origin),{method:request.method}));
 // Static Assets may canonicalize .html paths. Follow only local asset redirects.
 for(let hop=0;hop<3&&asset.status>=300&&asset.status<400;hop++){const location=asset.headers.get('Location');if(!location)break;const target=new URL(location,url.origin);if(target.origin!==url.origin||target.pathname.startsWith('/api/')||target.pathname.startsWith('/s/'))break;asset=await assets.fetch(new Request(target,{method:request.method}));}
 const headers=new Headers(asset.headers);Object.entries(base).forEach(([k,v])=>headers.set(k,v));headers.set('Content-Type','text/html; charset=utf-8');if(!known)headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(asset.body,{status:asset.ok?(known?200:404):503,headers});
}
