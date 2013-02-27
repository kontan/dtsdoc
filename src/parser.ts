/// <reference path="../../Parsect/src/parsect.ts" />
/// <reference path="../../Parsect/src/globals.ts" />
/// <reference path="../../Parsect/src/type.ts" />

/// <reference path="type.ts" />

module DTSDoc{	

	////////////////////////////////////////////////////////////////////////////////////
	// lex
	////////////////////////////////////////////////////////////////////////////////////
	
	var lineComment      = regexp(/^\/\/[^\n]*(\n|$)/);
	var blockComment     = regexp(/^\/(\*(?!\*)|\*\*\*+)([^*]|\r|\n|\*(?!\/))*\*\//m);
	var comment          = or(lineComment, blockComment);
	var whitespace       = regexp(/^[ \t\r\n]+/m);
	var spaces           = many(or(whitespace, comment));

	var logger:Parsect.Parser;

	function lexme(p:Parsect.Parser):Parsect.Parser{
		return seq(s=>{
			s(logger);
			var v = s(p);
			s(spaces);
			return v;
		});
	}

	export var reserved:(s:string)=>Parsect.Parser = s=>lexme(string(s));
	var keyword:(s:string)=>Parsect.Parser = s=>lexme(regexp(new RegExp('^' + s + '(?!(\\w|_))', '')));
	
	////////////////////////////////////////////////////////////////////////
	// Common parsers
	//////////////////////////////////////////////////////////////////////

	var colon    = reserved(":");
	var semi     = reserved(";");
	var comma    = reserved(",");
	var period   = reserved(".");
	var pExport  = optional(reserved("export"));
	var pDeclare = optional(reserved("declare"));
	var pStatic  = option(false, map(()=>true, keyword("static")));
	var pIdentifier     = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
	var pStringRiteral  = lexme(regexp(/^(\"[^\"]+\"|\'[^\']+\')/));

	var pAccessibility = option(Accessibility.Public, or(
		map(()=>Accessibility.Public,  reserved("public")), 
		map(()=>Accessibility.Private, reserved("private"))
	));

	var rDocumentComment = /^\/\*(\*(?!\*))((\*(?!\/)|[^*])*)\*\//m;
	var rTags = /^\@([a-z]+)\s+(([^@]|\@(?![a-z]))*)/mg;

	var pDocumentComment     = option(undefined, lexme(seq(s=>{
		var text = s(regexp(rDocumentComment));
		s(whitespace);
		if(s.success()){
			rDocumentComment.lastIndex = 0;
			var innerText = rDocumentComment.exec(text)[2].split(/\n[ \t]*\*[ ]?/).join('\n');
			var pDescription = /^([^@]|\@(?![a-z]))*/m;
			var arr = pDescription.exec(innerText);
			var description = arr[0];

			rTags.lastIndex = pDescription.lastIndex;
			var tags = [];
			while(rTags.lastIndex < innerText.length){
				var arr = rTags.exec(innerText);
				if(!arr) break;
				tags.push(new ASTDoctagSection(arr[1], arr[2]));
			}
			return new ASTDocs(description, tags);
		}
	})));

	var pIdentifierPath = sepBy1(pIdentifier, period);

	export var pParameter = seq(s=>{
		
		// ** Hack **
		// In some ambient source file, some parameters has inline document comments. 
		// To avaid it, following parser consumes the comment and ignore it.
		s(pDocumentComment);

		var isVarArg = s(optional(reserved("...")));
		var varName = s(pIdentifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));		
		var typeName = s(option(new ASTTypeName(["any"]), pTypeAnnotation));
		if(s.success()){
			return new ASTParameter(isVarArg, varName, opt, typeName);
		}
	});

	var pParameters = between(
		reserved("("),
		map((ps)=>new ASTParameters(ps), sepBy(pParameter, comma)),
		reserved(")")
	);
	
	var pTypeAnnotation = option(new ASTTypeAnnotation(new ASTTypeName(["any"])), seq(s=>{
		s(colon);
		s(map((t)=>new ASTTypeAnnotation(t), pType));
	}));

	var pOpt = option(false, map(()=>true, reserved("?")));

	var pImport = seq(s=>{
		s(keyword('import'));
		var id = s(pIdentifier);
		s(reserved('='));
		var mod = s(or(
			trying(series(keyword('module'), between(reserved('('), pStringRiteral, reserved(')')))), 
			pTypeNameLiteral
		));
		s(reserved(';'));
		if(s.success()){
			return new ASTImport(id, mod);
		}
	});

	//////////////////////////////////////////////////////////////////////////////////////
	// Type Riteral
	/////////////////////////////////////////////////////////////////////////////////

	var pTypeNameLiteral = map((n)=> new ASTTypeName(n), pIdentifierPath);

	var pFunctionTypeLiteral = seq(s=>{
		var docs = s(pDocumentComment);
		var params = s(pParameters);
		s(reserved("=>"));
		var retType = s(pType);
		if(s.success()){
			var t = new ASTFunctionType(params, retType);
			t.docs = docs;
			return t;
		}
	});

	var pConstructorTypeRiteral = seq(s=>{
		s(keyword('new'));
		var params = s(pParameters);
		s(reserved("=>"));
		var retType = s(pType);
		if(s.success()){
			return new ASTConstructorTypeLiteral(params, retType);
		}
	});

	var pSpecifyingTypeMember = seq(s=>{
		var docs = s(pDocumentComment);
		var member:ASTInterfaceMember = s(or(
			pIConstructor,
			trying(pIMethod),
			pIField,
			pIIndexer,
			pIFunction
		));
		s(semi);
		if(s.success()){
			member.docs = docs;
			return member;
		}
	});

	var pSpecifyingType = seq(s=>{
		s(reserved("{"));
		var members = s(many(pSpecifyingTypeMember));
		s(reserved("}"));
		if(s.success()){
			return new ASTSpecifingType(members);
		}
	});

	var pType = seq(s=>{
		var type = s(or(pConstructorTypeRiteral, pTypeNameLiteral, pSpecifyingType, pFunctionTypeLiteral));
		s(many(seq(s=>{
			s(reserved("["));
			s(reserved("]"));
			if(s.success()){
				type = new ASTArrayType(type);
			}
		})));
		return type;
	});

	/////////////////////////////////////////////////////////////////////////////////////
	// Class parser
	/////////////////////////////////////////////////////////////////////////////////////////

	var pMethodOrField = seq(s=>{
		var access = s(pAccessibility);		
		var isStatic = s(pStatic);
		var name = s(pIdentifier);
		s(or(
			// method
			seq(s=>{
				var params:ASTParameters = s(pParameters);
				var retType = s(pTypeAnnotation);
				if(s.success()){
					return new ASTMethod(access, isStatic, name, new ASTFuncionSignature(params, retType));
				}
			}),
			// field
			seq(s=>{
				var type = s(pTypeAnnotation);
				if(s.success()){
					return new ASTField(access, isStatic, name, type);
				}
			})
		));
	});

	var pConstructor = seq(s=>{
		s(keyword("constructor"));
		var params = s(pParameters);
		if(s.success()){
			return new ASTConstructor(params);
		}
	});

	var pIIndexer = seq(s=>{
		s(reserved("["));
		var name:string = s(pIdentifier);
		var keyType:ASTType = s(pTypeAnnotation);
		s(reserved("]"));
		var valueType:ASTType = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIIndexer(name, keyType, valueType);
		}
	});

	var pClassMember = seq(s=>{
		var docs = s(pDocumentComment);
		var member:ASTClassMember = s(or(pConstructor, pMethodOrField, pIIndexer));
		s(semi);
		if(s.success()){
			member.docs = docs;
			return member;
		}
	});

	export var pClass = seq(s=>{
		s(reserved("class"));
		var name = s(pIdentifier);
		var superClasse = s(option(undefined, seq(s=>{
			s(reserved("extends"));
			s(pTypeNameLiteral);
		})));
		var interfaces = s(option([], seq(s=>{
			s(reserved("implements"));
			s(sepBy1(pTypeNameLiteral, comma));
		})));
		s(reserved("{"));
		var members = s(many(pClassMember));
		s(reserved("}"));
		if(s.success()){
			var clazz = new ASTClass(name, superClasse, interfaces, members);
			members.forEach((m)=>{ m.parent = clazz; });
			return clazz;
		}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Interface parser
	///////////////////////////////////////////////////////////////////////////////////	

	var pIField = seq(s=>{
		var name = s(pIdentifier);
		var opt  = s(pOpt);
		var type = s(pTypeAnnotation);
		return new ASTIField(name, opt, type);
	});

	var pIConstructor = seq(s=>{
		s(keyword("new"));
		var params = s(pParameters);
		var type   = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIConstructor(params, type);
		}
	});

	var pIFunction = seq(s=>{
		var params = s(pParameters);
		var type   = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIFunction(params, type);
		}
	});

	var pIMethod = seq(s=>{
		var methodName:string     = s(pIdentifier);
		var opt:bool              = s(pOpt);		
		var params:ASTParameter[] = s(pParameters);
		var retType:ASTTypeAnnotation = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIMethod(methodName, opt, new ASTFuncionSignature(params, retType));
		}
	});

	export var pInterface = seq(s=>{
		s(reserved("interface"));
		var name:string = s(pIdentifier);
		var ifs:ASTTypeName[] = s(option([], seq(s=>{
			s(reserved("extends"));
			s(sepBy1(pTypeNameLiteral, comma));
		})));
		var type:ASTSpecifingType = s(pSpecifyingType);
		if(s.success()){
			return new ASTInterface(name, ifs, type);
		}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Other module member elements
	/////////////////////////////////////////////////////////////////////////////////////// 

	export var pEnum = seq(s=>{
		s(keyword("enum"));
		var name = s(pIdentifier);
		s(reserved("{"));
		var members = s(or(
			trying(sepBy(pIdentifier, comma)), 
			endBy(pIdentifier, comma)
		));
		s(optional(comma));
		s(reserved("}"));
		if(s.success()){
			return new ASTEnum(name, members);
		}
	});

	var pFunctionSigniture = seq(s=>{
		var params  = s(pParameters);
		var retType = s(pTypeAnnotation);
		if(s.success()) return new ASTFuncionSignature(params, retType);
	});

	export var pFunction = seq(s=>{
		s(keyword("function"));
		var name  = s(pIdentifier);
		var sign  = s(pFunctionSigniture);
		s(semi);
		if(s.success()){ return new ASTFunction(name, sign); }
	});

	export var pVar = seq(s=>{
		s(keyword("var"));
		var name = s(pIdentifier);
		var typeName = s(pTypeAnnotation);
		s(optional(semi));
		if(s.success()){ return new ASTVar(name, typeName); }
	});

	export var pCallable = seq(s=>{
		s(keyword("function"));
		var sign  = s(pFunctionSigniture);
		s(semi);
		if(s.success()){ return new ASTCallable(sign); }
	});

	export var pModule = seq(s=>{
		s(keyword("module"));
		var tokens:string[] = s(or(pIdentifierPath, map((s)=>[s], pStringRiteral)));
		s(reserved("{"));
		var members = s(pModuleMembers);
		s(reserved("}"));
		if(s.success()){
			var mod = new ASTModule(tokens[tokens.length - 1], members);
			members.forEach((m)=>{ m.parent = mod; });
			for(var i = tokens.length - 2; i >= 0; i--){
				var parent = new ASTModule(tokens[i], [mod]);
				mod.parent = parent;
				mod = parent;
			}
			return mod;
		}
	});

	export var pModuleMember:Parsect.Parser = seq(s=>{
		var docs = s(pDocumentComment);
		s(pDeclare);		
		s(pExport);
		var member:ASTModuleMember = s(or(pVar, pModule, pClass, trying(pFunction), pCallable, pInterface, pEnum));
		if(s.success()){
			member.docs = docs;
			return member;
		}
	});

	var pModuleMembers:Parsect.Parser = map(ms=>ms.filter(m => m instanceof ASTModuleMember), many(or(pModuleMember, reserved(';'), pImport)));

	export function pScript(watcher?:(v:number)=>void):Parsect.Parser{
		return seq(s=>{
			logger = Parsect.log(n=>{ 
				if(watcher){
					watcher(n);
				}
			});

			s(lexme(spaces));
			var docs = s(pDocumentComment);
			var members = s(pModuleMembers);
			s(eof);
			if(s.success()){
				var mod = new ASTModule("__global__", members);
				members.forEach((m)=>{ m.parent = mod; });
				mod.updateHierarchy();
				//return mod;

				var prog = new ASTProgram(mod);
				prog.docs = docs;

				// solve import declalation
				prog.global.members.forEach((member:any)=>{
					if(member instanceof ASTImport){
						var i:ASTImport = member;
						prog.global.searchMember(i.moduleName, (member)=>{
							if(member instanceof ASTModule){
								i.actualModule = <ASTModule>member;
								return false;
							}else{
								return true;
							}
						});
					}
				});


				return prog;
			}
		});
	}
}
