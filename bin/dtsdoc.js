var fs = require("fs")
var path = require("path")
var dtsdoc = require("./dtsdoclib")
function printHelp() {
    console.log([
        "Syntax: dtsdoc [options] [file...]", 
        "", 
        "Examples: dtsdoc --out docs foo.d.ts bar.d.ts", 
        "", 
        "Options: ", 
        "  --out DIRECTORY    Redirect output to the directory", 
        "  --silent           No information output "
    ].join('\n'));
}
var args = process.argv.slice(2);
var files = [];
var outputDir;
var silent = false;
for(var i = 0; i < args.length; i++) {
    var arg = args[i];
    if(arg.indexOf('--') == 0) {
        var opt = arg.slice(2);
        if(opt === 'out') {
            outputDir = args[i + 1];
            i++;
        } else if(opt == 'silent') {
            silent = true;
        } else {
            console.log('Unknown option \'' + arg + '\'');
            printHelp();
            files = [];
            break;
        }
    } else {
        files.push(arg);
    }
}
files.forEach(function (file) {
    var matches = /^(.+)(\.d\.ts)$/.exec(file);
    if(!fs.existsSync(file)) {
        if(!silent) {
            console.log('file "' + file + '" not found.');
        }
    } else if(!matches) {
        console.log('file "' + file + '" is not a ambient source file.');
    } else {
        if(!silent) {
            process.stdout.write('Generating docs for "' + file + '"... ');
        }
        var dir = outputDir || path.dirname(file);
        var dest = path.basename(file);
        var code = fs.readFileSync(file).toString();
        var html = dtsdoc.toHTMLDocument(code);
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        fs.writeFileSync(path.join(dir, dest + ".html"), html);
        if(!silent) {
            console.log("Complete.");
        }
    }
});
