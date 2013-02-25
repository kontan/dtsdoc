var fs = require("fs")
process.argv.slice(2).forEach(function (val, index) {
    var matches = /^(.+)(\.d\.ts)$/.exec(val);
    if(matches) {
        console.log('generating for \"' + val + '\"...');
        var script = fs.readFileSync(val).toString();
        var result = DTSDoc.generateDocument(script, function (v) {
            process.stdout.write('*');
        });
        if(result.type === DTSDoc.GenerationResultType.Success) {
            fs.writeFileSync(matches[1] + ".d.html", result.docs);
        } else if(result.type === DTSDoc.GenerationResultType.Fail) {
            console.log('fail');
        }
    } else {
        console.log('file "' + val + '" is not a ambient source file.');
    }
});
