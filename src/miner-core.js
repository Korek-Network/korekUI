export const APP_VERSION="0.1.0";
export const MINER_PROTOCOL="korek-planck-miner/1";
export const PLANCK_NETWORK="korek-planck-testnet-1";
export const DEFAULT_NODE_URL="http://127.0.0.1:9833";

export function normalizeNodeUrl(value){const url=new URL(String(value||DEFAULT_NODE_URL).trim());if(!["http:","https:"].includes(url.protocol))throw new Error("Node URL must use HTTP or HTTPS");return url.origin}
export function validateInnerHash(value){const hash=String(value||"").trim().toLowerCase();if(!/^[0-9a-f]{64}$/.test(hash))throw new Error("Inner hash must contain exactly 64 hexadecimal characters");return hash}
export function rewardAddress(innerHash){return`krk1${validateInnerHash(innerHash).slice(0,40)}`}
export function formatKrk(atomic){return(Number(atomic)/1e8).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:8})}
export function miningStats(blocks,totalAtomic,startedAt,now=Date.now()){const elapsed=Math.max(1,now-startedAt),minutes=elapsed/60_000;return{blocks,blocksPerMinute:blocks/minutes,totalAtomic:String(totalAtomic),elapsedMs:elapsed}}
