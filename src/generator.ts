/// <reference path="../../DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../../DefinitelyTyped/filewriter/filewriter.d.ts" />
/// <reference path="../../DefinitelyTyped/filesystem/filesystem.d.ts" />
/// <reference path="../Parsect/src/parsect.ts" />
/// <reference path="../Parsect/src/globals.ts" />
/// <reference path="../Parsect/src/type.ts" />
/// <reference path="../Parsect/src/parser.ts" />

var fileInput  = <JQuery>$("#input_file"); 
var openButton = <JQuery>$("#button_open"); 
var genButton = <JQuery>$("#gen");
var textarea  = <JQuery>$("#source");
var docs      = <JQuery>$("#docs");

textarea.val("");

function getFullHTML(bodyHTML:string, callback:(html:string)=>void){
	var cssText:string;
	var templete:string;
	function onAjaxComplete(){
		if(cssText && templete){
			templete = templete.replace('<!-- CSS Content -->', cssText);
			templete = templete.replace('<!-- Document Content -->', bodyHTML);
			callback(templete);
		}
	}
	$.ajax("style.css", {
		contentType: "text/plain",
		dataType: "text",
		success: (data)=>{
			cssText = data;
			onAjaxComplete();
		}
	});
	$.ajax('templete.html', {
		dataType: 'text',
		success: (data:string, dataType:string)=>{
			templete = data;
			onAjaxComplete();
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
			// (なぜかデバッガで一度止めるとエラーにならない。)
			// やむを得ないのでいったんファイルを消去して　ファイルを作り直す
			fileSystem.root.getFile(tempFileName, {}, (fileEntry:FileEntry)=>{
				fileEntry.remove(createTempFile);
			}, createTempFile);

		});
	});
}

function generateDocuments(){
	docs.children().remove();
	docs.append("<p>Parsing...</p>");
	
	setTimeout(()=>{
		var sourceCode = textarea.val();
	
		var worker = new Worker("worker.js");
		worker.addEventListener('message', (event:MessageEvent)=>{
		    var dat = event.data;

		    docs.children().remove();
		    if(dat['type'] === 'success'){
		    	var documentContent = event.data['docs'];
		    	docs.html(documentContent);
			    updateDocument(documentContent);
			}else{
				docs.html("<p>Parsing failed at line " + dat.line + ", column " + dat.column + ": \"" + dat.source +  "\", " + dat.message + "</p>");
			}
		});
		worker.postMessage(sourceCode);
	}, 1);
}

genButton.click(()=>{
	generateDocuments();
});

fileInput.change(()=>{
	var input:HTMLInputElement = <HTMLInputElement>fileInput[0];
	var files = input.files;
	var reader:FileReader = new FileReader();
	reader.addEventListener('load', (e)=>{
		textarea.val(reader.result);
		generateDocuments();
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
			if(m instanceof DTSDoc.ASTInterface){
				list[m.name] = path + "#" + m.name;
			}else if(m instanceof DTSDoc.ASTClass){
				list[m.name] = path + "#" + m.name;
			}else if(m instanceof DTSDoc.ASTEnum){
				list[m.name] = path + "#" + m.name;
			}else if(m instanceof DTSDoc.ASTModule){
				generateTypeListFromModule(<DTSDoc.ASTModule>m);
			}
		});	
	}

	generateTypeListFromModule(global);

	return JSON.stringify(list);
}


// For testing
//loadSourceFile("../../three.d.ts/three.d.ts");
loadSourceFile("sample.d.ts");

