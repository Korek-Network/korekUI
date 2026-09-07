import {copyFile,mkdir,readFile,writeFile,chmod} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const source=process.argv[2];if(!source)throw Error('Usage: node scripts/bundle-node.mjs /path/to/tested-native-node');
const directory='node-bundle';await mkdir(directory,{recursive:true});
const bytes=await readFile(source),sha256=createHash('sha256').update(bytes).digest('hex');
const cross=process.argv[3];if(cross&&cross!=='--windows-x64')throw Error('Only --windows-x64 cross packaging is supported');
const platform=cross?'win32':process.platform,arch=cross?'x64':process.arch;
if(platform==='win32'){
 const offset=bytes.length>=64?bytes.readUInt32LE(60):0;
 if(bytes.toString('ascii',0,2)!=='MZ'||offset<64||offset+6>bytes.length||bytes.readUInt32LE(offset)!==0x4550||bytes.readUInt16LE(offset+4)!==0x8664)throw Error('Expected a Windows x64 PE executable');
}
const target=join(directory,platform==='win32'?'korek-node.exe':'korek-node');await copyFile(source,target);await chmod(target,0o755);
await writeFile(join(directory,'manifest.json'),JSON.stringify({platform,arch,sha256},null,2));
console.log('Bundled native node '+sha256);
