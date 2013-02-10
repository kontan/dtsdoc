/// <reference path='typings/node.d.ts'/>
import fs = module("fs");
import cp = module("child_process");

function compile(out:string, ...files:string[]){
	var command:string = "tsc --out " + out;
	files.forEach((file)=>{
		command += ' ' + file;
	});
	console.log(command);
	var tsc = cp.spawn("tsc", ['--out', out].concat(files), {});
	tsc.stdout.setEncoding('utf8');
	tsc.stderr.setEncoding('utf8');
	tsc.stdout.on('data', (data)=>{
		console.log("[[stdout]]" + data.toString('utf8'));
	});
	tsc.stderr.on('data', (data)=>{
		console.log("[[stderr]]" + data.toString('utf8'));
	});
	tsc.on('exit', (data)=>{
		console.log("exit.");
	});
}


console.log("building...");
compile("test/generator.js", "src/type.ts",  "src/parser.ts", "src/web.ts");
compile("build/typedoc.js", "src/type.ts",  "src/parser.ts", "src/command.ts");

