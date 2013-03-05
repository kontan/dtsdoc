/// <reference path="../../DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../../DefinitelyTyped/filewriter/filewriter.d.ts" />
/// <reference path="../../DefinitelyTyped/filesystem/filesystem.d.ts" />
/// <reference path="../../Parsect/src/parsect.ts" />
/// <reference path="../../Parsect/src/globals.ts" />
/// <reference path="parser.ts" />

var fileInput  = <JQuery>$("#input_file"); 
var openButton = <JQuery>$("#button_open"); 
var genButton = <JQuery>$("#gen");
var textarea  = <JQuery>$("#source");
var docs      = <JQuery>$("#docs");
var async     = <JQuery>$("#async");

textarea.val("");

function getFullHTML(bodyHTML:string, callback:(html:string)=>void){
    $.ajax('template.html', {
        contentType: "text/plain",
        dataType: 'text',
        success: (data:string, dataType:string)=>{
            var templete:string = data;
            templete = templete.replace('<!-- Document Content -->', bodyHTML);
            callback(templete);
        }
    });
}

function updateDocument(documentContent:string){
    var _Blob:any = Blob;
    var requestFileSystem:any = window.requestFileSystem || window.webkitRequestFileSystem;

    getFullHTML(documentContent, (content:string)=>{
        var downloadBlob = new _Blob([content], { "type" : "text/html" });
        var tempFileName = "docs.html";        
        requestFileSystem(window.TEMPORARY, downloadBlob.size, (fileSystem:FileSystem)=>{
            
            function createTempFile(){
                fileSystem.root.getFile(tempFileName, {create: true}, (fileEntry:FileEntry)=>{
                    fileEntry.createWriter((fileWriter)=>{
                        fileWriter.addEventListener('writeend', (e)=>{
                            $('#downloadLink').attr('href', fileEntry.toURL());
                        });
                        fileWriter.write(downloadBlob);
                    });
                }, (error)=>{
                    throw error;
                });
            }

            // 非同期処理の不具合？
            // 同じファイルを一時ファイルにするためにはファイルのサイズを調整しなければならないけど、
            // truncate の直後に write するとエラーになる。
            // デバッガで一度止めるとエラーにならないので、truncate の完了を待たなければならないんだけど、
            // 待ち方が不明。
            // やむを得ないのでいったんファイルを消去して、ファイルを作り直す
            fileSystem.root.getFile(tempFileName, {}, (fileEntry:FileEntry)=>{
                fileEntry.remove(createTempFile);
            }, createTempFile);

        });
    });
}


var start = window.performance.now();
function showResult(dat:any){
    docs.children().remove();
    if(dat['type'] === 'success'){
        var documentContent = dat['docs'];
        
        getFullHTML(documentContent, (fullHTML)=>{
            docs[0]['contentDocument'].documentElement.innerHTML = fullHTML;
        });
        
/*
        var doc = docs[0]['contentDocument'];


        $.ajax("style.css", {
            contentType: "text/plain",
            dataType: "text",
            success: (data)=>{
                var text = '<style type="text/css">' + data + '</style>' + documentContent;
                doc.body.innerHTML = text;
            }
        });
 */       
        //docs.html(documentContent);
        updateDocument(documentContent);
    }else{
        docs.html("<p>Parsing failed at line " + dat.line + ", column " + dat.column + ": \"" + dat.source +  "\", " + dat.message + "</p>");
    }

    var time = (/\d+(\.\d{1,3})/.exec(((window.performance.now() - start) * 0.001).toString()));
    if(time && time.length > 0){
        $('#performance').text("time: " + time[0] + " sec.");
    }
}
var canvas = $('#progressbar');
var graphics:CanvasRenderingContext2D = (<HTMLCanvasElement>canvas[0]).getContext('2d');
graphics.fillStyle = 'rgba(0, 0, 255, 0.3)';

var watcher = (v)=>{
    //console.log(v);
    graphics.clearRect(0, 0, canvas.width(), canvas.height());
    graphics.fillRect(0, 0, canvas.width() * v / 100, canvas.height());
};
var worker = new Worker("worker.js");
worker.addEventListener('message', (event:MessageEvent)=>{
    var result:DTSDoc.GenerationResult = event.data;
    if(watcher && result.type === DTSDoc.GenerationResultType.State){
        watcher(result.state);
    }else if(
        result.type === DTSDoc.GenerationResultType.Success || 
        result.type === DTSDoc.GenerationResultType.Fail
    ){
        showResult(result);
        workerRunning = false;
    }
});

function generateDocuments(sync?:bool){
    if(sync === undefined){
        sync = async.attr('checked') ? false : true;
    }

    start = window.performance.now();
    workerRunning = true;
    var sourceCode = textarea.val();
    if(sync){
        setTimeout(()=>{    
            showResult(DTSDoc.generateDocument(sourceCode, watcher));
        }, 1);
    }else{
      //  worker.postMessage(sourceCode);
    }
}

genButton.click(()=>{
    generateDocuments( ! async.attr('checked'));
});

fileInput.change(()=>{
    var input:HTMLInputElement = <HTMLInputElement>fileInput[0];
    var files = input.files;
    var reader:FileReader = new FileReader();
    reader.addEventListener('load', (e)=>{
        textarea.val(reader.result);
        generateDocuments( ! async.attr('checked'));
    });
    reader.readAsText(files[0]);
});

openButton.click(()=>{
    fileInput.val(undefined);
    fileInput.trigger('click');
});

function loadSourceFile(url:string):void{
    $.ajax(url, {
        contentType: "text/plain",
        dataType: "text",
        success: (data)=>{
            textarea.val(data);
            generateDocuments();
        }
    });    
}


function generateHierarchy(global:DTSDoc.ASTModule):JQuery{
    var section = $('<section/>');

    return section;
}

interface TypeList{
    [name:string]:string;
}



function generateTypeList(path:string, global:DTSDoc.ASTModule):string{
    var list:TypeList = {};

    function generateTypeListFromModule(m:DTSDoc.ASTModule){
        list[m.name] = path + "#" + m.name;
        m.members.forEach(m=>{
            if(
                m instanceof DTSDoc.ASTInterface ||
                m instanceof DTSDoc.ASTClass ||
                m instanceof DTSDoc.ASTEnum
            ){
                list[m.name] = path + "#" + encodeURIComponent(m.memberKind + ' ' + m.getFullName());
            }else if(m instanceof DTSDoc.ASTModule){
                generateTypeListFromModule(<DTSDoc.ASTModule>m);
            }
        });    
    }

    generateTypeListFromModule(global);

    return JSON.stringify(list);
}


var workerRunning:bool = false;
var textBoxLastValue: string = "";

textarea.keydown(()=>{
    if(async.attr('checked') && ! workerRunning && textBoxLastValue !== textarea.val()){
        workerRunning = true;
        setTimeout(()=>{ generateDocuments(); }, 1000);
    }
    textBoxLastValue = textarea.val();
});
textarea.change(()=>{
    if(async.attr('checked') && ! workerRunning){
        workerRunning = true;
        setTimeout(()=>{ generateDocuments(); }, 1000);
    }
});



// For testing
//loadSourceFile("../../three.d.ts/three.d.ts");
loadSourceFile("sample.d.ts");

/*
$.ajax('lib.d.ts', {
    success: (data)=>{
        var result = DTSDoc.pProgram().parse(new Source(data, 0));
        console.log(generateTypeList('http://phyzkit.net/docs/lib.d.ts.html', result.value.global));
    }
});
*/
