/// <reference path="../Parsect/src/parsect.ts" />
/// <reference path="../Parsect/src/globals.ts" />
/// <reference path="type.ts" />
var DTSDoc;
(function (DTSDoc) {
    ////////////////////////////////////////////////////////////////////////////////////
    // lex
    ////////////////////////////////////////////////////////////////////////////////////
    var lineComment = regexp(/^\/\/[^\r\n]*(\r\n|\r|\n|$)/m);
    var blockComment = regexp(/^\/(\*(?!\*)|\*\*\*+)([^*]|\r|\n|\*(?!\/))*\*\//m);
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
    function reserved(s) {
        return new Parsect.Parser("", function (src) {
            return lexme(string(s)).parse(src);
        });
    }
    DTSDoc.reserved = reserved;
    function keyword(s) {
        return lexme(regexp(new RegExp('^' + s + '(?!(\\w|_))', '')));
    }
    ////////////////////////////////////////////////////////////////////////
    // Common parsers
    //////////////////////////////////////////////////////////////////////
    var colon = reserved(":");
    var semi = reserved(";");
    var comma = reserved(",");
    var period = reserved(".");
    var pExport = optional(reserved("export"));
    var pDeclare = optional(reserved("declare"));
    var pStatic = option(false, map(function () {
        return true;
    }, keyword("static")));
    var pIdentifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
    var pStringRiteral = lexme(regexp(/^(\"[^\"]+\"|\'[^\']+\')/));
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, reserved("private"))));
    var rDocumentComment = /^\/\*(\*(?!\*))((\*(?!\/)|[^*])*)\*\//m;
    var rTags = /^\@([a-z]+)\s+(([^@]|\@(?![a-z]))*)/mg;
    var pDocumentCommentSection = lexme(seq(function (s) {
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
    }));
    var pDocumentComment = option(undefined, pDocumentCommentSection);
    var pDocumentComments = many(pDocumentCommentSection);
    var pIdentifierPath = sepBy1(pIdentifier, period);
    var pOpt = option(false, map(function () {
        return true;
    }, reserved("?")));
    DTSDoc.pParameter = Parsect.lazy(function () {
        return Parsect.build(DTSDoc.ASTParameter, [
            pDocumentComment, 
            optional(reserved("..."))
        ], [
            pIdentifier
        ], [
            pOpt
        ], [
            pTypeAnnotation
        ]);
    });
    DTSDoc.pParameters = Parsect.build(DTSDoc.ASTParameters, [
        reserved("("), 
        sepBy(DTSDoc.pParameter, comma)
    ], [
        reserved(")")
    ]);
    var pTypeAnnotation = Parsect.lazy(function () {
        return option(new DTSDoc.ASTTypeAnnotation(new DTSDoc.ASTTypeName([
            "any"
        ])), Parsect.build(DTSDoc.ASTTypeAnnotation, [
            colon, 
            pType
        ]));
    });
    //////////////////////////////////////////////////////////////////////////////////////
    // Type Riteral
    /////////////////////////////////////////////////////////////////////////////////
    var pSpecifyingTypeMember = seq(function (s) {
        var docs = s(pDocumentComments);
        var member = s(or(pIConstructor, trying(pIMethod), pIField, pIIndexer, pIFunction));
        s(semi);
        if(s.success()) {
            if(docs.length >= 2) {
                console.log("WARNING: Too many document comment at a specifying type member." + s.peek());
            }
            member.docs = docs[docs.length - 1];
            return member;
        }
    });
    var pType = seq(function (s) {
        var type = s(or(pConstructorTypeRiteral, pTypeNameLiteral, pSpecifyingType, pFunctionTypeLiteral));
        s(many(seq(function (s) {
            s(reserved("["));
            s(reserved("]"));
            if(s.success()) {
                type = new DTSDoc.ASTArrayType(type);
            }
        })));
        return type;
    });
    var pTypeNameLiteral = Parsect.build(DTSDoc.ASTTypeName, [
        pIdentifierPath
    ]);
    var pSpecifyingType = Parsect.build(DTSDoc.ASTSpecifingType, [
        reserved("{"), 
        many(pSpecifyingTypeMember)
    ], [
        reserved("}")
    ]);
    var pConstructorTypeRiteral = Parsect.build(DTSDoc.ASTConstructorTypeLiteral, [
        keyword('new'), 
        DTSDoc.pParameters
    ], [
        reserved("=>"), 
        pType
    ]);
    var pFunctionTypeLiteral = Parsect.build(DTSDoc.ASTFunctionType, [
        pDocumentComment
    ], [
        DTSDoc.pParameters
    ], [
        reserved("=>"), 
        pType
    ]);
    /////////////////////////////////////////////////////////////////////////////////////
    // Class parser
    /////////////////////////////////////////////////////////////////////////////////////////
    var pMethodOrField = seq(function (s) {
        var access = s(pAccessibility);
        var isStatic = s(pStatic);
        var name = s(pIdentifier);
        s(or(Parsect.map(function (sig) {
            return new DTSDoc.ASTMethod(access, isStatic, name, sig);
        }, pFunctionSigniture), Parsect.map(function (type) {
            return new DTSDoc.ASTField(access, isStatic, name, type);
        }, pTypeAnnotation)));
    });
    var pConstructor = Parsect.build(DTSDoc.ASTConstructor, [
        keyword("constructor"), 
        DTSDoc.pParameters
    ]);
    var pIIndexer = Parsect.build(DTSDoc.ASTIIndexer, [
        reserved("["), 
        pIdentifier
    ], [
        pTypeAnnotation
    ], [
        reserved("]"), 
        pTypeAnnotation
    ]);
    var pClassMember = seq(function (s) {
        var docs = s(pDocumentComments);
        var member = s(or(pConstructor, pMethodOrField, pIIndexer));
        s(semi);
        if(s.success()) {
            if(docs.length >= 2) {
                console.log("WARNING: Too many document comment for a member at: " + s.peek());
            }
            member.docs = docs[docs.length - 1];
            return member;
        }
    });
    var pClass = Parsect.build(DTSDoc.ASTClass, [
        reserved("class"), 
        pIdentifier
    ], [
        option(undefined, series(reserved("extends"), pTypeNameLiteral))
    ], [
        option([], series(reserved("implements"), sepBy1(pTypeNameLiteral, comma)))
    ], [
        between(reserved("{"), many(pClassMember), reserved("}"))
    ]);
    /////////////////////////////////////////////////////////////////////////////////////////
    // Interface parser
    ///////////////////////////////////////////////////////////////////////////////////
    var pFunctionSigniture = Parsect.build(DTSDoc.ASTFuncionSignature, [
        DTSDoc.pParameters
    ], [
        pTypeAnnotation
    ]);
    var pIField = Parsect.build(DTSDoc.ASTIField, [
        pIdentifier
    ], [
        pOpt
    ], [
        pTypeAnnotation
    ]);
    var pIConstructor = Parsect.build(DTSDoc.ASTIConstructor, [
        keyword("new"), 
        DTSDoc.pParameters
    ], [
        pTypeAnnotation
    ]);
    var pIFunction = Parsect.build(DTSDoc.ASTIFunction, [
        DTSDoc.pParameters
    ], [
        pTypeAnnotation
    ]);
    var pIMethod = Parsect.build(DTSDoc.ASTIMethod, [
        pIdentifier
    ], [
        pOpt
    ], [
        pFunctionSigniture
    ]);
    var pInterface = Parsect.build(DTSDoc.ASTInterface, [
        reserved("interface"), 
        pIdentifier
    ], [
        option([], series(reserved("extends"), sepBy1(pTypeNameLiteral, comma)))
    ], [
        pSpecifyingType
    ]);
    /////////////////////////////////////////////////////////////////////////////////////////
    // Other module member elements
    ///////////////////////////////////////////////////////////////////////////////////////
    var pModuleRef = or(trying(series(keyword('module'), between(reserved('('), pStringRiteral, reserved(')')))), pTypeNameLiteral);
    var pImport = Parsect.build(DTSDoc.ASTImport, [
        keyword('import'), 
        pIdentifier
    ], [
        reserved('='), 
        pModuleRef
    ], [
        reserved(';')
    ]);
    var pEnum = Parsect.build(DTSDoc.ASTEnum, [
        keyword("enum"), 
        pIdentifier
    ], [
        reserved("{"), 
        or(trying(sepBy(pIdentifier, comma)), endBy(pIdentifier, comma))
    ], [
        optional(comma), 
        reserved("}")
    ]);
    var pFunction = Parsect.build(DTSDoc.ASTFunction, [
        keyword("function"), 
        pIdentifier
    ], [
        pFunctionSigniture
    ], [
        semi
    ]);
    var pVar = Parsect.build(DTSDoc.ASTVar, [
        keyword("var"), 
        pIdentifier
    ], [
        pTypeAnnotation
    ], [
        optional(semi)
    ]);
    var pCallable = Parsect.build(DTSDoc.ASTCallable, [
        keyword("function"), 
        pFunctionSigniture
    ], [
        semi
    ]);
    var pModuleMemberDocs = Parsect.build(DTSDoc.ASTModuleMemberDocs, [
        pDocumentCommentSection
    ]);
    var pModule = seq(function (s) {
        s(keyword("module"));
        var tokens = s(or(pIdentifierPath, map(function (s) {
            return [
                s
            ];
        }, pStringRiteral)));
        s(reserved("{"));
        var members = s(pModuleMembers);
        s(reserved("}"));
        if(s.success()) {
            var mod = new DTSDoc.ASTModule(tokens[tokens.length - 1], members);
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
    var pModuleMember = seq(function (s) {
        var docs = s(pDocumentComment);
        s(pDeclare);
        s(pExport);
        var member = s(or(pVar, pModule, pClass, trying(pFunction), pCallable, pInterface, pEnum, pImport));
        s(many(semi));
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    var pModuleMembers = many(pModuleMember);
    function pScript(watcher) {
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
                var mod = new DTSDoc.ASTModule("__global__", members);
                members.forEach(function (m) {
                    m.parent = mod;
                });
                mod.updateHierarchy();
                var prog = new DTSDoc.ASTProgram(mod);
                prog.docs = docs;
                // solve import declalation
                prog.global.members.forEach(function (member) {
                    if(member instanceof DTSDoc.ASTImport) {
                        var i = member;
                        prog.global.searchMember(i.moduleName, function (member) {
                            if(member instanceof DTSDoc.ASTModule) {
                                i.actualModule = member;
                                return false;
                            } else {
                                return true;
                            }
                        });
                    }
                });
                return prog;
            }
        });
    }
    DTSDoc.pScript = pScript;
})(DTSDoc || (DTSDoc = {}));
