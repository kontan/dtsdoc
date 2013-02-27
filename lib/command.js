var fs = require("fs")
var dtsdoc = require("./dtsdoc")
var files = process.argv.slice(2);
files.forEach(function (file) {
    var matches = /^(.+)(\.d\.ts)$/.exec(file);
    if(matches) {
        var code = fs.readFileSync(file).toString();
        var html = dtsdoc.toHTMLDocument(code);
        fs.writeFileSync(matches[1] + ".d.html", html);
    } else {
        console.log('file "' + file + '" is not a ambient source file.');
    }
});
