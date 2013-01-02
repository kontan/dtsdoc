var too:number;
/** 
*/
//> hoge
//> agsda
//> sdfs
export class WAFOO{

}




interface WebGLRenderingContext {
    getParameter(pname:GLenum):any;
    VIEWPORT:GLenum; //     Int32Array (with 4 elements)
}



// When you use three.d.ts with other ambient source file for WebGL,
// remove below definition for WebGLRenderingContext.
interface WebGLRenderingContext {
    getParameter(pname:GLenum):any;
    ACTIVE_TEXTURE:GLenum; // unsigned long
}
enum GLenum{}


enum GLenum{}

module HogeMod{
	enum Roo{
			hoge, piyo
	}

	interface ITS{
		constructor(hoge:string,  foo :Hoge);
		foo(piyo:Piyo):void;		
	}

	//> nya
	export class Wafoo { 
		constructor(hoge:string, foo:Hoge);

		foo( hoge : Hoge, piyo :    Piyo ):Bar; 
		static piyo( hoge : Hoge, piyo :    Piyo, nyaa?:string ):BarBar; 
	}

	var hoge:Boo;

}

class Piyo { 
		foo(  ):Puyo; 
	}



//export function hoge():foo;