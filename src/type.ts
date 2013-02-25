/// <reference path="html.ts" />

declare function require(name:string):any;

var marked:(markdown:string)=>string;

// web
if(this.marked){
    marked = this.marked;
}
// node.js
else{
    marked = require('./marked');
}

if(!marked){
    console.log('ERROR: marked not found.');
}

module DTSDoc{

    ////////////////////////////////////////////////////////////////////
    // Common Nodes
    ////////////////////////////////////////////////////////////////

    export class ASTDoctagSection{
        constructor(public tag:string, public text:string){}
        build(b:HTMLBuilder):void{
            if(this.tag == 'param'){
                b.dl('ts_param', ()=>{
                    var arr = /([_a-zA-Z]+)(.*)/.exec(this.text);
                    b.dt('ts_code ts_param_name', arr[1]);
                    b.dd('ts_param_description', arr[2]);
                });
            }
        }
    }

    export class ASTDocs{
        constructor(public text:string, public sections:ASTDoctagSection[]){}
        build(b:HTMLBuilder):void{
            b.elem('section', 'ts_classmember_description', {}, ()=>{
                if(this.text){
                    //b.elem('p', '', {}, markedmod(this.text));
                    //b.elem('p', '', {}, this.text);
                    
                    b.elem('p', '', {}, marked(this.text));
                }
                if(this.sections.length > 0){
                    
                    // TODO
                    // available only @param now
                    b.elem('h5', 'ts_parameters', {}, 'Parameters');
                    b.div('', ()=>{
                        this.sections.forEach(s=>{
                            s.build(b);
                        });
                    });
                }
            });
        }
    }

