var cp = require('child_process');
var fs = require('fs');

function copyFile(from, to){
	var fromFile = fs.createReadStream(from);
	var toFile = fs.createWriteStream(to, { flags: 'w+'});
	toFile.once('open', function(fd){
	    require('util').pump(fromFile, toFile);
	});
	console.log('copying from ' + from + ' to ' + to);
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
	//'src/html.ts',
	//'src/primitives.ts',
	//'src/links.ts',
	//'src/type.ts',
	'src/parser.ts'
];

task('node', function(){
	exec('tsc ' + commonOptions.concat(['--out temp', 'src/command.ts']).join(' '), function(){
		copyFile('src/marked.js', 'build/node/marked.js');
		copyFile('src/template.html', 'build/node/template.html');
		copyFile('src/style.css', 'build/node/style.css');
		copyFile('temp/dtsdoc/src/command.js', 'build/node/command.js');
		concatFiles('build/node/dtsdoc.js', [
			'temp/Parsect/src/parsect.js',
			'temp/Parsect/src/globals.js',
			'temp/dtsdoc/src/html.js',
			'temp/dtsdoc/src/primitives.js',
			'temp/dtsdoc/src/links.js',
			'temp/dtsdoc/src/type.js',
			'temp/dtsdoc/src/parser.js',
			'temp/dtsdoc/src/paralet.js',
			'temp/dtsdoc/src/dtsdoc.js'
		]);

	});
});

task('web', function(){
	exec('tsc ' + commonOptions.concat(['--out build/web/generator.js', 'src/generator.ts']).join(' '), function(){
		concatFiles('build/web/generator.js', ['src/marked.js', 'build/web/generator.js']);
		copyFile('src/style.css', 'build/web/style.css');
		copyFile('src/template.html', 'build/web/template.html');
		copyFile('src/index.html', 'build/web/index.html');
		copyFile('src/sample.d.ts', 'build/web/sample.d.ts');
		copyFile('src/jquery-1.8.3.js', 'build/web/jquery-1.8.3.js');	
	});
});

task('worker', function(){
	exec('tsc ' + commonOptions.concat(['--out build/web/worker.js', 'src/worker.ts']).join(' '), function(){
		concatFiles('build/web/worker.js', ['src/marked.js', 'build/web/worker.js']);	
	});
});

task('default', {async: true}, function() {
	jake.Task['web'].invoke();
	jake.Task['worker'].invoke();
	jake.Task['node'].invoke();
});