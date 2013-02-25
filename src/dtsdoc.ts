/// <reference path="../../DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../Parsect/src/parsect.ts" />
/// <reference path="../../Parsect/src/globals.ts" />

/// <reference path="html.ts" />
/// <reference path="primitives.ts" />
/// <reference path="links.ts" />
/// <reference path="type.ts" />
/// <reference path="parser.ts" />

import fs = module("fs");

export function toHTMLDocument(input:string):string{
    var result:DTSDoc.GenerationResult = DTSDoc.generateDocument(input, (v:number)=>{ 
    	process.stdout.write('*'); 
    });
    if(result.type === DTSDoc.GenerationResultType.Success){
    	//console.log(process.argv[1]);
    	var match = /(.*[\/\\])[^\/\\]+/.exec(process.argv[1]);
    	var dir = match ? match[1] : "";
		var styles:string = fs.readFileSync(dir + 'style.css').toString();
		var template:string = fs.readFileSync(dir + 'template.html').toString();
		template = template.replace('<!-- CSS Content -->', styles);
	    template = template.replace('<!-- Document Content -->', result.docs);
    	return template;				    
	}else if(result.type === DTSDoc.GenerationResultType.Fail){
		console.log('fail');
	}
}