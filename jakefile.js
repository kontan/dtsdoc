var cp = require('child_process');
var fs = require('fs');

function copyFile(from, to){
	var fromFile = fs.createReadStream(from);
	var toFile = fs.createWriteStream(to);
	toFile.once('open', function(fd){
	    require('util').pump(fromFile, toFile);
	});
}

function concatFiles(out, files){
	var result = "";
	files.forEach(function(file){
		result += fs.readFileSync(file) + '\n';
	});
	fs.writeFileSync(out, result);
}

var commonOptions = [
	'--target ES5',
	'--out temp',
	'../Parsect/src/parsect.ts',
	'../Parsect/src/globals.ts',
	'src/html.ts',
	'src/primitives.ts',
	'src/links.ts',
	'src/type.ts',
	'src/parser.ts'
];

task('node', function(){
	var options = commonOptions.concat(['--out temp', 'src/node.ts']).join(' ');
	jake.exec('tsc ' + options, function(){
		concatFiles('build/node/dtsdoc.js', [
			'temp/Parsect/src/parsect.js',
			'temp/Parsect/src/globals.js',
			'temp/dtsdoc/src/html.js',
			'temp/dtsdoc/src/primitives.js',
			'temp/dtsdoc/src/links.js',
			'temp/dtsdoc/src/type.js',
			'temp/dtsdoc/src/parser.js',
			'temp/dtsdoc/src/node.js'
		]);
	});
	copyFile('src/marked.js', 'build/node/marked.js');
});

task('web', function(){
	var options = commonOptions.concat(['--out build/web/generator.js', 'src/generator.ts']).join(' ');
	jake.exec('tsc ' + options, function(){
		concatFiles('build/web/generator.js', ['src/marked.js', 'build/web/generator.js']);
	});
	copyFile('src/style.css', 'build/web/style.css');
	copyFile('src/templete.html', 'build/web/templete.html');
	copyFile('src/index.html', 'build/web/index.html');
	copyFile('src/sample.d.ts', 'build/web/sample.d.ts');
	copyFile('src/jquery-1.8.3.js', 'build/web/jquery-1.8.3.js');
});

task('worker', function(){
	var options = commonOptions.concat(['--out build/web/worker.js', 'src/worker.ts']).join(' ');
	jake.exec('tsc ' + options, function(){
		concatFiles('build/web/worker.js', ['src/marked.js', 'build/web/worker.js']);
	});
});

task('default', function() {
	jake.Task['web'].invoke();
	jake.Task['worker'].invoke();
	jake.Task['node'].invoke();
});