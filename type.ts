/// <reference path="jquery.d.ts" />

module DTSDoc{

    export enum Accessibility{
        Public,
        Private
    };

    export class TSTypeRef { toHTML():JQuery{ return undefined; } }
    export class TSNameRef extends TSTypeRef { 
    	constructor(public name:string){ super(); } 
    	toHTML():JQuery{ 
	    	var a = $("<a/>");
	    	if(
	            this.name != "string" &&
	            this.name != "number" &&
	            this.name != "bool" &&
	            this.name != "any" &&
	            this.name != "void" && 
	            this.name != "Object"
	        ){
	            a.attr("href", '#type_' + this.name);
	        }
    		return a.text(this.name); 
    	}
    }
    export class TSArrayRef extends TSTypeRef { 
    	constructor(public type:TSTypeRef){ super(); } 
    	toHTML():JQuery{ return $("<span/>").append(this.type.toHTML()).append("[]"); }
    }
    export class TSModuleRef extends TSTypeRef { 
    	constructor(public name:string, public type:TSTypeRef){ super(); } 
    	toHTML():JQuery{ return $("<span/>").append(this.name).append(".").append(this.type.toHTML()); }
    }
    export class TSSpecifing extends TSTypeRef{
    	constructor(public members:TSClassMember[]){ super(); }
    	toHTML():JQuery{ return $("<span/>").append("{").append("}"); }
    }
    export class TSFunctionTypeRef extends TSTypeRef{
    	constructor(public params:TSParameter[], public retType:TSTypeRef){ super(); }
    	toHTML():JQuery{ return $("<span/>").append(genParameters(this.params)).append("=>").append(this.retType.toHTML()); }
    }




    export class TSDocs{
    	constructor(public text:string){
    	}
    }


    export class TSClassMember{
        toHTML():JQuery{ return undefined; };
    }

    export class TSModuleMember{
        toHTML():JQuery{ return undefined; };
    }

    export class TSParameter{ 
        constructor(public name:string, public optional:bool, public type:TSTypeRef){}
        toString():string{ return this.name + ":" + this.type; } 
        toHTML():JQuery{
            var span = $("<span/>");
            span.append($("<span/>").text(this.name + (this.optional ? "?" : "")));
            span.append(":");
            span.append(this.type.toHTML());
            return span;
        }
    }

