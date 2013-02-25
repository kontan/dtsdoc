var DTSDoc;
(function (DTSDoc) {
    var lineComment = regexp(/^\/\/[^\n]*(\n|$)/);
    var blockComment = regexp(/^\/(\*(?!\*)|\*\*\*+)([^*]|\r|\n|\*(?!\/))*?\*\//m);
    var comment = or(lineComment, blockComment);
    var whitespace = regexp(/^[ \t\r\n]+/m);
    var spaces = many(or(whitespace, comment));
    var logger;
    function lexme(p) {
        return seq(function (s) {
            s(logger);
            var v = s(p);
            s(spaces);
            return v;
        });
    }
    DTSDoc.reserved = function (s) {
        return lexme(string(s));
    };
    var keyword = function (s) {
        return lexme(regexp(new RegExp('^' + s + '(?!(\\w|_))', '')));
    };
    var colon = DTSDoc.reserved(":");
    var semi = DTSDoc.reserved(";");
    var comma = DTSDoc.reserved(",");
    var pExport = optional(DTSDoc.reserved("export"));
    var pDeclare = optional(DTSDoc.reserved("declare"));
    var pStatic = option(false, map(function () {
        return true;
    }, keyword("static")));
    var pIdentifierPath = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
    var pIdentifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
    var pStringRiteral = lexme(regexp(/^(\"[^\"]+\"|\'[^\']+\')/));
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, DTSDoc.reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, DTSDoc.reserved("private"))));
    var rDocumentComment = /^\/\*(\*(?!\*))((\*(?!\/)|[^*])*)\*\//m;
    var rTags = /^\@([a-z]+)\s+(([^@]|\@(?![a-z]))*)/gm;
    var pDocumentComment = option(undefined, lexme(seq(function (s) {
        var text = s(regexp(rDocumentComment));
        s(whitespace);
        if(s.success()) {
            rDocumentComment.lastIndex = 0;
            var innerText = rDocumentComment.exec(text)[2].split(/\n[ \t]*\*[ ]?/).join('\n');
            var pDescription = /^([^@]|\@(?![a-z]))*/m;
            var arr = pDescription.exec(innerText);
            var description = arr[0];
            rTags.lastIndex = pDescription.lastIndex;
            var tags = [];
            while(rTags.lastIndex < innerText.length) {
                var arr = rTags.exec(innerText);
                if(!arr) {
                    break;
                }
                tags.push(new DTSDoc.ASTDoctagSection(arr[1], arr[2]));
            }
            return new DTSDoc.ASTDocs(description, tags);
        }
    })));
    DTSDoc.pParameter = seq(function (s) {
        var docs = s(pDocumentComment);
        var isVarArg = s(optional(DTSDoc.reserved("...")));
        var varName = s(pIdentifier);
        var opt = s(option(false, map(function () {
            return true;
        }, DTSDoc.reserved("?"))));
        var typeName = s(option(new DTSDoc.ASTTypeName([
            "any"
        ]), pTypeAnnotation));
        if(s.success()) {
            return new DTSDoc.ASTParameter(varName, opt, typeName);
        }
    });
    var pParameters = between(DTSDoc.reserved("("), map(function (ps) {
        return new DTSDoc.ASTParameters(ps);
    }, sepBy(DTSDoc.pParameter, comma)), DTSDoc.reserved(")"));
    var pTypeAnnotation = option(new DTSDoc.ASTTypeAnnotation(new DTSDoc.ASTTypeName([
        "any"
    ])), seq(function (s) {
        s(colon);
        var type = s(pType);
        if(s.success()) {
            return new DTSDoc.ASTTypeAnnotation(type);
        }
    }));
    var pOpt = option(false, map(function () {
        return true;
    }, DTSDoc.reserved("?")));
    var pImport = seq(function (s) {
        s(keyword('import'));
        var id = s(pIdentifier);
        s(DTSDoc.reserved('='));
        var mod = s(or(trying(series(keyword('module'), between(DTSDoc.reserved('('), pStringRiteral, DTSDoc.reserved(')')))), pIdentifierPath));
        s(DTSDoc.reserved(';'));
    });
    var pTypeNameLiteral = lexme(seq(function (s) {
        var name = s(pIdentifier);
        var names = s(many(series(DTSDoc.reserved('.'), pIdentifier)));
        if(s.success()) {
            names.unshift(name);
            return new DTSDoc.ASTTypeName(names);
        }
    }));
    var pFunctionTypeLiteral = seq(function (s) {
        var docs = s(pDocumentComment);
        var params = s(pParameters);
        s(DTSDoc.reserved("=>"));
        var retType = s(pType);
        if(s.success()) {
            var t = new DTSDoc.ASTFunctionType(params, retType);
            t.docs = docs;
            return t;
        }
    });
    var pConstructorTypeRiteral = seq(function (s) {
        s(keyword('new'));
        var params = s(pParameters);
        s(DTSDoc.reserved("=>"));
        var retType = s(pType);
        if(s.success()) {
            return new DTSDoc.ASTConstructorTypeLiteral(params, retType);
        }
    });
    var pSpecifyingTypeMember = seq(function (s) {
        var docs = s(pDocumentComment);
        var member = s(or(pIConstructor, trying(pIMethod), pIField, pIIndexer, pIFunction));
        s(semi);
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    var pSpecifyingType = seq(function (s) {
        s(DTSDoc.reserved("{"));
        var members = s(many(pSpecifyingTypeMember));
        s(DTSDoc.reserved("}"));
        if(s.success()) {
            return new DTSDoc.ASTSpecifingType(members);
        }
    });
    var pType = seq(function (s) {
        var type = s(or(pConstructorTypeRiteral, pTypeNameLiteral, pSpecifyingType, pFunctionTypeLiteral));
        s(many(seq(function (s) {
            s(DTSDoc.reserved("["));
            s(DTSDoc.reserved("]"));
            if(s.success()) {
                type = new DTSDoc.ASTArrayType(type);
            }
        })));
        return type;
    });
    var pMethodOrField = seq(function (s) {
        var access = s(pAccessibility);
        var isStatic = s(pStatic);
        var name = s(pIdentifier);
        s(or(seq(function (s) {
            var params = s(pParameters);
            var retType = s(pTypeAnnotation);
            if(s.success()) {
                return new DTSDoc.ASTMethod(access, isStatic, name, new DTSDoc.ASTFuncionSignature(params, retType));
            }
        }), seq(function (s) {
            var type = s(pTypeAnnotation);
            if(s.success()) {
                return new DTSDoc.ASTField(access, isStatic, name, type);
            }
        })));
    });
    var pConstructor = seq(function (s) {
        s(keyword("constructor"));
        var params = s(pParameters);
        if(s.success()) {
            return new DTSDoc.ASTConstructor(params);
        }
    });
    var pIIndexer = seq(function (s) {
        s(DTSDoc.reserved("["));
        var name = s(pIdentifier);
        var keyType = s(pTypeAnnotation);
        s(DTSDoc.reserved("]"));
        var valueType = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIIndexer(name, keyType, valueType);
        }
    });
    var pClassMember = seq(function (s) {
        var docs = s(pDocumentComment);
        var member = s(or(pConstructor, pMethodOrField, pIIndexer));
        s(semi);
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    DTSDoc.pClass = seq(function (s) {
        s(DTSDoc.reserved("class"));
        var name = s(pIdentifier);
        var superClasse = s(option(undefined, seq(function (s) {
            s(DTSDoc.reserved("extends"));
            s(pTypeNameLiteral);
        })));
        var interfaces = s(option([], seq(function (s) {
            s(DTSDoc.reserved("implements"));
            s(sepBy1(pTypeNameLiteral, comma));
        })));
        s(DTSDoc.reserved("{"));
        var members = s(many(pClassMember));
        s(DTSDoc.reserved("}"));
        if(s.success()) {
            var clazz = new DTSDoc.ASTClass(name, superClasse, interfaces, members);
            members.forEach(function (m) {
                m.parent = clazz;
            });
            return clazz;
        }
    });
    var pIField = seq(function (s) {
        var name = s(pIdentifier);
        var opt = s(pOpt);
        var type = s(pTypeAnnotation);
        return new DTSDoc.ASTIField(name, opt, type);
    });
    var pIConstructor = seq(function (s) {
        s(keyword("new"));
        var params = s(pParameters);
        var type = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIConstructor(params, type);
        }
    });
    var pIFunction = seq(function (s) {
        var params = s(pParameters);
        var type = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIFunction(params, type);
        }
    });
    var pIMethod = seq(function (s) {
        var methodName = s(pIdentifier);
        var opt = s(pOpt);
        var params = s(pParameters);
        var retType = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIMethod(methodName, new DTSDoc.ASTFuncionSignature(params, retType));
        }
    });
    DTSDoc.pInterface = seq(function (s) {
        s(DTSDoc.reserved("interface"));
        var name = s(pIdentifier);
        var ifs = s(option([], seq(function (s) {
            s(DTSDoc.reserved("extends"));
            s(sepBy1(pTypeNameLiteral, comma));
        })));
        var type = s(pSpecifyingType);
        if(s.success()) {
            return new DTSDoc.ASTInterface(name, ifs, type);
        }
    });
    DTSDoc.pEnum = seq(function (s) {
        s(keyword("enum"));
        var name = s(pIdentifier);
        s(DTSDoc.reserved("{"));
        var members = s(or(trying(sepBy(pIdentifier, comma)), endBy(pIdentifier, comma)));
        s(optional(comma));
        s(DTSDoc.reserved("}"));
        if(s.success()) {
            return new DTSDoc.ASTEnum(name, members);
        }
    });
    var pFunctionSigniture = seq(function (s) {
        var params = s(pParameters);
        var retType = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTFuncionSignature(params, retType);
        }
    });
    DTSDoc.pFunction = seq(function (s) {
        s(keyword("function"));
        var name = s(pIdentifier);
        var sign = s(pFunctionSigniture);
        s(semi);
        if(s.success()) {
            return new DTSDoc.ASTFunction(name, sign);
        }
    });
    DTSDoc.pVar = seq(function (s) {
        s(keyword("var"));
        var name = s(pIdentifier);
        var typeName = s(pTypeAnnotation);
        s(optional(semi));
        if(s.success()) {
            return new DTSDoc.ASTVar(name, typeName);
        }
    });
    DTSDoc.pCallable = seq(function (s) {
        s(keyword("function"));
        var sign = s(pFunctionSigniture);
        s(semi);
        if(s.success()) {
            return new DTSDoc.ASTCallable(sign);
        }
    });
    DTSDoc.pModule = seq(function (s) {
        s(keyword("module"));
        var name = s(or(pIdentifierPath, pStringRiteral));
        s(DTSDoc.reserved("{"));
        var members = s(pModuleMembers);
        s(DTSDoc.reserved("}"));
        if(s.success()) {
            var tokens = name.split('.');
            var mod = new DTSDoc.ASTModule(tokens[tokens.length - 1], members);
            members.forEach(function (m) {
                m.parent = mod;
            });
            for(var i = tokens.length - 2; i >= 0; i--) {
                var parent = new DTSDoc.ASTModule(tokens[i], [
                    mod
                ]);
                mod.parent = parent;
                mod = parent;
            }
            return mod;
        }
    });
    DTSDoc.pModuleMember = seq(function (s) {
        var docs = s(pDocumentComment);
        s(pDeclare);
        s(pExport);
        var member = s(or(DTSDoc.pVar, DTSDoc.pModule, DTSDoc.pClass, trying(DTSDoc.pFunction), DTSDoc.pCallable, DTSDoc.pInterface, DTSDoc.pEnum));
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    var pModuleMembers = map(function (ms) {
        return ms.filter(function (m) {
            return m instanceof DTSDoc.ASTModuleMember;
        });
    }, many(or(DTSDoc.pModuleMember, DTSDoc.reserved(';'), pImport)));
    function pProgram(watcher) {
        return seq(function (s) {
            logger = Parsect.log(function (n) {
                if(watcher) {
                    watcher(n);
                }
            });
            s(lexme(spaces));
            var docs = s(pDocumentComment);
            var members = s(pModuleMembers);
            s(eof);
            if(s.success()) {
                var mod = new DTSDoc.ASTModule("(global)", members);
                members.forEach(function (m) {
                    m.parent = mod;
                });
                mod.updateHierarchy();
                var prog = new DTSDoc.ASTProgram(mod);
                prog.docs = docs;
                return prog;
            }
        });
    }
    DTSDoc.pProgram = pProgram;
})(DTSDoc || (DTSDoc = {}));
