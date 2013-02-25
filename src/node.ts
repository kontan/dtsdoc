/// <reference path="../../DefinitelyTyped/node/node.d.ts" />

import fs = module("fs");

process.argv.slice(2).forEach((val:string, index:number)=>{
	console.log('generating for \"' + val + '\"...');

    var script:string = fs.readFileSync(val).toString();
    var result:DTSDoc.GenerationResult = DTSDoc.generateDocument(script, (v:number)=>{ process.stdout.write('*'); });
    if(result.type === DTSDoc.GenerationResultType.Success){
    	fs.writeFileSync("result.html", result.docs);
	}else if(result.type === DTSDoc.GenerationResultType.Fail){
		console.log('fail');
	}
});

