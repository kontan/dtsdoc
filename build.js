
var cp = require("child_process")
function compile(out) {
    var files = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        files[_i] = arguments[_i + 1];
    }
    var command = "tsc --out " + out;
    files.forEach(function (file) {
        command += ' ' + file;
    });
    console.log(command);
    var tsc = cp.spawn("tsc", [
        '--out', 
        out
    ].concat(files), {
    });
    tsc.stdout.setEncoding('utf8');
    tsc.stderr.setEncoding('utf8');
    tsc.stdout.on('data', function (data) {
        console.log("[[stdout]]" + data.toString('utf8'));
    });
    tsc.stderr.on('data', function (data) {
        console.log("[[stderr]]" + data.toString('utf8'));
    });
    tsc.on('exit', function (data) {
        console.log("exit.");
    });
}
console.log("building...");
compile("test/generator.js", "src/type.ts", "src/parser.ts", "src/web.ts");
compile("build/typedoc.js", "src/type.ts", "src/parser.ts", "src/command.ts");
