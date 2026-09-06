import { createHash,createHmac,randomBytes } from "node:crypto";

export const APP_VERSION="0.2.2";
export const MINER_PROTOCOL="korek-planck-miner/2";
export const PLANCK_NETWORK="korek-planck-testnet-1";
export const DEFAULT_NODE_URL="http://127.0.0.1:9833";
export const DEFAULT_API_URL="http://127.0.0.1:8365";

export function normalizeUrl(value,fallback=DEFAULT_NODE_URL){const url=new URL(String(value||fallback).trim());if(!["http:","https:"].includes(url.protocol))throw new Error("Endpoint must use HTTP or HTTPS");return url.origin}
export const normalizeNodeUrl=value=>normalizeUrl(value,DEFAULT_NODE_URL);
export const normalizeApiUrl=value=>normalizeUrl(value,DEFAULT_API_URL);
export function validateInnerHash(value){const hash=String(value||"").trim().toLowerCase();if(!/^[0-9a-f]{64}$/.test(hash))throw new Error("Inner hash must contain exactly 64 hexadecimal characters");return hash}
export function rewardAddress(innerHash){return`krk1${validateInnerHash(innerHash).slice(0,40)}`}
export function formatKrk(atomic){const value=BigInt(atomic||0),whole=value/100_000_000n,fraction=(value%100_000_000n).toString().padStart(8,"0").replace(/0+$/,"");return`${whole.toLocaleString()}${fraction?`.${fraction}`:".00"}`}
export function miningStats(blocks,totalAtomic,startedAt,now=Date.now()){const elapsed=Math.max(1,now-startedAt),minutes=elapsed/60_000;return{blocks,blocksPerMinute:blocks/minutes,totalAtomic:String(totalAtomic),elapsedMs:elapsed}}
export function validateResources(input,hardware){const maxThreads=Math.max(1,Number(hardware?.threads||1)),cpuThreads=Math.max(1,Math.min(maxThreads,Math.trunc(Number(input?.cpuThreads)||1))),known=new Set((hardware?.gpu||[]).map(device=>device.id)),gpuIds=[...new Set((input?.gpuIds||[]).filter(id=>known.has(id)))];return{cpuThreads,gpuIds}}
export function createMinerAuthHeaders(token,{method="GET",path="/status",body="",timestamp=Date.now(),nonce=randomBytes(16).toString("hex")}={}){if(!token)return{};if(String(token).length<32)throw new Error("Miner authentication token must contain at least 32 characters");const bodyDigest=createHash("sha256").update(body||"").digest("hex"),payload=[method.toUpperCase(),path,String(timestamp),nonce,bodyDigest].join("\n");return{"x-korek-miner-timestamp":String(timestamp),"x-korek-miner-nonce":nonce,"x-korek-miner-signature":createHmac("sha256",token).update(payload).digest("hex")}}