    export class ASTTypeAnnotation{ 
        constructor(public type:ASTType){}
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('ts_type_annotation', ()=>{
                b.span('ts_symbol ts_colon', ':');
                this.type.build(b, scope);
            });
        }
    }    

    export class ASTParameter{ 
        constructor(public name:string, public optional:bool, public type:ASTTypeAnnotation){}
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('', ()=>{
                b.span('', this.name);
                this.type.build(b, scope);
            });
        }
    }

    export class ASTParameters{ 
        constructor(public params:ASTParameter[]){}
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('ts_params', ()=>{
                b.span('', '(');
                for(var i = 0; i < this.params.length; i++){
                    if(i > 0){ b.span('', ', '); }
                    this.params[i].build(b, scope);
                }
                b.span('', ')');
            });
        }
    }    

    export class ASTFuncionSignature{
        constructor(public params:ASTParameters, public retType:ASTTypeAnnotation){
        }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('ts_signiture', ()=>{
                this.params.build(b, scope);
                this.retType.build(b, scope);
            });
        }
    }

    /////////////////////////////////////////////////////////////////
    // Type
    ////////////////////////////////////////////////////////

    // abstract class
    export class ASTType { 
        build(b:HTMLBuilder, scope:ASTModule):void { }
    }

    export class ASTTypeName extends ASTType { 
        name:string;
        constructor(public names:string[]){ 
            super(); 
            this.name = names[names.length - 1];
        } 
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('', ()=>{
                if(
                    this.name == "any" ||
                    this.name == "void"
                ){
                    b.span('ts_reserved', this.name);
                }else if(primitiveTypeNameLinks[this.name]){
                    b.link(primitiveTypeNameLinks[this.name], this.name);
                }else{
                    var member = scope.searchType(this);
                    if(member){
                        // Internal Link
                        b.link("#" + member.getLinkString(), this.name);                    
                    }else if(typeNameLinks[this.name]){
                        // External Link
                        b.link(typeNameLinks[this.name], this.name);
                    }else{
                        // Not found...
                        b.span('', this.name);
                    }
                }
            });
        }
    }

    export class ASTArrayType extends ASTType { 
        constructor(public type:ASTType){ super(); } 
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('', ()=>{
                this.type.build(b, scope);
                b.span('', '[]');
            });
        }
    }

    export class ASTSpecifingType extends ASTType{
        constructor(public members:ASTInterfaceMember[]){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('', ()=>{
                b.span('ts_symbol ts_left_brace', '{');
                this.members.forEach((m)=>{
                    m.build(b, scope);
                    b.span('ts_symbol ts_semi', ';');
                });
                b.span('ts_symbol ts_right_brace', '}'); 
            });
        }
    }

    export class ASTFunctionType extends ASTType{
        constructor(public params:ASTParameters, public retType:ASTType){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('', ()=>{
                this.params.build(b, scope);
                b.span('ts_symbol ts_arrow', '=&gt;');
                this.retType.build(b, scope);
            })            
        }
    }

    export class ASTConstructorTypeLiteral extends ASTType{
        constructor(public params:ASTParameters, public retType:ASTType){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span('', ()=>{
                b.span("ts_reserved", 'new');
                this.params.build(b, scope);
                b.span("ts_symbol ts_arrow", '=&gt;');
                this.retType.build(b, scope);
            });
        }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // Abstract classes
    //////////////////////////////////////////////////////////////////////////////////////////

    export class ASTModuleMember{
        constructor(public memberKind:string, public name:string){}
        parent:ASTModule; 
        docs:ASTDocs;       
        getGlobal():ASTModule{
            return this.parent ? this.parent.getGlobal() : this instanceof ASTModule ? <ASTModule>this : null;
        }
        
        build(b:HTMLBuilder):void{
        }

        getFullName(){
            if( ! this.parent){
                throw "";
            }
            return this.parent.findFullName(this.name);
        }

        getLinkString():string{
            return encodeURIComponent(this.memberKind + ' ' + this.getFullName());
        }
        buildTitle(b:HTMLBuilder):void{
            b.h1("ts_modulemember_title ts_class_title", ()=>{
                var fullName = this.getFullName();
                var linkURL = this.getLinkString();
                b.anchor(linkURL);
                b.link('#' + linkURL, ()=>{
                    b.span('ts_modulemember_a', this.memberKind + " " + this.name);
                });
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Class Members //////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    export class ASTClassMember{
        parent:ASTClass;
        docs:ASTDocs;
        buildMember(b:HTMLBuilder):void{}
    }

    export enum Accessibility{ Public, Private };

    export class ASTConstructor extends ASTClassMember{
        constructor(public params:ASTParameters){ super(); }
        buildMember(b:HTMLBuilder):void{
            b.div("ts_code ts_class_member_title ts_constructor", ()=>{
                b.anchor(this.parent.name + "-constructor");
                b.span("ts_reserved ts_reserved_constructor", 'constructor');
                this.params.build(b, this.parent.parent); 
            });
        }
    }

    export class ASTMethod extends ASTClassMember{ 
        constructor(public access:Accessibility, public isStatic:bool, public name:string, public sign:ASTFuncionSignature){ super(); } 
        buildMember(b:HTMLBuilder):void{
            b.div("ts_code ts_class_member_title ts_method", ()=>{
                b.anchor(this.parent.name + "-" + this.name);
                if(this.isStatic){ b.span("ts_reserved", 'static'); }
                b.span('', this.name);
                this.sign.build(b, this.parent.parent);
            });
        }
    }

    export class ASTField extends ASTClassMember{
        constructor(public access:Accessibility, public isStatic:bool, public name:string, public type:ASTTypeAnnotation){ super(); }
        buildMember(b:HTMLBuilder):void{
            b.div("ts_code ts_class_member_title ts_field", ()=>{
                b.anchor(this.parent.name + "-" + this.name);
                b.span('', (this.isStatic ? "static " : "") + this.name);
                this.type.build(b, this.parent.parent); 
            });
        }
    }

    export class ASTClass extends ASTModuleMember{
        derivedClasses:ASTClass[] = [];
        constructor(name:string, public superClass:ASTTypeName, private interfaces:ASTTypeName[], public members:ASTClassMember[]){ 
            super('class', name); 
        };
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
        buildHierarchy(b:HTMLBuilder):void{
            if(this.getSuperClass() || this.derivedClasses.length > 0){
                b.div("ts_hierarchey", ()=>{
                    b.link('#' + this.getLinkString(), this.name);
                    if(this.derivedClasses.length > 0){
                        this.derivedClasses.map((m)=>m.buildHierarchy(b));
                    }
                });
            }
        }
        build(b:HTMLBuilder):void{
            b.section("ts_modulemember ts_class", ()=>{
                this.buildTitle(b);
                b.section("ts_modulemember_content", ()=>{
                    // description
                    if(this.docs){
                        b.div("ts_classcontent ts_classdescription", ()=>{
                            this.docs.build(b);
                        });
                        b.hr();
                    }

                    if(this.superClass){
                        b.h3('Hierarchy');
                        b.div("ts_classcontent ts_classhierarchy", ()=>{            
                            b.span('', this.name);    
                            var superClass:ASTClass = this.getSuperClass();
                            if(superClass){
                                while(superClass){
                                    b.span('', " ← ");
                                    b.link("#" + superClass.getLinkString(), superClass.name);
                                    superClass = superClass.getSuperClass();
                                }
                            }else{
                                b.span('', " ← " + this.superClass.name);
                            }
                        });
                        b.hr();
                    }

                    if(this.interfaces.length > 0){
                        b.h3('Implementing Interfaces');
                        b.div("ts_classcontent ts_implementations", ()=>{
                            for(var i = 0; i < this.interfaces.length; i++){
                                if(i > 0) b.span('', ", ");
                                var name = this.interfaces[i].name;
                                var sc = this.parent.findType(name);
                                if(sc instanceof ASTInterface){
                                    var ifs:ASTInterface = <ASTInterface> sc;
                                    b.link('#' + ifs.getLinkString(), name);
                                }else{
                                    b.span('', name);
                                }
                            }
                        });
                        b.hr();
                    }

                    if(this.derivedClasses.length > 0){
                        b.h3('Subclasses');
                        b.div("ts_classcontent ts_classsubclasses", ()=>{
                            for(var i = 0; i < this.derivedClasses.length; i++){
                                if(i > 0) b.span('', ", ");
                                var c = this.derivedClasses[i];
                                b.link('#' + c.getFullName(), c.name);
                            }
                        });
                        b.hr();
                    }

                    b.h3('Members');
                    this.members.forEach((m:ASTClassMember)=>{
                        if(m.buildMember){
                            b.div("ts_classcontent ts_classmember", ()=>{
                                m.buildMember(b);
                                if(m.docs){
                                    b.div("ts_classmemberdescription", ()=>{
                                        m.docs.build(b);
                                    });
                                }
                            });
                        }
                    });
                });
            });
        }
    }

    /////////////////////////////////////////////////////////////////////////
    // Interface (Specifing Type)
    //////////////////////////////////////////////////////////////////////

    export class ASTInterfaceMember{
        docs:ASTDocs;
        build(b:HTMLBuilder, scope:ASTModule):void{
        }
    }

    export class ASTIIndexer extends ASTInterfaceMember{
        constructor(public name:string, public indexType:ASTType, public retType:ASTTypeAnnotation){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span("ts_code ts_indexer", ()=>{
                b.span('', "[" + this.name);
                this.indexType.build(b, scope);
                b.span('', "]");
                this.retType.build(b, scope);
            });
        }
    }

    export class ASTIMethod extends ASTInterfaceMember{
        constructor(public name:string, public sign:ASTFuncionSignature){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span("ts_code ts_method'", ()=>{
                b.span('', this.name);
                this.sign.build(b, scope);
            });
        }
    }

    export class ASTIConstructor extends ASTInterfaceMember{
        constructor(public params:ASTParameters, public type:ASTTypeAnnotation){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span("ts_code ts_constructor", ()=>{
                b.span('', "new");
                this.params.build(b, scope);
                this.type.build(b, scope);
            });
        }
    }

    export class ASTIField extends ASTInterfaceMember{
        constructor(public name:string, public isOptional:bool, public type:ASTTypeAnnotation){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{ 
            b.span("ts_code", ()=>{
                b.span('', this.name + (this.isOptional ? "?" : ""));
                this.type.build(b, scope);
            });
        }
    }

    export class ASTInterface extends ASTModuleMember{
        constructor(name:string, public interfaces:ASTTypeName[], public type:ASTSpecifingType){ 
            super('interface', name); 
        }
        build(b:HTMLBuilder):void{
            b.section("ts_modulemember ts_interface", ()=>{
                this.buildTitle(b);
                b.section("ts_modulemember_content", ()=>{
                    if(this.docs){
                        b.h3('Description');
                        b.div("ts_classcontent ts_classdescription", this.docs.text);
                    }
                    if(this.type.members.length > 0){
                        b.h3('Members');
                        this.type.members.forEach((m)=>{
                            b.div("ts_classcontent ts_classmember ts_class_member_title", ()=>{
                                m.build(b, this.parent);
                            });
                            if(m.docs) m.docs.build(b);
                        });
                    }
                });
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////
    // Other Module members
    ////////////////////////////////////////////////////////////////////// 
    
    export class ASTFunction extends ASTModuleMember{ 
        constructor(name:string, public sign:ASTFuncionSignature){ 
            super('function', name); 
        } 
        build(b:HTMLBuilder):void{
            b.section("ts_modulemember ts_function", ()=>{
                this.buildTitle(b);
                b.section("ts_modulemember_content", ()=>{
                    b.span("ts_code ts_method", ()=>{
                        b.span('', "function " + this.name);
                        this.sign.build(b, this.parent);
                    });
                });
                if(this.docs){
                    this.docs.build(b);
                }
            });
        }
    }

     export class ASTIFunction extends ASTInterfaceMember{
        constructor(public params:ASTParameters, public retType:ASTTypeAnnotation){ super(); }
        build(b:HTMLBuilder, scope:ASTModule):void{
            b.span("ts_code ts_method ts_signiture", ()=>{
                this.params.build(b, scope);
                this.retType.build(b, scope);
            });
        }
    }

    export class ASTCallable extends ASTModuleMember{ 
        constructor(public sign:ASTFuncionSignature){ super('function()', ''); } 
        build(b:HTMLBuilder):void{
            b.section("ts_modulemember ts_function", ()=>{
                this.buildTitle(b);
                b.section("ts_modulemember_content", ()=>{
                    b.span("ts_code ts_method", ()=>{
                        b.span('', "function");
                        this.sign.build(b, this.parent);    
                    });
                });
            });
        }
    }

    export class ASTEnum extends ASTModuleMember{
        constructor(name:string, public members:string[]){ 
            super('enum', name); 
        }
        getFullName(){
            return this.parent.findFullName(this.name);
        }
        build(b:HTMLBuilder):void{
            b.section("ts_modulemember ts_enum", ()=>{
                this.buildTitle(b);
                if(this.members.length > 0){
                    b.h3('Members');
                    this.members.forEach((m)=>{
                        b.div('ts_classcontent ts_classmember', ()=>{
                           b.div("ts_code ts_class_member_title ts_method", m);
                        });
                    });
                }
            });
        }
    }

    export class ASTVar extends ASTModuleMember{
        constructor(name:string, public type:ASTTypeAnnotation){ 
            super('var', name); 
        } 
        toString():string{ return this.name; };
        build(b:HTMLBuilder):void{
            b.section('ts_modulemember ts_var', ()=>{
                this.buildTitle(b);
                b.section("ts_modulemember_content", ()=>{
                    b.span("ts_code", ()=>{
                        b.span("ts_reserved ts_reserved_var", 'var');
                        b.span('', this.name);
                        this.type.build(b, this.parent)
                    });
                    if(this.docs){
                        this.docs.build(b);
                    }
                });
            });
        }
    }

    export class ASTModule extends ASTModuleMember{
        constructor(name:string, public members:ASTModuleMember[]){ 
            super('module', name); 
        }

        getMember(name:string):ASTModuleMember{
            for(var i = 0; i < this.members.length; i++){
                var member = this.members[i];    
                if(member.name == name){
                    return member;
                }
            } 
            return null;
        }

        searchType(typeName:ASTTypeName):ASTModuleMember{
            
            var topMember = ((prefix:string):ASTModuleMember=>{
                for(var scope = this; scope; scope = scope.parent){
                    for(var i = 0; i < scope.members.length; i++){
                        var member = scope.members[i];
                        if(
                            member instanceof ASTClass || 
                            member instanceof ASTInterface ||
                            member instanceof ASTEnum
                        ){
                            if(member.name == prefix){
                                return member;
                            }
                        }
                        if(member instanceof ASTModule){
                            var mod = <ASTModule> member;
                            if(mod.name == prefix){
                                return mod;
                            }
                        }
                    } 
                }
                return null;
            })(typeName.names[0]);

            if(topMember){
                var focused:ASTModuleMember = topMember;
                for(var i = 1; i < typeName.names.length && focused; i++){
                    if(focused instanceof ASTModuleMember){
                        var m = <ASTModule> focused;
                        focused = m.getMember(typeName.names[i]);
                    }else{
                        return null;
                    }
                }
                return focused;
            }
            
            return null;
        }

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
        buildHierarchy(b:HTMLBuilder):void{
            b.div('', ()=>{
                this.members.forEach((m)=>{ 
                    if(m instanceof ASTModule){
                        (<ASTModule>m).buildHierarchy(b);
                    }else if(m instanceof ASTClass){
                        var clazz = <ASTClass>m;
                        if(clazz.derivedClasses.length > 0){
                            clazz.buildHierarchy(b);
                        }
                    }
                });
            });
        }
        
        build(b:HTMLBuilder):void{
            b.section('ts_modulemember ts_module', ()=>{
                this.buildTitle(b);
                b.section('', ()=>{
                    if(this.docs){
                        b.p("ts_modulemember_description", this.docs.text);
                    }
                    this.members.forEach((m)=>{ m.build(b); });
                });
            });
        }
    }

    export class ASTProgram{
        docs:ASTDocs;
        constructor(public global:ASTModule){
        }

        build(b:HTMLBuilder):void{
            this.global.build(b);
        }
    }


    export enum GenerationResultType{
        Success = <any> "success",
        Fail = <any> "fail",
        State = <any> "state"
    }

    // JSON data
    export interface GenerationResult{
        type: GenerationResultType;

        // on state report
        state?: number;
        
        // on succeed
        docs?: string;

        // on failed
        line?: number;
        column?: number;
        source?: string;
        message?: string;
    }


    export function generateDocument(sourceCode:string, watcher?:(v:number)=>void):GenerationResult{
        var result = DTSDoc.pProgram(watcher).parse(new Source(sourceCode, 0));
        if(result.success){
            var program:DTSDoc.ASTProgram = result.value;
            var global:DTSDoc.ASTModule = program.global;
            var members = global.members;

            var b = new DTSDoc.HTMLBuilder();
            
            b.div('', ()=>{
                if(global.docs){
                    b.p('', ()=>{
                        global.docs.build(b);
                    });
                }
                b.h2('Contents');
                b.ul("contents", ()=>{
                    b.li(()=>{
                        b.link("#members", 'Members');
                    });
                    b.li(()=>{
                        b.link("#hierarchy", 'Class Hierarchy');
                    });
                });

                b.anchor("members");
                b.h2('Members');        
                b.div('', ()=>{
                    members.map((m)=>{
                        m.build(b);
                    });
                });                         
                b.hr();
                b.anchor("hierarchy");
                b.h2('Class Hierarchy');
                b.div('', ()=>{
                    global.buildHierarchy(b);
                });
                b.hr();
                b.footer(()=>{
                    b.link("https://github.com/kontan/dtsdoc", 'DTSDoc');
                });
            });

            return {
                "type": GenerationResultType.Success,
                "docs": b.buildString()
            };
        }else{
            var pos = result.source.getPosition();
            return {
                "type": GenerationResultType.Fail,
                'line': pos.line,
                'column': pos.column,
                'source': result.source.source.slice(result.source.position, result.source.position + 128),
                'message': result.errorMesssage
            };
        }
    };
}