var cp = require('child_process');
var fs = require('fs');
task('default', function() {
	cp.exec('tsc @build.txt').on('exit', function(){
		cp.exec('tsc @buildworker.txt').on('exit', function(){
			var marked = fs.readFileSync('src/marked.js');
			fs.writeFileSync('generator/generator.js', marked + '\n' + fs.readFileSync('generator/generator.js'));
			fs.writeFileSync('generator/worker.js', marked + '\n' + fs.readFileSync('generator/worker.js'));
			console.log('success');					
		});
	});
});