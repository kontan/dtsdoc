module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-connect');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: {
			temp: [ 'temp/*','temp/' ],
			web: [ 'web/*' ],
			bin: [
				'bin/template.html',
				'bin/dtsdoc.js',
				'bin/marked.js',
				'bin/dtsdoclib.js'
			]
		},
		copy: {
			node: {
				files: {
					'bin/template.html': ['src/template.html'],
					'bin/marked.js': ['src/marked.js'],
					'bin/dtsdoc.js': ['temp/src/dtsdoc.js']
				}
			},
			web: {
				files: [
					{expand: true, flatten: true, src: ['src/*.html', 'src/sample.d.ts', 'src/*.js'], dest: 'web/', filter: 'isFile'}
				]
			}
		},
		concat: {
			libs: {
				src: [
					'temp/Parsect/src/parsect.js',
					'temp/Parsect/src/globals.js',
					'temp/src/htmlemitter.js',
					'temp/src/primitives.js',
					'temp/src/links.js',
					'temp/src/type.js',
					'temp/src/parser.js',
					'temp/src/dtsdoclib.js',
				],
				dest: 'bin/dtsdoclib.js'
			},
			worker: {
				src: [ 'src/marked.js','temp/worker.js' ],
				dest: 'web/worker.js'
			}
		},
		connect: {
			docs: {
				options: {
					keepalive: true,
					port: 3000,
					base: 'web'
				}
			}
		},
		tsc: {
			options: {
				target: 'ES3'
			},
			web: {
				src: ['src/webdtsdoc.ts'],
				dest: 'web/webdtsdoc.js'
			},
			worker: {
				src: [ 'src/worker.ts' ],
				dest: 'temp/worker.js'
			},
			node: {
				options: {
					target: 'ES5'
				},
				src: ['src/dtsdoc.ts'],
				dest: 'temp'
			}
		}
	});
	grunt.registerMultiTask('tsc', 'Use CLI tsd command instead of grunt-typescript package due to a weird bug.', function() {
		var options = this.options({
			target: 'ES3'
		});
		var done = this.async();

		this.files.forEach(function(filePair,idx,allfilepairs) {
			grunt.log.writeln(filePair.src,' => ', filePair.dest);
			var args = ['src/parser.ts','--target'];
			args.push(options.target);
			args.push('--out');
			args.push(filePair.dest);
			grunt.util.spawn({
				cmd: 'tsc',
				args: args.concat(filePair.src)
			}, function(err,result,code) {
				if(err || result.stderr != '') {
					grunt.log.error(err);
					return false;
				}
				done();
			})
		});
	});

	grunt.registerTask('build', ['tsc','concat','copy']);
	

	grunt.registerTask('default', [ 'clean','build' ]);
};
