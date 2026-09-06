const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("korekMiner",{
 status:(base,authToken="")=>ipcRenderer.invoke("miner:status",{base,authToken}),start:input=>ipcRenderer.invoke("miner:start",input),stop:()=>ipcRenderer.invoke("miner:stop"),hardware:()=>ipcRenderer.invoke("miner:hardware"),version:()=>ipcRenderer.invoke("app:version"),onUpdate:callback=>ipcRenderer.on("miner:update",(_event,payload)=>callback(payload)),
 wallet:{create:password=>ipcRenderer.invoke("wallet:create",password),restore:input=>ipcRenderer.invoke("wallet:restore",input),open:password=>ipcRenderer.invoke("wallet:open",password),lock:()=>ipcRenderer.invoke("wallet:lock"),summary:()=>ipcRenderer.invoke("wallet:summary"),balance:apiUrl=>ipcRenderer.invoke("wallet:balance",apiUrl),send:input=>ipcRenderer.invoke("wallet:send",input),openOfficial:()=>ipcRenderer.invoke("app:open-wallet")}
});
