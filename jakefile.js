var cp = require('child_process');
var fs = require('fs');
var path = require('path');

function copyFile(from, to){
	var destDir = path.dirname(to);
	if( ! fs.existsSync(destDir)){
		fs.mkdirSync(destDir);
	}

	var fromFile = fs.createReadStream(from);
	var toFile = fs.createWriteStream(to, { flags: 'w+'});
	toFile.once('open', function(fd){
	    require('util').pump(fromFile, toFile);
	});
	console.log('copy ' + from + ' -> ' + to);
}

function concatFiles(out, files){
	var result = "";
	files.forEach(function(file){
		result += fs.readFileSync(file) + '\n';
	});
	fs.writeFileSync(out, result);
}

function exec(command, func){
	console.log(command);
	//jake.exec(command, {printStdout: true, printStderr: true }, func);

	var ex = jake.createExec([command], {printStdout: true, printStderr: true });
	ex.addListener('stdout', function (msg) {
		console.log('stdout: ' + msg.toString());
	});
	ex.addListener('stderr', function (msg) {
		console.log('stderr: ' + msg.toString());
	});
	ex.addListener('error', function (msg, code) {
		console.log('error(' + code + '): ' + msg.toString());
	});
	ex.addListener('cmdEnd', func);
	ex.run();
}

var commonOptions = [
	'--target ES5',
	'src/parser.ts'
];

task('node', function(){
	exec('tsc ' + commonOptions.concat(['--out temp', 'src/dtsdoc.ts']).join(' '), function(){
		copyFile('src/template.html', 'bin/template.html');
		copyFile('src/style.css', 'bin/style.css');
		copyFile('temp/dtsdoc/src/dtsdoc.js', 'bin/dtsdoc.js');
		concatFiles('bin/dtsdoclib.js', [
			'src/marked.js',
			'temp/Parsect/src/parsect.js',
			'temp/Parsect/src/globals.js',
			'temp/dtsdoc/src/htmlemitter.js',
			'temp/dtsdoc/src/primitives.js',
			'temp/dtsdoc/src/links.js',
			'temp/dtsdoc/src/type.js',
			'temp/dtsdoc/src/parser.js',
			'temp/dtsdoc/src/dtsdoclib.js'
		]);
	});
});

task('web', function(){
	exec('tsc ' + commonOptions.concat(['--out web/webdtsdoc.js', 'src/webdtsdoc.ts']).join(' '), function(){
		concatFiles('web/webdtsdoc.js', ['src/marked.js', 'web/webdtsdoc.js']);
		copyFile('src/style.css', 'web/style.css');
		copyFile('src/template.html', 'web/template.html');
		copyFile('src/index.html', 'web/index.html');
		copyFile('src/sample.d.ts', 'web/sample.d.ts');
		copyFile('src/jquery-1.8.3.js', 'web/jquery-1.8.3.js');	
	});
});

task('worker', function(){
	exec('tsc ' + commonOptions.concat(['--out web/worker.js', 'src/worker.ts']).join(' '), function(){
		concatFiles('web/worker.js', ['src/marked.js', 'web/worker.js']);	
	});
});

task('default', {async: true}, function() {
	jake.Task['web'].invoke();
	jake.Task['worker'].invoke();
	jake.Task['node'].invoke();
});