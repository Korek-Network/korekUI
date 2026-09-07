import {copyFile,mkdir,readFile,writeFile,chmod} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const source=process.argv[2];if(!source)throw Error('Usage: node scripts/bundle-node.mjs /path/to/tested-native-node');
const directory='node-bundle';await mkdir(directory,{recursive:true});
const bytes=await readFile(source),sha256=createHash('sha256').update(bytes).digest('hex');
const target=join(directory,process.platform==='win32'?'korek-node.exe':'korek-node');await copyFile(source,target);await chmod(target,0o755);
await writeFile(join(directory,'manifest.json'),JSON.stringify({platform:process.platform,arch:process.arch,sha256},null,2));
console.log('Bundled native node '+sha256);
