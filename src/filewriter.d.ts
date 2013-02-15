interface FileSaver extends EventTarget {
    constructor(data:Blob);
    abort():void;
    INIT:number;
    WRITING:number;
    DONE:number;
    readyState:number;
    error:DOMError;
    onwritestart:Function;
    onprogress:Function;
   	onwrite:Function;
    onabort:Function;
    onerror:Function;
    onwriteend:Function;
}

interface FileWriter extends FileSaver {
    position:number;
    length:number;
    write(data:Blob):void;
    seek(offset:number):void;
    truncate(size:number):void;
}

interface FileWriterSync {
    position:number;
    length:number;
    write(data:Blob):void;
    seek(offset:number):void;
    truncate(size:number):void;
}