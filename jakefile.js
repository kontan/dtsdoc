var cp = require('child_process');
var fs = require('fs');

task('default', function() {
	jake.exec('tsc @build.txt', function(){
		jake.exec('tsc @buildworker.txt', function(){
			var marked = fs.readFileSync('src/marked.js') + '\n';
			fs.writeFileSync('generator/generator.js', marked + fs.readFileSync('generator/generator.js'));
			fs.writeFileSync('generator/worker.js', marked + fs.readFileSync('generator/worker.js'));
			
			jake.exec('tsc @buildnode.txt', function(){
				fs.writeFileSync('dtsdoc.js', 
					marked +
					fs.readFileSync('temp/Parsect/src/parsect.js')   + '\n' + 
					fs.readFileSync('temp/Parsect/src/globals.js')   + '\n' + 
					fs.readFileSync('temp/dtsdoc/src/html.js')       + '\n' + 
					fs.readFileSync('temp/dtsdoc/src/primitives.js') + '\n' + 
					fs.readFileSync('temp/dtsdoc/src/links.js') + '\n' + 
					fs.readFileSync('temp/dtsdoc/src/type.js')       + '\n' + 
					fs.readFileSync('temp/dtsdoc/src/parser.js')     + '\n' + 
					fs.readFileSync('temp/dtsdoc/src/node.js')
				);
			});				
		});
	});
});