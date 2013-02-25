import fs = module("fs");
import dtsdoc = module("./dtsdoc");

var files = process.argv.slice(2);
files.forEach((file:string)=>{
	var matches = /^(.+)(\.d\.ts)$/.exec(file);
	if(matches){
		var code:string = fs.readFileSync(file).toString();
		var html:string = dtsdoc.toHTMLDocument(code);
		fs.writeFileSync(matches[1] + ".d.html", html);		
	}else{
		console.log('file "' + file + '" is not a ambient source file.');
	}
});