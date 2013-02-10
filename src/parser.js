var DTSDoc;
(function (DTSDoc) {
    var lineComment = regexp(/^\/\/(?!>)[^\n]*\n/);
    var blockComment = regexp(/^\/\*(.|\r|\n)*?\*\//m);
    var comment = or(lineComment, blockComment);
    var whitespace = regexp(/^[ \t\r\n]+/);
    var spaces = many(or(whitespace, comment));
    function lexme(p) {
        return seq(function (s) {
            var v = s(p);
            s(spaces);
            return v;
        });
    }
    var colon = lexme(string(":"));
    var semi = lexme(string(";"));
    var comma = lexme(string(","));
    var optExport = lexme(optional(string("export")));
    var reserved = function (s) {
        return lexme(string(s));
    };
    var documentCommentLine = seq(function (s) {
        s(string('//>'));
        var text = s(regexp(/^.*/));
        s(regexp(/^(\n|$)/));
        s(whitespace);
        return text;
    });
    var documentComment = optional(map(function (ls) {
        return ls.join('\n');
    }, many(documentCommentLine)));
    var reference = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
    var identifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
    var tsDeclare = optional(reserved("declare"));
    var pParameter = seq(function (s) {
        var isVarArg = s(optional(reserved("...")));
        var varName = s(identifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        var typeName = s(option(new DTSDoc.ASTTypeName("any"), seq(function (s) {
            s(colon);
            return s(pType);
        })));
        return typeName && new DTSDoc.ASTParameter(varName, opt, typeName);
    });
    var pParameters = seq(function (s) {
        s(reserved("("));
        var ps = s(sepBy(pParameter, comma));
        s(reserved(")"));
        return ps;
    });
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, reserved("private"))));
    var modStatic = option(false, map(function () {
        return true;
    }, reserved("static")));
    var pSpecifyingType = seq(function (s) {
        s(reserved("{"));
        var members = s(many(or(trying(pIConstructor), trying(pIMethod), pIField, pIIndexer, pIFunction)));
        s(reserved("}"));
        return new DTSDoc.ASTSpecifingType(members);
    });
    var pTypeName = lexme(seq(function (s) {
        var name = s(identifier);
        var type = new DTSDoc.ASTTypeName(name);
        s(many(seq(function (s) {
            s(reserved("."));
            s(identifier);
            s(ret(function () {
                type = new DTSDoc.ASTModulePrefix(name, type);
            }));
        })));
        return type;
    }));
    var pFunctionType = seq(function (s) {
        var params = s(pParameters);
        s(reserved("=>"));
        var retType = s(pType);
        return new DTSDoc.ASTFunctionTypeRef(params, retType);
    });
    var pType = seq(function (s) {
        var type = s(or(pSpecifyingType, pTypeName, pFunctionType));
        s(many(seq(function (s) {
            s(reserved("["));
            s(reserved("]"));
            s(ret(function () {
                type = new DTSDoc.ASTArrayType(type);
            }));
        })));
        return type;
    });
    var pMethod = seq(function (s) {
        var docs = s(documentComment);
        var access = s(pAccessibility);
        var isStatic = s(modStatic);
        var methodName = s(identifier);
        var params = s(pParameters);
        var retType = s(option(new DTSDoc.ASTTypeName("any"), seq(function (s) {
            s(colon);
            var retType = s(pType);
            return retType;
        })));
        s(semi);
        return retType && new DTSDoc.ASTMethod(docs && new DTSDoc.TSDocs(docs), access, isStatic, methodName, new DTSDoc.ASTFuncionSignature(params, retType));
    });
    var pField = seq(function (s) {
        var docs = s(documentComment);
        var access = s(pAccessibility);
        var isStatic = s(modStatic);
        var name = s(identifier);
        s(colon);
        var type = s(pType);
        s(semi);
        return new DTSDoc.ASTField(docs && new DTSDoc.TSDocs(docs), access, isStatic, name, type);
    });
    var pConstructor = seq(function (s) {
        var docs = s(documentComment);
        s(reserved("constructor"));
        var params = s(pParameters);
        s(semi);
        return new DTSDoc.ASTConstructor(docs && new DTSDoc.TSDocs(docs), params);
    });
    var pIIndexer = seq(function (s) {
        var docs = s(documentComment);
        s(reserved("["));
        var name = s(identifier);
        s(colon);
        var type = s(pType);
        s(reserved("]"));
        s(colon);
        var retType = s(pType);
        s(semi);
        return new DTSDoc.ASTIIndexer(docs && new DTSDoc.TSDocs(docs), name, type, retType);
    });
    DTSDoc.pClass = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("class"));
        var name = s(identifier);
        var superClasse = s(option(undefined, seq(function (s) {
            s(reserved("extends"));
            s(pTypeName);
        })));
        var interfaces = s(option([], seq(function (s) {
            s(reserved("implements"));
            s(sepBy1(pTypeName, comma));
        })));
        s(reserved("{"));
        var members = s(many(or(trying(pConstructor), trying(pMethod), trying(pField), pIIndexer)));
        s(reserved("}"));
        if(s.success()) {
            var clazz = new DTSDoc.ASTClass(docs && new DTSDoc.TSDocs(docs), name, superClasse, members);
            members.forEach(function (m) {
                m.parent = clazz;
            });
            return clazz;
        }
    });
    var pIField = seq(function (s) {
        var docs = s(documentComment);
        var name = s(identifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        s(colon);
        var type = s(pType);
        s(semi);
        return new DTSDoc.ASTIField(docs && new DTSDoc.TSDocs(docs), name, opt, type);
    });
    var pIConstructor = seq(function (s) {
        var docs = s(documentComment);
        s(reserved("new"));
        var params = s(pParameters);
        var type = s(option(new DTSDoc.ASTTypeName('any'), series(colon, pType)));
        s(semi);
        return new DTSDoc.ASTIConstructor(docs && new DTSDoc.TSDocs(docs), params, type);
    });
    var pIFunction = seq(function (s) {
        var docs = s(documentComment);
        var params = s(pParameters);
        s(colon);
        var type = s(pType);
        s(semi);
        return new DTSDoc.ASTIFunction(docs && new DTSDoc.TSDocs(docs), params, type);
    });
    var pIMethod = seq(function (s) {
        var docs = s(documentComment);
        var methodName = s(identifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        var params = s(pParameters);
        var retType = s(option(new DTSDoc.ASTTypeName("any"), seq(function (s) {
            s(colon);
            var retType = s(pType);
            return retType;
        })));
        s(semi);
        return retType && new DTSDoc.ASTIMethod(docs && new DTSDoc.TSDocs(docs), methodName, new DTSDoc.ASTFuncionSignature(params, retType));
    });
    DTSDoc.pInterface = seq(function (s) {
        var docs = s(documentComment);
        s(optExport);
        s(reserved("interface"));
        var name = s(identifier);
        var ifs = s(option([], seq(function (s) {
            s(reserved("extends"));
            s(sepBy1(pTypeName, comma));
        })));
        var type = s(pSpecifyingType);
        return new DTSDoc.ASTInterface(docs && new DTSDoc.TSDocs(docs), name, ifs, type);
    });
    DTSDoc.pEnum = seq(function (s) {
        var docs = s(documentComment);
        s(optExport);
        s(reserved("enum"));
        var name = s(identifier);
        s(reserved("{"));
        var members = s(or(trying(sepBy(identifier, comma)), endBy(identifier, comma)));
        s(optional(comma));
        s(reserved("}"));
        return new DTSDoc.ASTEnum(docs && new DTSDoc.TSDocs(docs), name, members);
    });
    DTSDoc.pFunction = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("function"));
        var name = s(identifier);
        var params = s(pParameters);
        var retType = s(option("any", seq(function (s) {
            s(colon);
            var retType = s(pType);
            return retType;
        })));
        s(semi);
        return retType && new DTSDoc.ASTFunction(docs && new DTSDoc.TSDocs(docs), name, new DTSDoc.ASTFuncionSignature(params, retType));
    });
    DTSDoc.pVar = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("var"));
        var name = s(identifier);
        s(colon);
        var typeName = s(pType);
        s(optional(semi));
        return typeName && new DTSDoc.ASTVar(docs && new DTSDoc.TSDocs(docs), name, typeName);
    });
    DTSDoc.pModule = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("module"));
        var name = s(reference);
        s(reserved("{"));
        var members = s(pModuleMembers);
        s(reserved("}"));
        if(s.success()) {
            var mod = new DTSDoc.ASTModule(docs && new DTSDoc.TSDocs(docs), name, members);
            members.forEach(function (m) {
                m.parent = mod;
            });
            return mod;
        }
    });
    var pModuleMembers = many(or(trying(DTSDoc.pVar), trying(DTSDoc.pModule), trying(DTSDoc.pClass), trying(DTSDoc.pFunction), trying(DTSDoc.pInterface), DTSDoc.pEnum));
    DTSDoc.program = seq(function (s) {
        s(spaces);
        var members = s(pModuleMembers);
        s(eof);
        if(s.success()) {
            var mod = new DTSDoc.ASTModule(undefined, "(global)", members);
            members.forEach(function (m) {
                m.parent = mod;
            });
            mod.updateHierarchy();
            return mod;
        }
    });
})(DTSDoc || (DTSDoc = {}));