    export class TSFunction extends TSClassMember{ 
        constructor(public docs:TSDocs, public name:string, public params:TSParameter[], public ret:string){ super(); } 
        toString():string{ return this.name + "(" + this.params.join() + "):" + this.ret; }
        toHTML():JQuery{
            var p = $('<section class="ts_modulemember ts_function"/>');
            p.append($("<a/>").attr("name", "func_" + this.name));
            p.append($('<h1 class="ts_modulemember_title ts_function_title" />').text("function " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            return p;
        }
    }


	function genParameters(params:TSParameter[]):JQuery{
        var span = $('<span class="ts_params"/>');
        span.append("(");
        for(var i = 0; i < params.length; i++){
            if(i > 0){ span.append(", "); }
            span.append(params[i].toHTML());
        }
        span.append(")");
        return span;
    }    

    function genFunctionSigniture(params:TSParameter[], retType:TSTypeRef):JQuery{
        var span = $('<span class="ts_signiture"/>');
        span.append(genParameters(params));
        span.append(":");
        span.append(retType.toHTML());
        return span;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Class Members //////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    export class TSConstructor extends TSClassMember{
        constructor(public docs:TSDocs, public params:TSParameter[]){ super(); }
        toHTML():JQuery{
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("constructor");
            span.append(genParameters(this.params));
            return span;
        }
    }

    export class TSMethod extends TSClassMember{ 
        constructor(public docs:TSDocs, public access:Accessibility, public isStatic:bool, public name:string, public params:TSParameter[], public ret:TSTypeRef){ super(); } 
        toString():string{ return this.name + "(" + this.params.join() + "):" + this.ret; }
        toHTML():JQuery{
            var span = $('<div class="ts_code ts_method"/>');
            //span.append((this.access == Accessibility.Public ? "public" : "private") + " ");
            span.append(this.isStatic ? "static " : "");
            span.append(this.name);
            span.append(genFunctionSigniture(this.params, this.ret));
            return span;
        }
    }

    export class TSField extends TSClassMember{
        constructor(public docs:TSDocs, public access:Accessibility, public isStatic:bool, public name:string, public type:TSTypeRef){ super(); }
        toString():string{ return this.name + ":" + this.type; }
        toHTML():JQuery{ 
            return $('<div class="ts_code" />').append($("<span/>").text(this.name + ":").append(this.type.toHTML())); 
        }
    }

    export class TSClass extends TSModuleMember{
        constructor(public docs:TSDocs, public name:string, public members:TSClassMember[]){ super(); };
        toString():string{
            var s = "class " + this.name + "{";
            this.members.forEach((m)=>{ s += m.toString(); });
            return s + "}";
        }
        toHTML():JQuery{
            var p = $('<section class="ts_modulemember ts_class"/>');
            p.append($("<a/>").attr("name", "type_" + this.name));
            p.append($('<h1 class="ts_modulemember_title ts_class_title" />').text("class " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            if(this.docs){
            	content.append($('<div>').text(this.docs.text));
            }
            this.members.forEach((m)=>{
                if(m.toHTML){
                    var html = m.toHTML();
                    if(html) content.append(html);
                }
            });
            return p;
        }
    }

    export class TSInterfaceMember{
    	toHTML():JQuery{ return undefined; }
    }



    export class TSIndexer extends TSInterfaceMember{
        constructor(public docs:TSDocs, public name:string, public indexType:TSTypeRef, public retType:TSTypeRef){ super(); }
        toHTML():JQuery{
        	var span = $('<span class="ts_code ts_constructor"/>');
        	span.append("[");
        	span.append(this.name);
        	span.append(":");
        	span.append(this.indexType.toHTML());
        	span.append("]:");
        	span.append(this.retType.toHTML());
            span.append(";");
            return span;
        }
    }

    export class TSIMethod extends TSInterfaceMember{
        constructor(public docs:TSDocs, public access:Accessibility, public name:string, public params:TSParameter[], public retType:TSTypeRef){ super(); }
    }

    export class TSInterface extends TSModuleMember{
        constructor(public docs:TSDocs, public name:string, public members:TSInterfaceMember[]){ super(); }
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_interface"/>');
        	section.append($("<a/>").attr("name", "type_" + this.name));
        	section.append($('<h1 class="ts_modulemember_title ts_interface_title"/>').text("interface " + this.name));
        	var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
        	this.members.forEach((m)=>{
        		content.append(m.toHTML());
        	});
        	return section;
        }
    }

    export class TSIConstructor extends TSInterfaceMember{
        constructor(public docs:TSDocs, public params:TSParameter[], public type:TSTypeRef){ super(); }
        toHTML():JQuery{
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("new");
            span.append(genParameters(this.params));
            return span;
        }
    }

    export class TSIField extends TSClassMember{
        constructor(public docs:TSDocs, public name:string, public isOptional:bool, public type:TSTypeRef){ super(); }
        toHTML():JQuery{ 
            return $('<div class="ts_code" />').append($("<span/>").text(this.name + ":").append(this.type.toHTML())); 
        }
    }

	export class TSIFunction extends TSClassMember{
        constructor(public docs:TSDocs, public params:TSParameter[], public retType:TSTypeRef){ super(); }
   		toHTML():JQuery{
            var span = $('<div class="ts_code ts_method"/>');
            span.append(genFunctionSigniture(this.params, this.retType));
            return span;
        }
    }    

    export class TSEnum extends TSModuleMember{
        constructor(public docs:TSDocs, public name:string, public members:string[]){ super(); }
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_enum"/>');
        	section.append($("<a/>").attr("name", "type_" + this.name));
        	section.append($('<h1 class="ts_modulemember_title ts_enum_title"/>').text("enum " + this.name));
        	this.members.forEach((m)=>{
        		section.append($("<div/>").text(m));
        	});
        	return section;
        }
    }

    export class TSVar extends TSModuleMember{
        constructor(public docs:TSDocs, public name:string, public type:TSTypeRef){ super(); } 
        toString():string{ return this.name; };
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_var" />');
        	section.append($('<h1 class="ts_modulemember_title ts_var_title" />').text("var " + this.name));
        	var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
        	content.append(
        		$('<span class="ts_code"/>').append('var ' + this.name).append(":").append(this.type.toHTML())
        	);
        	return section;
        }
    }

    export class TSModule{
        constructor(public docs:TSDocs, public name:string, public members:TSModuleMember[]){}
        toString():string{
            var s = "module " + this.name + "{";
            this.members.forEach((m)=>{ s += m.toString(); });
            return s + "}";
        }
        toHTML():JQuery{
            

            var section = $('<section class="ts_modulemember ts_module"/>');
            section.append($('<h1 class="ts_modulemember_title ts_module_title"/>').text("module " + this.name));            
            var content = $('<section />').appendTo(section);
            if(this.docs){
            	content.append($('<p class="ts_modulemember_description"/>').html(this.docs.text));
            }
            this.members.forEach((m)=>{ content.append(m.toHTML()); });
            return section;
        }
    }
}