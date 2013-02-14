/// <reference path="../typings/jquery.d.ts" />

module DTSDoc{

    ////////////////////////////////////////////////////////////////////
    // Common Nodes
    ////////////////////////////////////////////////////////////////

    export class ASTDocSection{
        constructor(public tag:string, public text:string){}
        toHTML(mod:ASTModule):JQuery{
            if(this.tag == 'param'){
                var arr = /([_a-zA-Z]+)(.*)/.exec(this.text);
                var li = $('<dl class="ts_param"/>');
                li.append($('<dt class="ts_code ts_param_name"/>').text(arr[1]));
                li.append($('<dd class="ts_param_description"/>').text(arr[2]));
                return li;
            }
        }
    }

    export class ASTDocs{
        constructor(public text:string, public sections:ASTDocSection[]){}
        toHTML(mod:ASTModule):JQuery{
            var section = $('<section class="ts_classmember_description"/>');

            var params = $('<div/>');
            this.sections.forEach(s=>{
                params.append(s.toHTML(mod));
            });
            if(params.children().length > 0){
                section.append($('<h5 class="ts_parameters"/>').text('Parameters'));
                section.append(params);
            }

            return section;
        }
    }

    export class ASTTypeAnnotation{ 
        constructor(public type:ASTType){}
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_type_annotation"/>');
            span.append('<span class="ts_symbol ts_colon">:</span>');
            span.append(this.type.toHTML(mod));
            return span;
        }
    }    

    export class ASTParameter{ 
        constructor(public name:string, public optional:bool, public type:ASTTypeAnnotation){}
        toHTML(mod:ASTModule):JQuery{
            var span = $("<span/>");
            span.append($("<span/>").text(this.name));
            if(this.optional){
                span.append($('<span class="ts_symbol ts_optional">?</span>'));
            }
            span.append(this.type.toHTML(mod));
            return span;
        }
    }

    export class ASTParameters{ 
        constructor(public params:ASTParameter[]){}
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_params"/>');
            span.append("(");
            for(var i = 0; i < this.params.length; i++){
                if(i > 0){ span.append(", "); }
                span.append(this.params[i].toHTML(mod));
            }
            span.append(")");
            return span;
        }
    }    

    export class ASTFuncionSignature{
        constructor(public params:ASTParameters, public retType:ASTTypeAnnotation){
            if(!this.params.toHTML){
                console.log("");
            }
        }
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_signiture"/>');
            span.append(this.params.toHTML(mod));
            span.append(this.retType.toHTML(mod));
            return span;
        }
    }

    /////////////////////////////////////////////////////////////////
    // Type
    ////////////////////////////////////////////////////////

    // abstract class
    export class ASTType { 
        toHTML(mod:ASTModule):JQuery{ return undefined; } 
    }

    export class ASTTypeName extends ASTType { 
    	constructor(public name:string){ super(); } 
    	toHTML(mod:ASTModule):JQuery{ 
	    	if(
	            this.name == "string" ||
	            this.name == "number" ||
	            this.name == "bool"   ||
                this.name == "Object"
            ){
                return $('<span/>').append(this.name);
            }else if(
	            this.name == "any" ||
	            this.name == "void"
	        ){
                return $('<span class="ts_reserved"/>').append(this.name);
            }else{
                return $("<a/>").attr("href", "#" + mod.findFullName(this.name)).text(this.name);
	        }
    	}
    }

    export class ASTArrayType extends ASTType { 
    	constructor(public type:ASTType){ super(); } 
    	toHTML(mod:ASTModule):JQuery{ return $("<span/>").append(this.type.toHTML(mod)).append("[]"); }
    }

    export class ASTModulePrefix extends ASTType {
        name: string;
        type: ASTType;
        constructor(name:string, type:ASTTypeName);
        constructor(name:string, type:ASTModulePrefix);
    	constructor(name:string, type:any){ 
            super(); 
            this.name = name;
            this.type = type;
        } 
    	toHTML(mod:ASTModule):JQuery{ return $("<span/>").append(this.name).append(".").append(this.type.toHTML(mod)); }
    }

    export class ASTSpecifingType extends ASTType{
    	constructor(public members:ASTInterfaceMember[]){ super(); }
    	toHTML(mod:ASTModule):JQuery{
            var span = $('<span />');
            span.append($('<span class="ts_symbol ts_left_brace">{</span>'));
            this.members.forEach((m)=>{
                span.append(m.toHTML(mod));
                span.append($('<span class="ts_symbol ts_semi">;</span>'));
            });
            span.append($('<span class="ts_symbol ts_right_brace">}</span>')); 
            return span;
        }
    }

    export class ASTFunctionType extends ASTType{
    	constructor(public params:ASTParameters, public retType:ASTType){ super(); }
    	toHTML(mod:ASTModule):JQuery{ return $("<span/>").append(this.params.toHTML(mod)).append($('<span class="ts_symbol ts_arrow">=&gt;</span>')).append(this.retType.toHTML(mod)); }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // Abstract classes
    //////////////////////////////////////////////////////////////////////////////////////////

    export class ASTModuleMember{
        constructor(public name:string){}
        parent:ASTModule; 
        docs:ASTDocs;       
        getGlobal():ASTModule{
            return this.parent ? this.parent.getGlobal() : this instanceof ASTModule ? <ASTModule>this : null;
        }
        toHTML():JQuery{ return undefined; };

        getFullName(){
            return this.parent.findFullName(this.name);
        }

        createTitle(prefix:string):JQuery{
            var fullName = this.getFullName();
            var a = $('<a class="ts_modulemember_a"/>').attr("name", fullName).attr("href", '#' + fullName).text(prefix + " " + this.name);
            return $('<h1 class="ts_modulemember_title ts_class_title" />').append(a);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Class Members //////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    export class ASTClassMember{
        parent:ASTClass;
        docs:ASTDocs;
        toHTML():JQuery{ 
            var title = this.memberToHTML();
            var div = $('<div class="ts_class_member_container">').append(title); 
            if(this.docs){
                div.append($('<p class="ts_classmember_description"/>').html(this.docs.text));
                div.append(this.docs.toHTML(undefined));
            }
            return div;
        };
        memberToHTML():JQuery{ return undefined; };
    }

    export enum Accessibility{ Public, Private };

    export class ASTConstructor extends ASTClassMember{
        constructor(public params:ASTParameters){ super(); }
        memberToHTML():JQuery{
            var title = $('<div class="ts_code ts_class_member_title ts_constructor"/>');
            title.append($('<a/>').attr("name", this.parent.name + "-constructor"));
            title.append($('<span class="ts_reserved ts_reserved_constructor">constructor</span>'));
            title.append(this.params.toHTML(this.parent.parent));
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
        constructor(public access:Accessibility, public isStatic:bool, public name:string, public type:ASTTypeAnnotation){ super(); }
        toString():string{ return this.name + ":" + this.type; }
        memberToHTML():JQuery{ 
            var title = $('<div class="ts_code ts_class_member_title ts_field" />');
            title.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            title.append((this.isStatic ? "static " : "") + this.name);
            title.append(this.type.toHTML(this.parent.parent));
            return title; 
        }
    }

    export class ASTClass extends ASTModuleMember{
        derivedClasses:ASTClass[] = [];
        constructor(name:string, public superClass:ASTTypeName, private interfaces:ASTTypeName[], public members:ASTClassMember[]){ super(name); };
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
            p.append(this.createTitle('class'));
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
                    hierarchy.append(" ← " + this.superClass.name);
                }
                content.append(hierarchy);                
                content.append($('<hr/>'));
            }

            if(this.interfaces.length > 0){
                content.append('<h3>Implementing Interfaces</h3>');
                var div = $('<div class="ts_classcontent ts_implementations"/>');
                for(var i = 0; i < this.interfaces.length; i++){
                    if(i > 0) div.append(", ");

                    var name = this.interfaces[i].name;
                    var sc = this.parent.findType(name);
                    if(sc instanceof ASTInterface){
                        var ifs:ASTInterface = <ASTInterface> sc;
                        div.append($('<a/>').attr('href', '#' + ifs.getFullName()).append(name));
                    }else{
                        div.append(name);
                    }
                }
                content.append(div);
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

    export class ASTInterfaceMember{
        docs:ASTDocs;
        toHTML(mod:ASTModule):JQuery{ return undefined; }
    }

    export class ASTIIndexer extends ASTInterfaceMember{
        constructor(public name:string, public indexType:ASTType, public retType:ASTTypeAnnotation){ super(); }
        toHTML(mod:ASTModule):JQuery{
        	var span = $('<span class="ts_code ts_indexer"/>');
        	span.append("[" + this.name);
        	span.append(this.indexType.toHTML(mod));
        	span.append("]");
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
        constructor(public params:ASTParameters, public type:ASTTypeAnnotation){ super(); }
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("new");
            span.append(this.params.toHTML(mod));
            span.append(this.type.toHTML(mod));
            return span;
        }
    }

    export class ASTIField extends ASTInterfaceMember{
        constructor(public name:string, public isOptional:bool, public type:ASTTypeAnnotation){ super(); }
        toHTML(mod:ASTModule):JQuery{ 
            return $('<span class="ts_code" />').append(this.name + (this.isOptional ? "?" : "")).append(this.type.toHTML(mod)); 
        }
    }


    export class ASTIFunction extends ASTInterfaceMember{
        constructor(public params:ASTParameters, public retType:ASTTypeAnnotation){ super(); }
        toHTML(mod:ASTModule):JQuery{
            var span = $('<span class="ts_code ts_method ts_signiture"/>');
            span.append(this.params.toHTML(mod));
            span.append(this.retType.toHTML(mod));
            return span;
        }
    }

    export class ASTInterface extends ASTModuleMember{
        constructor(name:string, public interfaces:ASTTypeName[], public type:ASTSpecifingType){ super(name); }
    
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_interface"/>');
        	section.append(this.createTitle('interface'));
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
        constructor(name:string, public sign:ASTFuncionSignature){ super(name); } 
        toHTML():JQuery{
            var p = $('<section class="ts_modulemember ts_function"/>');
            p.append(this.createTitle('function'));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            var span = $('<span class="ts_code ts_method"/>').appendTo(content);
            span.append("function " + this.name);
            span.append(this.sign.toHTML(this.parent));
            return p;
        }
    }

    export class ASTEnum extends ASTModuleMember{
        constructor(name:string, public members:string[]){ super(name); }
        getFullName(){
            return this.parent.findFullName(this.name);
        }
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_enum"/>');
        	section.append(this.createTitle('enum'));
        	this.members.forEach((m)=>{
        		section.append($("<div/>").text(m));
        	});
        	return section;
        }
    }

    export class ASTVar extends ASTModuleMember{
        constructor(name:string, public type:ASTTypeAnnotation){ super(name); } 
        toString():string{ return this.name; };
        toHTML():JQuery{
        	var section = $('<section class="ts_modulemember ts_var" />');
            section.append(this.createTitle('var'));
        	var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
        	content.append(
        		$('<span class="ts_code"/>').append($('<span class="ts_reserved ts_reserved_var">var</span>')).append(this.name).append(this.type.toHTML(this.parent))
        	);
        	return section;
        }
    }

    export class ASTModule extends ASTModuleMember{
        constructor(name:string, public members:ASTModuleMember[]){ super(name); }
        findType(name:string):ASTModuleMember{
            var splitted = name.split('.'); 
            if(splitted.length == 1){
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++){
                    var member = this.members[i];
                    if(
                        member instanceof ASTClass || 
                        member instanceof ASTInterface ||
                        member instanceof ASTEnum 
                    ){
                        if(member.name == targetType){
                            return member;
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
        getTypeFromFullName(name:string):ASTModuleMember{
            var splitted = name.split('.'); 
            if(splitted.length == 1){
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++){
                    var member = this.members[i];
                    if(
                        member instanceof ASTClass || 
                        member instanceof ASTInterface ||
                        member instanceof ASTEnum
                    ){
                        if(member.name == targetType){
                            return member;
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
        findFullName(name:string):string{
            var type:ASTModuleMember = this.findType(name);
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
            section.append(this.createTitle('module'));        
            var content = $('<section />').appendTo(section);
            if(this.docs){
            	content.append($('<p class="ts_modulemember_description"/>').html(this.docs.text));
            }
            this.members.forEach((m)=>{ content.append(m.toHTML()); });
            return section;
        }
    }

    export class ASTProgram{
        docs:ASTDocs;
        constructor(public global:ASTModule){
        }
    }
}