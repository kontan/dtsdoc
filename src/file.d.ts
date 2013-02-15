

interface Window extends LocalFileSystem, LocalFileSystemSync{
}

interface WorkerGlobalScope extends LocalFileSystem, LocalFileSystemSync{
}

interface LocalFileSystem {
    TEMPORARY:number;
    PERSISTENT:number;
    requestFileSystem(type:number, size:number, successCallback:FileSystemCallback, errorCallback?:ErrorCallback):void;
    resolveLocalFileSystemURL(url:string, successCallback:EntryCallback, errorCallback?:ErrorCallback):void;

    webkitRequestFileSystem(type:number, size:number, successCallback:FileSystemCallback, errorCallback?:ErrorCallback):void;
}

interface LocalFileSystemSync {
    TEMPORARY:number;
    PERSISTENT:number;
    requestFileSystemSync(type:number, size:number):FileSystemSync;
    resolveLocalFileSystemSyncURL(url:string):EntrySync;

    webkitRequestFileSystemSync(type:number, size:number):FileSystemSync;
}

interface Metadata {
    modificationTime:Date;
    size:number;
}

interface Flags {
    create?:bool;
    exclusive?:bool;
}

interface FileSystem{
    root:any;
}

interface Entry {
    isFile:bool;
    isDirectory:bool;
    getMetadata(successCallback:MetadataCallback, errorCallback?:ErrorCallback):void;
    name:string;
    fullPath:string;
    filesystem:FileSystem;
    moveTo(parent:DirectoryEntry, newName?:string, successCallback?:EntryCallback, errorCallback?:ErrorCallback):string;
    copyTo(parent:DirectoryEntry, newName?:string, successCallback?:EntryCallback, errorCallback?:ErrorCallback):string;
    toURL():string;
    remove(successCallback:VoidCallback, errorCallback?:ErrorCallback):void;
    getParent(successCallback:EntryCallback, errorCallback?:ErrorCallback):void;
}

interface DirectoryEntry extends Entry {
    createReader():DirectoryReader;
    getFile(path:string, options?:Flags, successCallback?:EntryCallback, errorCallback?:ErrorCallback):void;
    getDirectory(path:string, options?:Flags, successCallback?:EntryCallback, errorCallback?:ErrorCallback):void;
    removeRecursively(successCallback:VoidCallback, errorCallback?:ErrorCallback):void;
}

interface DirectoryReader {
    readEntries(successCallback:EntriesCallback, errorCallback?:ErrorCallback):void;
}

interface FileEntry extends Entry {
    createWriter(successCallback:FileWriterCallback, errorCallback?:ErrorCallback):void;
    file(successCallback:FileCallback, errorCallback?:ErrorCallback):void;
}

interface FileSystemCallback {
    (filesystem:FileSystem):void;
}

interface EntryCallback {
    (entry:Entry):void;
}

interface EntriesCallback {
    (entries:Entry[]):void;
}

interface MetadataCallback {
    (metadata:Metadata):void;
}

interface FileWriterCallback {
    (fileWriter:FileWriter):void;
}

interface FileCallback {
    (file:File):void;
}

interface VoidCallback {
    ():void;
}

interface ErrorCallback {
    (err:DOMError):void;
}


interface FileSystemSync {
    name:string;
    root:DirectoryEntrySync;
}

interface EntrySync{
    isFile:bool;
    isDirectory:bool;
    getMetadata():Metadata;
    name:string;
    fullPath:string;
    filesystem:FileSystemSync;
    moveTo(parent:DirectoryEntrySync, newName?:string):EntrySync;
    copyTo(parent:DirectoryEntrySync, newName?:string):EntrySync;
    toURL():string;
    remove ():void;
    getParent():DirectoryEntrySync;
}

interface DirectoryEntrySync extends EntrySync {
    createReader():DirectoryReaderSync;
    getFile(path:string, options?:Flags):FileEntrySync;
    getDirectory(path:string, options?:Flags):DirectoryEntrySync;
    removeRecursively():void;
}

interface DirectoryReaderSync {
    readEntries():EntrySync[];
}

interface FileEntrySync extends EntrySync {
    createWriter():FileWriterSync;
    file():File;
}
