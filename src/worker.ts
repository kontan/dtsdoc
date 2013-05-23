

importScripts("marked.js");
self.onmessage = (event:MessageEvent)=>{
	postMessage(DTSDoc.generateDocument(event.data, (v:number)=>{ 
		postMessage({'type': 'state', 'state': v}, undefined); 
	}), undefined);
};
