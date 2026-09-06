import { createHash,createHmac,randomBytes } from "node:crypto";

export const APP_VERSION="0.3.5";
export const MINER_PROTOCOL="korek-planck-miner/3";
export const PLANCK_NETWORK="korek-planck-testnet-1";
export const DEFAULT_NODE_URL="https://rpc.planck.korek.network";
export const DEFAULT_API_URL="https://rpc.planck.korek.network";

export function normalizeUrl(value,fallback=DEFAULT_NODE_URL){const url=new URL(String(value||fallback).trim());if(!["http:","https:"].includes(url.protocol))throw new Error("Endpoint must use HTTP or HTTPS");return url.origin}
export const normalizeNodeUrl=value=>normalizeUrl(value,DEFAULT_NODE_URL);
export const normalizeApiUrl=value=>normalizeUrl(value,DEFAULT_API_URL);
export function validateInnerHash(value){const hash=String(value||"").trim().toLowerCase();if(!/^[0-9a-f]{64}$/.test(hash))throw new Error("Inner hash must contain exactly 64 hexadecimal characters");return hash}
export function rewardAddress(innerHash){return`krk1${validateInnerHash(innerHash).slice(0,40)}`}
export function formatKrk(atomic){const value=BigInt(atomic||0),whole=value/100_000_000n,fraction=(value%100_000_000n).toString().padStart(8,"0").replace(/0+$/,"");return`${whole.toLocaleString()}${fraction?`.${fraction}`:".00"}`}
export function miningStats(blocks,totalAtomic,startedAt,now=Date.now()){const elapsed=Math.max(1,now-startedAt),minutes=elapsed/60_000;return{blocks,blocksPerMinute:blocks/minutes,totalAtomic:String(totalAtomic),elapsedMs:elapsed}}
export function applyWorkerRate({message,mining,currentSession,workerSession}){
 if(!mining||!currentSession||currentSession!==workerSession||message?.type!=="rate")return null;
 const hashes=Number(message.hashes),elapsedMs=Number(message.elapsedMs);
 if(!Number.isFinite(hashes)||hashes<=0||!Number.isFinite(elapsedMs)||elapsedMs<=0)return null;
 workerSession.hashes+=hashes;
 return Math.round(hashes/(elapsedMs/1000));
}
export function validateResources(input,hardware){const maxThreads=Math.max(1,Number(hardware?.threads||1)),requestedThreads=Number(input?.cpuThreads),cpuThreads=Math.max(0,Math.min(maxThreads,Number.isFinite(requestedThreads)?Math.trunc(requestedThreads):1)),known=new Set((hardware?.gpu||[]).filter(device=>device.usable!==false).map(device=>device.id)),gpuIds=[...new Set((input?.gpuIds||[]).filter(id=>known.has(id)))].slice(0,1),gpuIntensity=Math.max(10,Math.min(100,Math.trunc(Number(input?.gpuIntensity)||100)));if(cpuThreads===0&&gpuIds.length===0)throw new Error("Select at least one CPU thread or one GPU");return{cpuThreads,gpuIds,gpuIntensity}}
export function createMinerAuthHeaders(token,{method="GET",path="/status",body="",timestamp=Date.now(),nonce=randomBytes(16).toString("hex")}={}){if(!token)return{};if(String(token).length<32)throw new Error("Miner authentication token must contain at least 32 characters");const bodyDigest=createHash("sha256").update(body||"").digest("hex"),payload=[method.toUpperCase(),path,String(timestamp),nonce,bodyDigest].join("\n");return{"x-korek-miner-timestamp":String(timestamp),"x-korek-miner-nonce":nonce,"x-korek-miner-signature":createHmac("sha256",token).update(payload).digest("hex")}}
export const miningRequestMessage=({address,timestamp,requestNonce})=>`korek-miner-v3:work:${address}:${timestamp}:${requestNonce}`;
export const miningSubmissionMessage=({templateId,nonce,powHash,timestamp})=>`korek-miner-v3:submit:${templateId}:${nonce}:${powHash}:${timestamp}`;
export function powDigest(challenge,nonce){if(!/^[0-9a-f]{64}$/i.test(String(challenge||"")))throw new Error("Invalid work challenge");if(!Number.isSafeInteger(nonce)||nonce<0||nonce>0xffff_ffff)throw new Error("Invalid mining nonce");const suffix=Buffer.allocUnsafe(4);suffix.writeUInt32BE(nonce);return createHash("sha256").update(Buffer.from(challenge,"hex")).update(suffix).digest("hex")}
export const meetsDifficulty=(hash,difficulty)=>/^[0-9a-f]{64}$/i.test(String(hash||""))&&Number.isInteger(Number(difficulty))&&hash.startsWith("0".repeat(Number(difficulty)));
