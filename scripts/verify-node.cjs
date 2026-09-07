const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
module.exports=async context=>{
 const dir=path.join(context.packager.projectDir,'node-bundle');
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 const binary=path.join(dir,manifest.platform==='win32'?'korek-node.exe':'korek-node');
 const arch={0:'ia32',1:'x64',2:'armv7l',3:'arm64',4:'universal'}[context.arch];
 if(context.electronPlatformName!==manifest.platform||arch!==manifest.arch||crypto.createHash('sha256').update(fs.readFileSync(binary)).digest('hex')!==manifest.sha256)throw Error('Missing, mismatched or damaged native node bundle');
};
