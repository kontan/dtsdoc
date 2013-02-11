/// <reference path="../typings/jquery.d.ts" />

module DTSDoc{


    ////////////////////////////////////////////////////////////////////
    // Common
    ////////////////////////////////////////////////////////////////

    export enum Accessibility{ Public, Private };

    export class TSDocs{
        constructor(public text:string){
        }
    }

    export class ASTParameter{ 
        constructor(public name:string, public optional:bool, public type:ASTType){}
        toString():string{ return this.name + ":" + this.type; } 
        toHTML(mod:ASTModule):JQuery{
            var span = $("<span/>");
            span.append($("<span/>").text(this.name + (this.optional ? "?" : "")));
            span.append(":");
            span.append(this.type.toHTML(mod));
            return span;
        }
    }

    export class ASTFuncionSignature{
        constructor(public params:ASTParameter[], public retType:ASTType){}
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_signiture"/>');
            span.append(genParameters(mod, this.params));
            span.append(":");
            span.append(this.retType.toHTML(mod));
            return span;
        }
    }




    function genParameters(mod:ASTModule, params:ASTParameter[]):JQuery{
        var span = $('<span class="ts_params"/>');
        span.append("(");
        for(var i = 0; i < params.length; i++){
            if(i > 0){ span.append(", "); }
            span.append(params[i].toHTML(mod));
        }
        span.append(")");
        return span;
    }    

    function genFunctionSigniture(mod:ASTModule, params:ASTParameter[], retType:ASTType):JQuery{
        var span = $('<span class="ts_signiture"/>');
        span.append(genParameters(mod, params));
        span.append(":");
        span.append(retType.toHTML(mod));
        return span;
    }

    /////////////////////////////////////////////////////////////////
    // Type
    ////////////////////////////////////////////////////////

    export class ASTType { 
        toHTML(mod:ASTModule):JQuery{ return undefined; } 
    }
    export class ASTTypeName extends ASTType { 
    	constructor(public name:string){ super(); } 
    	toHTML(mod:ASTModule):JQuery{ 
	    	if(
	            this.name != "string" &&
	            this.name != "number" &&
	            this.name != "bool" &&
	            this.name != "any" &&
	            this.name != "void" && 
	            this.name != "Object"
	        ){
                var a = $("<a/>");	            
                a.attr("href", "#" + mod.getFullName(this.name));
                return a.text(this.name);
	        }else{ 
        		return $('<span/>').append(this.name); 
            }
    	}
    }
    export class ASTArrayType extends ASTType { 
    	constructor(public type:ASTType){ super(); } 
    	toHTML(mod:ASTModule):JQuery{ return $("<span/>").append(this.type.toHTML(mod)).append("[]"); }
    }
    export class ASTModulePrefix extends ASTType { 
    	constructor(public name:string, public type:ASTType){ super(); } 
    	toHTML(mod:ASTModule):JQuery{ return $("<span/>").append(this.name).append(".").append(this.type.toHTML(mod)); }
    }
    export class ASTSpecifingType extends ASTType{
    	constructor(public members:ASTInterfaceMember[]){ super(); }
    	toHTML(mod:ASTModule):JQuery{
            var span = $("<span/>").append("{ ");
            this.members.forEach((m)=>{
                span.append(m.toHTML(mod));
                span.append("; ");
            });
            span.append("}"); 
            return span;
        }
    }
    export class ASTFunctionTypeRef extends ASTType{
    	constructor(public params:ASTParameter[], public retType:ASTType){ super(); }
    	toHTML(mod:ASTModule):JQuery{ return $("<span/>").append(genParameters(mod, this.params)).append("=>").append(this.retType.toHTML(mod)); }
    }




    ////////////////////////////////////////////////////////////////////////////////////////////
    // Abstract classes
    //////////////////////////////////////////////////////////////////////////////////////////


    export class ASTModuleMember{
        parent:ASTModule; 
        docs:TSDocs;       
        getGlobal():ASTModule{
            return this.parent ? this.parent.getGlobal() : this instanceof ASTModule ? <ASTModule>this : null;
        }
        toHTML():JQuery{ return undefined; };
    }

    export class ASTClassMember{
        parent:ASTClass;
        docs:TSDocs;
        toHTML():JQuery{ 
            var title = this.memberToHTML();
            var div = $('<div class="ts_class_member_container">').append(title); 
            if(this.docs){
                div.append($('<p class="ts_classmember_description"/>').html(this.docs.text));
            }
            return div;
        };
        memberToHTML():JQuery{ return undefined; };
    }

    export class ASTInterfaceMember{
        docs:TSDocs;
        toHTML(mod:ASTModule):JQuery{ return undefined; }
    }

    export class ASTModuleType extends ASTModuleMember{
        constructor(public name:string){ super(); }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Class Members //////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    export class ASTConstructor extends ASTClassMember{
        constructor(public params:ASTParameter[]){ super(); }
        memberToHTML():JQuery{
            var title = $('<div class="ts_code ts_class_member_title ts_constructor"/>');
            title.append($('<a/>').attr("name", this.parent.name + "-constructor"));
            title.append("constructor");
            title.append(genParameters(this.parent.parent, this.params));
            return title;
        }
    }

    export class ASTMethod extends ASTClassMember{ 
        constructor(public access:Accessibility, public isStatic:bool, public name:string, public sign:ASTFuncionSignature){ super(); } 
        memberToHTML():JQuery{
            var title = $('<div class="ts_code ts_class_member_title ts_method"/>');
            title.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            //span.append((this.access == Accessibility.Public ? "public" : "private") + " ");
            title.append(this.isStatic ? "static " : "");
            title.append(this.name);
            title.append(this.sign.toHTML(this.parent.parent));
            return title;
        }
    }

    export class ASTField extends ASTClassMember{
        constructor(public access:Accessibility, public isStatic:bool, public name:string, public type:ASTType){ super(); }
        toString():string{ return this.name + ":" + this.type; }
        memberToHTML():JQuery{ 
            var title = $('<div class="ts_code ts_class_member_title ts_field" />');
            title.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            title.append((this.isStatic ? "static " : "") + this.name + ":");
            title.append(this.type.toHTML(this.parent.parent));
            return title; 
        }
    }

    export class ASTClass extends ASTModuleType{
        derivedClasses:ASTClass[] = [];
        constructor(name:string, public superClass:ASTTypeName, public members:ASTClassMember[]){ super(name); };
        toString():string{
            var s = "class " + this.name + "{";
            this.members.forEach((m)=>{ s += m.toString(); });
            return s + "}";
        }
        getSuperClass():ASTClass{
            if(this.superClass){
                var sc = this.parent.findType(this.superClass.name);
                if(sc instanceof ASTClass){
                    return <ASTClass>sc;
                }
            }
            return null;
        }
        getFullName(){
            return this.parent.getFullName(this.name);
        }
        updateHierarchy():void{
            var superClass = this.getSuperClass();
            if(superClass){
                superClass.derivedClasses.push(this);
            }
        }
        toHierarchyHTML():JQuery{
            if(this.getSuperClass() || this.derivedClasses.length > 0){
                var div = $('<div class="ts_hierarchey"/>');
                div.append($('<a/>').attr("href", '#' + this.getFullName()).append(this.name));
                if(this.derivedClasses.length > 0){
                    div.append(this.derivedClasses.map((m)=>m.toHierarchyHTML()));
                }
                return div;
            }else{
                return null;
            }
        }
        toHTML():JQuery{
            var p = $('<section class="ts_modulemember ts_class"/>');
            p.append($("<a/>").attr("name", this.getFullName()));
            p.append($('<h1 class="ts_modulemember_title ts_class_title" />').text("class " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            
            if(this.docs){
                content.append($('<div class="ts_classcontent ts_classdescription">').html(this.docs.text));
                content.append('<hr/>');
            }

            if(this.superClass){
                content.append('<h3>Hierarchy</h3>');
                var hierarchy = $('<div class="ts_classcontent ts_classhierarchy"/>');            
                hierarchy.append(this.name);    
                var superClass:ASTClass = this.getSuperClass();
                if(superClass){
                    while(superClass){
                        hierarchy.append(" ← ");
                        hierarchy.append($('<a/>').attr('href', "#" + superClass.getFullName()).append(superClass.name));
                        superClass = superClass.getSuperClass();
                    }
                }else{
                    hierarchy.append(" ← " + this.superClass);
                }
                content.append(hierarchy);                
                content.append($('<hr/>'));
            }
            if(this.derivedClasses.length > 0){
                content.append('<h3>Subclasses</h3>');
                var div = $('<div class="ts_classcontent ts_classsubclasses"/>');
                for(var i = 0; i < this.derivedClasses.length; i++){
                    if(i > 0) div.append(", ");
                    var c = this.derivedClasses[i];
                    div.append($('<a/>').attr('href', '#' + c.getFullName()).append(c.name));
                }
                content.append(div);
                content.append($('<hr/>'));
            }

            content.append('<h3>Members</h3>');
            this.members.forEach((m:ASTClassMember)=>{
                if(m.toHTML){
                    var html:JQuery = m.toHTML();
                    if(html){
                        var classMemberDiv = $('<div class="ts_classcontent ts_classmember"/>');
                        classMemberDiv.append(html);
                        classMemberDiv.append($('<div class="ts_classmemberdescription" />').append(m.docs));
                        content.append(classMemberDiv);
                    }
                }
            });
            return p;
        }
    }

    /////////////////////////////////////////////////////////////////////////
    // Interface (Specifing Type)
    //////////////////////////////////////////////////////////////////////

    export class ASTIIndexer extends ASTInterfaceMember{
        constructor(public name:string, public indexType:ASTType, public retType:ASTType){ super(); }
        toHTML(mod:ASTModule):JQuery{
        	var span = $('<span class="ts_code ts_indexer"/>');
        	span.append("[" + this.name + ":");
        	span.append(this.indexType.toHTML(mod));
        	span.append("]:");
        	span.append(this.retType.toHTML(mod));
            return span;
        }
    }

    export class ASTIMethod extends ASTInterfaceMember{
        constructor(public name:string, public sign:ASTFuncionSignature){ super(); }
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_code ts_method"/>');
            span.append(this.name);
            span.append(this.sign.toHTML(mod));
            return span;
        }
    }

    export class ASTIConstructor extends ASTInterfaceMember{
        constructor(public params:ASTParameter[], public type:ASTType){ super(); }
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("new");
            span.append(genParameters(mod, this.params));
            return span;
        }
    }

    export class ASTIField extends ASTInterfaceMember{
        constructor(public name:string, public isOptional:bool, public type:ASTType){ super(); }
        toHTML(mod:ASTModule):JQuery{ 
            return $('<span class="ts_code" />').append(this.name + (this.isOptional ? "?" : "") + ":").append(this.type.toHTML(mod)); 
        }
    }


    export class ASTIFunction extends ASTInterfaceMember{
        constructor(public params:ASTParameter[], public retType:ASTType){ super(); }
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_code ts_method"/>');
            span.append(genFunctionSigniture(mod, this.params, this.retType));
            return span;
        }
    }

    export class ASTInterface extends ASTModuleType{
        constructor(name:string, public interfaces:ASTTypeName[], public type:ASTSpecifingType){ super(name); }
        getFullName(){
            return this.parent.getFullName(this.name);
        }
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_interface"/>');
        	section.append($("<a/>").attr("name", this.getFullName()));
        	section.append($('<h1 class="ts_modulemember_title ts_interface_title"/>').text("interface " + this.name));
        	var content = $('<section class="ts_modulemember_content"/>');

            if(this.docs){
                content.append('<h3>Description</h3>');
                content.append($('<div class="ts_classcontent ts_classdescription">').html(this.docs.text));
            }

            if(this.type.members.length > 0){
                content.append('<h3>Members</h3>');
            	this.type.members.forEach((m)=>{
            		content.append($('<div class="ts_classcontent ts_classmember ts_class_member_title"/>').append(m.toHTML(this.parent)));
            	});
            }

            if(content.children().length > 0){
                section.append(content);
            }

            return section;
        }
    }

    ///////////////////////////////////////////////////////////////////////
    // Other Module members
    ////////////////////////////////////////////////////////////////////// 
    
    export class ASTFunction extends ASTModuleMember{ 
        constructor(public name:string, public sign:ASTFuncionSignature){ super(); } 
        toHTML():JQuery{
            var p = $('<section class="ts_modulemember ts_function"/>');
            p.append($("<a/>").attr("name", "func_" + this.name));
            p.append($('<h1 class="ts_modulemember_title ts_function_title" />').text("function " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            var span = $('<span class="ts_code ts_method"/>').appendTo(content);
            span.append("function " + this.name);
            span.append(this.sign.toHTML(this.parent));
            return p;
        }
    }

    export class ASTEnum extends ASTModuleType{
        constructor(name:string, public members:string[]){ super(name); }
        getFullName(){
            return this.parent.getFullName(this.name);
        }
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_enum"/>');
        	section.append($("<a/>").attr("name", this.getFullName()));
        	section.append($('<h1 class="ts_modulemember_title ts_enum_title"/>').text("enum " + this.name));
        	this.members.forEach((m)=>{
        		section.append($("<div/>").text(m));
        	});
        	return section;
        }
    }

    export class ASTVar extends ASTModuleMember{
        constructor(public name:string, public type:ASTType){ super(); } 
        toString():string{ return this.name; };
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_var" />');
        	section.append($('<h1 class="ts_modulemember_title ts_var_title" />').text("var " + this.name));
        	var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
        	content.append(
        		$('<span class="ts_code"/>').append('var ' + this.name).append(":").append(this.type.toHTML(this.parent))
        	);
        	return section;
        }
    }

    export class ASTModule extends ASTModuleMember{
        constructor(public name:string, public members:ASTModuleMember[]){ super(); }
        findType(name:string):ASTModuleType{
            var splitted = name.split('.'); 
            if(splitted.length == 1){
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++){
                    var member = this.members[i];
                    if(member instanceof ASTModuleType){
                        var c = <ASTModuleType>member;
                        if(c.name == targetType){
                            return c;
                        }
                    }
                } 
            }else if(splitted.length > 0){
                var targetModule = splitted[0];
                for(var i = 0; i < this.members.length; i++){
                    var member = this.members[i];
                    if(member instanceof ASTModule){
                        var m = <ASTModule>member;
                        if(m.name == targetModule){
                            var t = this.getTypeFromFullName(splitted.slice(1).join("."));
                            if(t){
                                return t;
                            }
                        }
                    }
                }
            }
            if(this.parent){
                return this.parent.findType(name);
            }
            return null;
        }
        getTypeFromFullName(name:string):ASTModuleType{
            var splitted = name.split('.'); 
            if(splitted.length == 1){
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++){
                    var member = this.members[i];
                    if(member instanceof ASTModuleType){
                        var c = <ASTModuleType>member;
                        if(c.name == targetType){
                            return c;
                        }
                    }
                } 
            }else if(splitted.length > 0){
                var targetModule = splitted[0];
                for(var i = 0; i < this.members.length; i++){
                    var member = this.members[i];
                    if(member instanceof ASTModule){
                        var m = <ASTModule>member;
                        if(m.name == targetModule){
                            return this.getTypeFromFullName(splitted.slice(1).join("."));
                        }
                    }
                }
            }
            return null;
        }
        getFullName(name:string):string{
            var type:ASTModuleType = this.findType(name);
            if(type){
                var n = type.name;
                var mod:ASTModule = type.parent;
                while(mod.parent){
                    n = mod.name + "." + n;
                    mod = mod.parent;
                }
                return n;
            }else{
                return name;
            }
        }
        updateHierarchy():void{
            this.members.forEach((m)=>{ 
                if(m instanceof ASTModule){
                    (<ASTModule>m).updateHierarchy();
                }else if(m instanceof ASTClass){
                    (<ASTClass>m).updateHierarchy();
                }
            });
        }
        toHierarchyHTML():JQuery{
            var div = $('<div/>');
            this.members.forEach((m)=>{ 
                if(m instanceof ASTModule){
                    div.append((<ASTModule>m).toHierarchyHTML());
                }else if(m instanceof ASTClass){
                    var clazz = <ASTClass>m;
                    if(clazz.derivedClasses.length > 0){
                        div.append(clazz.toHierarchyHTML());
                    }
                }
            });
            return div;
        }
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

    export class ASTProgram{
        docs:TSDocs;
        constructor(public global:ASTModule){
        }
    }
}