/**
 * <h1>dtsdoc/TypeScript Ambient Source File Documentation Generator</h1>
 */

var ctor: new () => M.C;

// express,marked,sammyjs function()
// leaflet new ()=>T
// node,socket.io        vimport events = module("events");
// redits      declare module 'redis' {

declare module "http" {
    import events = module("events");
    function():string;
}

var V:string;

function f(a:number, b:string, c:Date):void;



module M{
    class C{
        constructor();

        /**
         * @param a 1st parameter.
         * @param b 2nd parameter.
         * @param c 3rd parameter.
         */
        method(a:number, b:string, c:Date):void;

        static field:string;
    }

    class D extends C{

    }

    class G extends D implements I{

    }

    interface I{
        f():void;
        g:number;
    }


    module N{
        enum E{
            X, Y, Z
        }        
    }
}