/// <reference path="../../DefinitelyTyped/node/node.d.ts" />
/// <reference path="../../Parsect/src/parsect.ts" />
/// <reference path="../../Parsect/src/globals.ts" />

/// <reference path="htmlemitter.ts" />
/// <reference path="primitives.ts" />
/// <reference path="links.ts" />
/// <reference path="type.ts" />
/// <reference path="parser.ts" />

import fs = module("fs");

export function toHTMLDocument(input:string):string{
    function tryGetFile(path: string, defaultValue: string,){
        try{ 
            return fs.readFileSync(path).toString();
        }catch(e){ 
            console.log('[Warning] toHTMLDocument: ' + path + ' not found.'); 
            return defaultValue;
        } 
    }
    var result:DTSDoc.GenerationResult = DTSDoc.generateDocument(input, (v:number)=>{ 
    	//process.stdout.write('*'); 
    });
    if(result.type === DTSDoc.GenerationResultType.Success){
    	//console.log(process.argv[1]);
    	var match = /(.*[\/\\])[^\/\\]+/.exec(process.argv[1]);
    	var dir = match ? match[1] : "";
		var styles:string = tryGetFile(dir + 'style.css', "");
        var template:string = tryGetFile(dir + 'template.html', "<!-- CSS Content --><!-- Document Content -->");
		template = template.replace('<!-- CSS Content -->', styles);
	    template = template.replace('<!-- Document Content -->', result.docs);
    	return template;				    
	}else if(result.type === DTSDoc.GenerationResultType.Fail){
		console.log('fail');
	}
}