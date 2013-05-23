var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../DefinitelyTyped/node/node.d.ts" />
/// <reference path="../Parsect/src/parsect.ts"/>
/// <reference path="../Parsect/src/globals.ts"/>
/// <reference path="htmlemitter.ts" />
/// <reference path="primitives.ts" />
/// <reference path="links.ts" />
var marked;
if(!marked) {
    marked = require("./marked");
}
var DTSDoc;
(function (DTSDoc) {
    function emitReserved(b, name) {
        b.span('ts_reserved ts_reserved_' + name, name);
    }
    function emitIdentifier(b, name) {
        b.span('ts_identifier', name);
    }
    function emitSymbol(b, name, symbol) {
        b.span('ts_symbol ts_symbol_' + name, symbol);
    }
    ////////////////////////////////////////////////////////////////////
    // Common Nodes
    ////////////////////////////////////////////////////////////////
    var ASTDoctagSection = (function () {
        function ASTDoctagSection(tag, text) {
            this.tag = tag;
            this.text = text;
        }
        ASTDoctagSection.prototype.build = function (b) {
            var _this = this;
            if(this.tag == 'param') {
                b.dl('ts_param', function () {
                    var arr = /([_a-zA-Z]+)(.*)/.exec(_this.text);
                    if(arr.length >= 2) {
                        b.dt('ts_code ts_param_name', arr[1]);
                    }
                    if(arr.length >= 3) {
                        b.dd('ts_param_description', arr[2]);
                    }
                });
            }
        };
        return ASTDoctagSection;
    })();
    DTSDoc.ASTDoctagSection = ASTDoctagSection;    
    var ASTDocs = (function () {
        function ASTDocs(text, sections) {
            this.text = text;
            this.sections = sections;
        }
        ASTDocs.prototype.build = function (b) {
            var _this = this;
            b.elem('section', 'ts_classmember_description', {
            }, function () {
                if(_this.text) {
                    //b.elem('p', '', {}, markedmod(this.text));
                    //b.elem('p', '', {}, this.text);
                    b.elem('div', '', {
                    }, marked(_this.text));
                }
                // TODO
                // available only @param now
                var params = _this.sections.filter(function (tag) {
                    return tag.tag === 'param';
                });
                if(params.length > 0) {
                    b.elem('h5', 'ts_parameters', {
                    }, 'Parameters');
                    b.div('', function () {
                        params.forEach(function (s) {
                            s.build(b);
                        });
                    });
                }
            });
        };
        return ASTDocs;
    })();
    DTSDoc.ASTDocs = ASTDocs;    
    var ASTTypeAnnotation = (function () {
        function ASTTypeAnnotation(type) {
            this.type = type;
        }
        ASTTypeAnnotation.prototype.build = function (b, scope) {
            var _this = this;
            b.span('ts_type_annotation', function () {
                emitSymbol(b, 'colon', ':');
                _this.type.build(b, scope);
            });
        };
        return ASTTypeAnnotation;
    })();
    DTSDoc.ASTTypeAnnotation = ASTTypeAnnotation;    
    var ASTParameter = (function () {
        function ASTParameter(isVarLength, name, optional, type) {
            this.isVarLength = isVarLength;
            this.name = name;
            this.optional = optional;
            this.type = type;
        }
        ASTParameter.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                if(_this.isVarLength) {
                    emitSymbol(b, 'dots', '...');
                }
                emitIdentifier(b, _this.name);
                if(_this.optional) {
                    emitSymbol(b, 'question', '?');
                }
                _this.type.build(b, scope);
            });
        };
        return ASTParameter;
    })();
    DTSDoc.ASTParameter = ASTParameter;    
    var ASTParameters = (function () {
        function ASTParameters(params) {
            this.params = params;
        }
        ASTParameters.prototype.build = function (b, scope) {
            var _this = this;
            b.span('ts_params', function () {
                emitSymbol(b, 'leftparenthesis', '(');
                for(var i = 0; i < _this.params.length; i++) {
                    if(i > 0) {
                        emitSymbol(b, 'comma', ',');
                    }
                    _this.params[i].build(b, scope);
                }
                emitSymbol(b, 'rightparenthesis', ')');
            });
        };
        return ASTParameters;
    })();
    DTSDoc.ASTParameters = ASTParameters;    
    var ASTFuncionSignature = (function () {
        function ASTFuncionSignature(params, retType) {
            this.params = params;
            this.retType = retType;
        }
        ASTFuncionSignature.prototype.build = function (b, scope) {
            var _this = this;
            b.span('ts_signiture', function () {
                _this.params.build(b, scope);
                _this.retType.build(b, scope);
            });
        };
        return ASTFuncionSignature;
    })();
    DTSDoc.ASTFuncionSignature = ASTFuncionSignature;    
    /////////////////////////////////////////////////////////////////
    // Type
    ////////////////////////////////////////////////////////
    // abstract class
    var ASTType = (function () {
        function ASTType() { }
        ASTType.prototype.build = function (b, scope) {
        };
        return ASTType;
    })();
    DTSDoc.ASTType = ASTType;    
    var ASTTypeName = (function (_super) {
        __extends(ASTTypeName, _super);
        function ASTTypeName(segments) {
                _super.call(this);
            this.segments = segments;
            this.name = segments[segments.length - 1];
        }
        ASTTypeName.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                if(_this.name == "any" || _this.name == "void") {
                    emitReserved(b, _this.name);
                } else if(primitiveTypeNameLinks[_this.name]) {
                    b.link(primitiveTypeNameLinks[_this.name], _this.name);
                } else {
                    var member = scope.searchType(_this);
                    if(member) {
                        // Internal Link
                        b.link("#" + member.getLinkString(), _this.name);
                    } else if(typeNameLinks[_this.name]) {
                        // External Link
                        b.link(typeNameLinks[_this.name], _this.name);
                    } else {
                        // Not found...
                        b.span('', _this.name);
                    }
                }
            });
        };
        return ASTTypeName;
    })(ASTType);
    DTSDoc.ASTTypeName = ASTTypeName;    
    var ASTArrayType = (function (_super) {
        __extends(ASTArrayType, _super);
        function ASTArrayType(type) {
                _super.call(this);
            this.type = type;
        }
        ASTArrayType.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                _this.type.build(b, scope);
                emitSymbol(b, 'array', '[]');
            });
        };
        return ASTArrayType;
    })(ASTType);
    DTSDoc.ASTArrayType = ASTArrayType;    
    var ASTSpecifingType = (function (_super) {
        __extends(ASTSpecifingType, _super);
        function ASTSpecifingType(members) {
                _super.call(this);
            this.members = members;
        }
        ASTSpecifingType.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                emitSymbol(b, 'leftbrace', '{');
                _this.members.forEach(function (m) {
                    m.build(b, scope);
                    emitSymbol(b, 'semicolon', ';');
                });
                emitSymbol(b, 'rightbrace', '}');
            });
        };
        return ASTSpecifingType;
    })(ASTType);
    DTSDoc.ASTSpecifingType = ASTSpecifingType;    
    var ASTFunctionType = (function (_super) {
        __extends(ASTFunctionType, _super);
        function ASTFunctionType(docs, params, retType) {
                _super.call(this);
            this.docs = docs;
            this.params = params;
            this.retType = retType;
        }
        ASTFunctionType.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                _this.params.build(b, scope);
                emitSymbol(b, 'arrow', '=&gt;');
                _this.retType.build(b, scope);
            });
        };
        return ASTFunctionType;
    })(ASTType);
    DTSDoc.ASTFunctionType = ASTFunctionType;    
    var ASTConstructorTypeLiteral = (function (_super) {
        __extends(ASTConstructorTypeLiteral, _super);
        function ASTConstructorTypeLiteral(params, retType) {
                _super.call(this);
            this.params = params;
            this.retType = retType;
        }
        ASTConstructorTypeLiteral.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                emitReserved(b, 'new');
                _this.params.build(b, scope);
                emitSymbol(b, 'arrow', '=&gt;');
                _this.retType.build(b, scope);
            });
        };
        return ASTConstructorTypeLiteral;
    })(ASTType);
    DTSDoc.ASTConstructorTypeLiteral = ASTConstructorTypeLiteral;    
    ////////////////////////////////////////////////////////////////////////////////////////////
    // Abstract classes
    //////////////////////////////////////////////////////////////////////////////////////////
    var ASTModuleMember = (function () {
        function ASTModuleMember(memberKind, name) {
            this.memberKind = memberKind;
            this.name = name;
        }
        ASTModuleMember.prototype.getGlobal = function () {
            return this.parent ? this.parent.getGlobal() : this instanceof ASTModule ? this : null;
        };
        ASTModuleMember.prototype.build = function (b) {
        };
        ASTModuleMember.prototype.getFullName = function () {
            var type = this;
            var n = type.name;
            var mod = type.parent;
            while(mod.parent) {
                n = mod.name + "." + n;
                mod = mod.parent;
            }
            return n;
        };
        ASTModuleMember.prototype.getLinkString = function () {
            return encodeURIComponent(this.memberKind + ' ' + this.getFullName());
        };
        ASTModuleMember.prototype.buildTitle = function (b) {
            var _this = this;
            b.h1("ts_modulemember_title ts_class_title", function () {
                var fullName = _this.getFullName();
                var linkURL = _this.getLinkString();
                b.anchor(linkURL);
                b.link('#' + linkURL, function () {
                    b.span('ts_modulemember_a', _this.memberKind + " " + _this.name);
                });
            });
        };
        return ASTModuleMember;
    })();
    DTSDoc.ASTModuleMember = ASTModuleMember;    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Class Members //////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var ASTClassMember = (function () {
        function ASTClassMember() { }
        ASTClassMember.prototype.buildMember = function (b) {
        };
        return ASTClassMember;
    })();
    DTSDoc.ASTClassMember = ASTClassMember;    
    (function (Accessibility) {
        Accessibility._map = [];
        Accessibility._map[0] = "Public";
        Accessibility.Public = 0;
        Accessibility._map[1] = "Private";
        Accessibility.Private = 1;
    })(DTSDoc.Accessibility || (DTSDoc.Accessibility = {}));
    var Accessibility = DTSDoc.Accessibility;
    ;
    var ASTConstructor = (function (_super) {
        __extends(ASTConstructor, _super);
        function ASTConstructor(params) {
                _super.call(this);
            this.params = params;
        }
        ASTConstructor.prototype.buildMember = function (b) {
            var _this = this;
            b.div("ts_code ts_class_member_title ts_constructor", function () {
                b.anchor(_this.parent.name + "-constructor");
                emitReserved(b, 'constructor');
                _this.params.build(b, _this.parent.parent);
            });
        };
        return ASTConstructor;
    })(ASTClassMember);
    DTSDoc.ASTConstructor = ASTConstructor;    
    var ASTMethod = (function (_super) {
        __extends(ASTMethod, _super);
        function ASTMethod(access, isStatic, name, sign) {
                _super.call(this);
            this.access = access;
            this.isStatic = isStatic;
            this.name = name;
            this.sign = sign;
        }
        ASTMethod.prototype.buildMember = function (b) {
            var _this = this;
            b.div("ts_code ts_class_member_title ts_method", function () {
                b.anchor(_this.parent.name + "-" + _this.name);
                if(_this.isStatic) {
                    emitReserved(b, 'static');
                }
                emitIdentifier(b, _this.name);
                _this.sign.build(b, _this.parent.parent);
            });
        };
        return ASTMethod;
    })(ASTClassMember);
    DTSDoc.ASTMethod = ASTMethod;    
    var ASTField = (function (_super) {
        __extends(ASTField, _super);
        function ASTField(access, isStatic, name, type) {
                _super.call(this);
            this.access = access;
            this.isStatic = isStatic;
            this.name = name;
            this.type = type;
        }
        ASTField.prototype.buildMember = function (b) {
            var _this = this;
            b.div("ts_code ts_class_member_title ts_field", function () {
                b.anchor(_this.parent.name + "-" + _this.name);
                if(_this.isStatic) {
                    emitReserved(b, 'static');
                }
                emitIdentifier(b, _this.name);
                _this.type.build(b, _this.parent.parent);
            });
        };
        return ASTField;
    })(ASTClassMember);
    DTSDoc.ASTField = ASTField;    
    var ASTClass = (function (_super) {
        __extends(ASTClass, _super);
        function ASTClass(name, superClass, interfaces, members) {
            var _this = this;
                _super.call(this, 'class', name);
            this.superClass = superClass;
            this.interfaces = interfaces;
            this.members = members;
            this.derivedClasses = [];
            members.forEach(function (m) {
                m.parent = _this;
            });
        }
        ASTClass.prototype.getSuperClass = function () {
            if(this.superClass) {
                var sc = this.parent.searchType(this.superClass);
                if(sc instanceof ASTClass) {
                    return sc;
                }
            }
            return null;
        };
        ASTClass.prototype.updateHierarchy = function () {
            var superClass = this.getSuperClass();
            if(superClass) {
                superClass.derivedClasses.push(this);
            }
        };
        ASTClass.prototype.buildHierarchy = function (b) {
            var _this = this;
            if(this.getSuperClass() || this.derivedClasses.length > 0) {
                b.div("ts_hierarchey", function () {
                    b.link('#' + _this.getLinkString(), _this.name);
                    if(_this.derivedClasses.length > 0) {
                        _this.derivedClasses.map(function (m) {
                            return m.buildHierarchy(b);
                        });
                    }
                });
            }
        };
        ASTClass.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_class", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    // description
                    if(_this.docs) {
                        b.div("ts_classcontent ts_classdescription", function () {
                            _this.docs.build(b);
                        });
                        b.hr();
                    }
                    if(_this.superClass) {
                        b.h3('Hierarchy');
                        b.div("ts_classcontent ts_classhierarchy", function () {
                            emitIdentifier(b, _this.name);
                            var superClass = _this.getSuperClass();
                            if(superClass) {
                                while(superClass) {
                                    b.span('', " ← ");
                                    b.link("#" + superClass.getLinkString(), superClass.name);
                                    superClass = superClass.getSuperClass();
                                }
                            } else {
                                b.span('', " ← " + _this.superClass.name);
                            }
                        });
                        b.hr();
                    }
                    if(_this.interfaces.length > 0) {
                        b.h3('Implemented Interfaces');
                        b.div("ts_classcontent ts_implementations", function () {
                            for(var i = 0; i < _this.interfaces.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var name = _this.interfaces[i].name;
                                var sc = _this.parent.searchType(new ASTTypeName([
                                    name
                                ]));
                                if(sc instanceof ASTInterface) {
                                    var ifs = sc;
                                    b.link('#' + ifs.getLinkString(), name);
                                } else {
                                    b.span('', name);
                                }
                            }
                        });
                        b.hr();
                    }
                    if(_this.derivedClasses.length > 0) {
                        b.h3('Subclasses');
                        b.div("ts_classcontent ts_classsubclasses", function () {
                            for(var i = 0; i < _this.derivedClasses.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var c = _this.derivedClasses[i];
                                b.link('#' + c.getLinkString(), c.name);
                            }
                        });
                        b.hr();
                    }
                    if(_this.members.length > 0) {
                        b.h3('Members');
                        _this.members.forEach(function (m) {
                            if(m.buildMember) {
                                b.div("ts_classcontent ts_classmember", function () {
                                    m.buildMember(b);
                                    if(m.docs) {
                                        b.div("ts_classmemberdescription", function () {
                                            m.docs.build(b);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
        };
        return ASTClass;
    })(ASTModuleMember);
    DTSDoc.ASTClass = ASTClass;    
    /////////////////////////////////////////////////////////////////////////
    // Interface (Specifing Type)
    //////////////////////////////////////////////////////////////////////
    var ASTInterfaceMember = (function () {
        function ASTInterfaceMember() { }
        ASTInterfaceMember.prototype.build = function (b, scope) {
        };
        return ASTInterfaceMember;
    })();
    DTSDoc.ASTInterfaceMember = ASTInterfaceMember;    
    var ASTIIndexer = (function (_super) {
        __extends(ASTIIndexer, _super);
        function ASTIIndexer(name, indexType, retType) {
                _super.call(this);
            this.name = name;
            this.indexType = indexType;
            this.retType = retType;
        }
        ASTIIndexer.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_indexer", function () {
                emitSymbol(b, 'leftbracket', "[");
                emitIdentifier(b, _this.name);
                _this.indexType.build(b, scope);
                emitSymbol(b, 'rightbracket', "]");
                _this.retType.build(b, scope);
            });
        };
        return ASTIIndexer;
    })(ASTInterfaceMember);
    DTSDoc.ASTIIndexer = ASTIIndexer;    
    var ASTIMethod = (function (_super) {
        __extends(ASTIMethod, _super);
        function ASTIMethod(name, isOpt, sign) {
                _super.call(this);
            this.name = name;
            this.isOpt = isOpt;
            this.sign = sign;
        }
        ASTIMethod.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_method'", function () {
                emitIdentifier(b, _this.name);
                if(_this.isOpt) {
                    emitSymbol(b, 'question', '?');
                }
                _this.sign.build(b, scope);
            });
        };
        return ASTIMethod;
    })(ASTInterfaceMember);
    DTSDoc.ASTIMethod = ASTIMethod;    
    var ASTIConstructor = (function (_super) {
        __extends(ASTIConstructor, _super);
        function ASTIConstructor(params, type) {
                _super.call(this);
            this.params = params;
            this.type = type;
        }
        ASTIConstructor.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_constructor", function () {
                emitReserved(b, "new");
                _this.params.build(b, scope);
                _this.type.build(b, scope);
            });
        };
        return ASTIConstructor;
    })(ASTInterfaceMember);
    DTSDoc.ASTIConstructor = ASTIConstructor;    
    var ASTIField = (function (_super) {
        __extends(ASTIField, _super);
        function ASTIField(name, isOptional, type) {
                _super.call(this);
            this.name = name;
            this.isOptional = isOptional;
            this.type = type;
        }
        ASTIField.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code", function () {
                emitIdentifier(b, _this.name);
                if(_this.isOptional) {
                    emitSymbol(b, 'question', "?");
                }
                _this.type.build(b, scope);
            });
        };
        return ASTIField;
    })(ASTInterfaceMember);
    DTSDoc.ASTIField = ASTIField;    
    var ASTIFunction = (function (_super) {
        __extends(ASTIFunction, _super);
        function ASTIFunction(params, retType) {
                _super.call(this);
            this.params = params;
            this.retType = retType;
        }
        ASTIFunction.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_method ts_signiture", function () {
                _this.params.build(b, scope);
                _this.retType.build(b, scope);
            });
        };
        return ASTIFunction;
    })(ASTInterfaceMember);
    DTSDoc.ASTIFunction = ASTIFunction;    
    ///////////////////////////////////////////////////////////////////////
    // Other Module members
    //////////////////////////////////////////////////////////////////////
    var ASTInterface = (function (_super) {
        __extends(ASTInterface, _super);
        function ASTInterface(name, interfaces, type) {
                _super.call(this, 'interface', name);
            this.interfaces = interfaces;
            this.type = type;
        }
        ASTInterface.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_interface", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    if(_this.docs) {
                        b.h3('Description');
                        b.div("ts_classcontent ts_classdescription", _this.docs.text);
                    }
                    if(_this.interfaces.length > 0) {
                        b.h3('Extended Interfaces');
                        b.div("ts_classcontent ts_implementations", function () {
                            for(var i = 0; i < _this.interfaces.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var name = _this.interfaces[i].name;
                                var sc = _this.parent.searchType(new ASTTypeName([
                                    name
                                ]));
                                if(sc instanceof ASTInterface) {
                                    var ifs = sc;
                                    b.link('#' + ifs.getLinkString(), name);
                                } else {
                                    b.span('', name);
                                }
                            }
                        });
                        b.hr();
                    }
                    if(_this.type.members.length > 0) {
                        b.h3('Members');
                        _this.type.members.forEach(function (m) {
                            b.div("ts_classcontent ts_classmember ts_class_member_title", function () {
                                m.build(b, _this.parent);
                            });
                            if(m.docs) {
                                m.docs.build(b);
                            }
                        });
                    }
                });
            });
        };
        return ASTInterface;
    })(ASTModuleMember);
    DTSDoc.ASTInterface = ASTInterface;    
    var ASTFunction = (function (_super) {
        __extends(ASTFunction, _super);
        function ASTFunction(name, sign) {
                _super.call(this, 'function', name);
            this.sign = sign;
        }
        ASTFunction.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_function", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code ts_method", function () {
                        emitReserved(b, "function");
                        emitIdentifier(b, _this.name);
                        _this.sign.build(b, _this.parent);
                    });
                });
                if(_this.docs) {
                    _this.docs.build(b);
                }
            });
        };
        return ASTFunction;
    })(ASTModuleMember);
    DTSDoc.ASTFunction = ASTFunction;    
    var ASTCallable = (function (_super) {
        __extends(ASTCallable, _super);
        function ASTCallable(sign) {
                _super.call(this, 'function()', '');
            this.sign = sign;
        }
        ASTCallable.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_function", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code ts_method", function () {
                        emitReserved(b, "function");
                        _this.sign.build(b, _this.parent);
                    });
                });
            });
        };
        return ASTCallable;
    })(ASTModuleMember);
    DTSDoc.ASTCallable = ASTCallable;    
    var ASTEnum = (function (_super) {
        __extends(ASTEnum, _super);
        function ASTEnum(name, members) {
                _super.call(this, 'enum', name);
            this.members = members;
        }
        ASTEnum.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_enum", function () {
                _this.buildTitle(b);
                if(_this.members.length > 0) {
                    b.h3('Members');
                    _this.members.forEach(function (m) {
                        b.div('ts_classcontent ts_classmember', function () {
                            b.div("ts_code ts_class_member_title ts_method", m);
                        });
                    });
                }
            });
        };
        return ASTEnum;
    })(ASTModuleMember);
    DTSDoc.ASTEnum = ASTEnum;    
    var ASTVar = (function (_super) {
        __extends(ASTVar, _super);
        function ASTVar(name, type) {
                _super.call(this, 'var', name);
            this.type = type;
        }
        ASTVar.prototype.build = function (b) {
            var _this = this;
            b.section('ts_modulemember ts_var', function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code", function () {
                        emitReserved(b, 'var');
                        b.span('', _this.name);
                        _this.type.build(b, _this.parent);
                    });
                    if(_this.docs) {
                        _this.docs.build(b);
                    }
                });
            });
        };
        return ASTVar;
    })(ASTModuleMember);
    DTSDoc.ASTVar = ASTVar;    
    var ASTImport = (function (_super) {
        __extends(ASTImport, _super);
        function ASTImport(alias, moduleName) {
                _super.call(this, 'import', alias);
            this.alias = alias;
            this.moduleName = moduleName;
        }
        return ASTImport;
    })(ASTModuleMember);
    DTSDoc.ASTImport = ASTImport;    
    var ASTModuleMemberDocs = (function (_super) {
        __extends(ASTModuleMemberDocs, _super);
        function ASTModuleMemberDocs(docs) {
                _super.call(this, 'docs', undefined);
            this.docs = docs;
        }
        return ASTModuleMemberDocs;
    })(ASTModuleMember);
    DTSDoc.ASTModuleMemberDocs = ASTModuleMemberDocs;    
    var ASTModule = (function (_super) {
        __extends(ASTModule, _super);
        function ASTModule(name, members) {
            var _this = this;
                _super.call(this, 'module', name);
            this.members = members;
            members.forEach(function (m) {
                m.parent = _this;
            });
        }
        ASTModule.prototype.getMember = function (name) {
            for(var i = 0; i < this.members.length; i++) {
                var member = this.members[i];
                if(member.name == name) {
                    return member;
                }
            }
            return null;
        };
        ASTModule.prototype.searchType = function (typeName) {
            var type;
            this.searchMember(typeName, function (member) {
                if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                    type = member;
                    return false;
                }
 {
                    return true;
                }
            });
            return type;
        };
        ASTModule.prototype.searchMember = function (typeName, filter) {
            function grabType(topMember) {
                if(topMember) {
                    var focused = topMember;
                    for(var i = 1; i < typeName.segments.length && focused; i++) {
                        if(focused instanceof ASTModuleMember) {
                            var m = focused;
                            focused = m.getMember(typeName.segments[i]);
                        } else {
                            return null;
                        }
                    }
                    return focused;
                }
            }
            var prefix = typeName.segments[0];
            for(var scope = this; scope; scope = scope.parent) {
                for(var i = 0; i < scope.members.length; i++) {
                    var member = scope.members[i];
                    if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                        if(member.name == prefix) {
                            var target = grabType(member);
                            if(target) {
                                if(!filter(target)) {
                                    return;
                                }
                            }
                        }
                    }
                    if(member instanceof ASTImport) {
                        var importDecl = member;
                        if(importDecl.alias == prefix) {
                            var target = grabType(importDecl.actualModule);
                            if(target) {
                                if(!filter(target)) {
                                    return;
                                }
                            }
                        }
                    }
                    if(member instanceof ASTModule) {
                        var mod = member;
                        if(mod.name == prefix) {
                            var target = grabType(mod);
                            if(target) {
                                if(!filter(target)) {
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        };
        ASTModule.prototype.updateHierarchy = function () {
            this.members.forEach(function (m) {
                if(m instanceof ASTModule) {
                    (m).updateHierarchy();
                } else if(m instanceof ASTClass) {
                    (m).updateHierarchy();
                }
            });
        };
        ASTModule.prototype.buildHierarchy = function (b) {
            var _this = this;
            b.div('', function () {
                _this.members.forEach(function (m) {
                    if(m instanceof ASTModule) {
                        (m).buildHierarchy(b);
                    } else if(m instanceof ASTClass) {
                        var clazz = m;
                        if(clazz.derivedClasses.length > 0) {
                            clazz.buildHierarchy(b);
                        }
                    }
                });
            });
        };
        ASTModule.prototype.build = function (b) {
            var _this = this;
            b.section('ts_modulemember ts_module', function () {
                _this.buildTitle(b);
                b.section('', function () {
                    if(_this.docs) {
                        b.p("ts_modulemember_description", _this.docs.text);
                    }
                    _this.members.forEach(function (m) {
                        m.build(b);
                    });
                });
            });
        };
        return ASTModule;
    })(ASTModuleMember);
    DTSDoc.ASTModule = ASTModule;    
    var ASTProgram = (function () {
        function ASTProgram(global) {
            this.global = global;
        }
        ASTProgram.prototype.build = function (b) {
            this.global.build(b);
        };
        return ASTProgram;
    })();
    DTSDoc.ASTProgram = ASTProgram;    
    (function (GenerationResultType) {
        GenerationResultType._map = [];
        GenerationResultType.Success = "success";
        GenerationResultType.Fail = "fail";
        GenerationResultType.State = "state";
    })(DTSDoc.GenerationResultType || (DTSDoc.GenerationResultType = {}));
    var GenerationResultType = DTSDoc.GenerationResultType;
    function generateDocument(sourceCode, watcher) {
        var result = DTSDoc.pScript(watcher).parse(new Source(sourceCode, 0));
        if(result.success) {
            var program = result.value;
            var global = program.global;
            var members = global.members;
            var b = new DTSDoc.HTMLBuilder();
            b.div('ts_document', function () {
                b.div('ts_index', function () {
                    b.h1('Index');
                    var currentModule = null;
                    var linkString = null;
                    var moduleEmitted = false;
                    function emitMember(scope) {
                        scope.members.forEach(function (member) {
                            if(member instanceof ASTModule) {
                                if(member.getFullName() != currentModule) {
                                    currentModule = member.getFullName();
                                    linkString = member.getLinkString();
                                    moduleEmitted = false;
                                }
                                emitMember(member);
                            } else {
                                if(currentModule && !moduleEmitted) {
                                    moduleEmitted = true;
                                    b.link('#' + linkString, function () {
                                        b.h2('ts_index_module', currentModule);
                                    });
                                }
                                b.p('ts_index_item', function () {
                                    var symbol = member instanceof ASTClass ? '■' : member instanceof ASTInterface ? '□' : member instanceof ASTVar ? '●' : member instanceof ASTEnum ? '▼' : '◇';
                                    b.link('#' + member.getLinkString(), symbol + " " + member.name);
                                });
                            }
                        });
                    }
                    emitMember(global);
                });
                b.div('ts_index_static', '');
                b.div('ts_content', function () {
                    if(program.docs) {
                        program.docs.build(b);
                    }
                    if(global.docs) {
                        b.p('', function () {
                            global.docs.build(b);
                        });
                    }
                    b.h2('Contents');
                    b.ul("contents", function () {
                        b.li(function () {
                            b.link("#members", 'Members');
                        });
                        b.li(function () {
                            b.link("#hierarchy", 'Class Hierarchy');
                        });
                    });
                    b.anchor("members");
                    b.h2('Members');
                    b.div('', function () {
                        members.map(function (m) {
                            m.build(b);
                        });
                    });
                    b.hr();
                    b.anchor("hierarchy");
                    b.h2('Class Hierarchy');
                    b.div('', function () {
                        global.buildHierarchy(b);
                    });
                    b.hr();
                    b.footer(function () {
                        b.link("https://github.com/kontan/dtsdoc", 'DTSDoc');
                    });
                });
            });
            return {
                "type": GenerationResultType.Success,
                "docs": b.buildString()
            };
        } else {
            var pos = result.source.getPosition();
            var i = result.source.position;
            return {
                "type": GenerationResultType.Fail,
                'line': pos.line,
                'column': pos.column,
                'source': result.source.source.slice(i, i + 128),
                'message': result.errorMesssage
            };
        }
    }
    DTSDoc.generateDocument = generateDocument;
    ;
})(DTSDoc || (DTSDoc = {}));
