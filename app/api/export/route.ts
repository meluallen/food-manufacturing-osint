import {getChatGPTUser} from '@/app/chatgpt-auth';
import {loadWorkspace,database} from '@/lib/workspace';
export async function GET(){
  if(!await getChatGPTUser()&&!(import.meta as any).env?.DEV)return Response.json({error:'Authentication required'},{status:401});
  try{const w=await loadWorkspace();const audit=await database().prepare('SELECT action,record_id,at,payload FROM audit ORDER BY at DESC').all();return new Response(JSON.stringify({...w,audit:audit.results},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="watershed-intelligence-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store'}});}catch{return Response.json({error:'Export unavailable'},{status:503});}
}
