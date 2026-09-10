import {env} from 'cloudflare:workers';
export const bindings=env as unknown as {DB:D1Database;MODEL_API_KEY?:string;MODEL_BASE_URL?:string;MODEL_NAME?:string};
export function db(){if(!bindings.DB)throw new Error('数据库尚未配置');return bindings.DB}
export function owner(request:Request){const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('atom_session='))?.slice(13);return value&&/^[a-f0-9-]{36}$/.test(value)?value:null}
export function json(data:unknown,status=200,token?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...(token?{'Set-Cookie':`atom_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`}:{})}})}
export function error(message:string,status=400){return json({error:message},status)}
