var path = require("path");
var fs = require("fs");
var cp = require("child_process");

var dt = "./DefinitelyTyped";
fs.readdirSync(dt).forEach(function(dir){
	var _dir = path.join(dt, dir);
	var stat = fs.statSync(_dir);
	if(stat.isDirectory()){
		fs.readdirSync(_dir).forEach(function(file){
			if(file.match(/^.*\.d\.ts$/)){
				cp.exec("node bin/dtsdoc --out docs " + path.join(_dir, file), function(err, stdout, stderr){
					if(stdout) console.log(stdout);
					if(stderr) console.log(stderr);
					if(err) console.log(err);
				});	
			}
		});
	}
});

var links = [];
fs.readdirSync('docs').forEach(function(file){
	links.push('<li><a href="' + file + '">' + file + '</a></li>');
});
fs.writeFileSync('docs/index.html', links.join('\n'));
