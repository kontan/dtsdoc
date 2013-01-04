/// <reference path="../../Parsect/src/parsect.ts" />
/// <reference path="../../Parsect/src/globals.ts" />
/// <reference path="../../Parsect/src/type.ts" />

module DTSDoc{

	////////////////////////////////////////////////////////////////////////////////////
	// lex
	////////////////////////////////////////////////////////////////////////////////////
	var lineComment      = regexp(/^\/\/(?!>)[^\n]*\n/);
	var blockComment     = regexp(/^\/\*(.|\r|\n)*?\*\//m);
	var comment          = or(lineComment, blockComment);
	var whitespace       = regexp(/^[ \t\r\n]+/);
	var spaces           = many(or(whitespace, comment));

	function lexme(p:Parsect.Parser):Parsect.Parser{
		return seq((s)=>{
			var v = s(p);
			s(spaces);
			return v;
		});
	}

	////////////////////////////////////////////////////////////////////////
	// Common parsers
	//////////////////////////////////////////////////////////////////////

	var colon = lexme(string(":"));
	var semi  = lexme(string(";"));
	var comma = lexme(string(","));
	var optExport = lexme(optional(string("export")));

	var reserved:(s:string)=>Parsect.Parser = (s)=>lexme(string(s));

	var documentCommentLine = seq((s)=>{
		s(string('//>'));
		var text = s(regexp(/^.*/));
		s(regexp(/^(\n|$)/));
		s(whitespace);
		return text;
	});
	var documentComment     = optional(map((ls)=>ls.join('\n'), many(documentCommentLine)));

	var reference  = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
	var identifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*/));

	var tsDeclare = optional(reserved("declare"));

	var pParameter = seq((s)=>{
		var isVarArg = s(optional(reserved("...")));
		var varName = s(identifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));
		

		var typeName = s(option(new ASTTypeName("any"), seq((s)=>{
			s(colon);
			return s(pType);
		})));

		//s(colon);
		//var typeName = s(pType);
		

		return typeName && new ASTParameter(varName, opt, typeName);
	});

	var pParameters = seq((s)=>{
		s(reserved("("));
		var ps = s(sepBy(pParameter, comma));
		s(reserved(")"));
		return ps;
	});

	var pAccessibility = option(Accessibility.Public, or(
		map(()=>Accessibility.Public,  reserved("public")), 
		map(()=>Accessibility.Private, reserved("private"))
	));

	var modStatic = option(false, map(()=>true, reserved("static")));

	//////////////////////////////////////////////////////////////////////////////////////
	// Type parsers
	/////////////////////////////////////////////////////////////////////////////////

	var pSpecifyingType = seq((s)=>{
		s(reserved("{"));
		var members = s(many(or(
			pIConstructor,
			pIMethod,
			pIField,
			pIIndexer,
			pIFunction
		)));
		s(reserved("}"));
		return new ASTSpecifingType(members);
	});

	var pTypeName = lexme(seq((s)=>{
		var name = s(identifier);
		var type:ASTType = new ASTTypeName(name);
		s(many(seq((s)=>{
			s(reserved("."));
			s(identifier);
			s(ret(()=>{ type = new ASTModulePrefix(name, type); }));
		}))); 
		return type;
	}));

	var pFunctionType = seq((s)=>{
		var params = s(pParameters);
		s(reserved("=>"));
		var retType = s(pType);
		return new ASTFunctionTypeRef(params, retType);
	});

	var pType = seq((s)=>{
		var type = s(or(pSpecifyingType, pTypeName, pFunctionType));
		s(many(seq((s)=>{
			s(reserved("["));
			s(reserved("]"));
			s(ret(()=>{ type = new ASTArrayType(type); }));
		})));
		return type;
	});


	/////////////////////////////////////////////////////////////////////////////////////
	// Class parser
	/////////////////////////////////////////////////////////////////////////////////////////

	var pMethod = seq((s)=>{
		var docs = s(documentComment);		
		var access = s(pAccessibility);		
		var isStatic = s(modStatic);
		var methodName = s(identifier);
		var params = s(pParameters);
		var retType = s(option(new ASTTypeName("any"), seq((s)=>{
			s(colon);
			var retType = s(pType);
			return retType;
		})));
		s(semi);
		return retType && new ASTMethod(docs && new TSDocs(docs), access, isStatic, methodName, new ASTFuncionSignature(params, retType));
	});

	var pField = seq((s)=>{
		var docs = s(documentComment);		
		var access = s(pAccessibility);
		var isStatic = s(modStatic);		
		var name = s(identifier);
		s(colon);
		var type = s(pType);
		s(semi);
		return new ASTField(docs && new TSDocs(docs), access, isStatic, name, type);
	});

	var pConstructor = seq((s)=>{
		var docs = s(documentComment);		
		s(reserved("constructor"));
		var params = s(pParameters);
		s(semi);
		return new ASTConstructor(docs && new TSDocs(docs), params);
	});

	var pIIndexer = seq((s)=>{
		var docs = s(documentComment);
		s(reserved("["));
		var name:string = s(identifier);
		s(colon);
		var type:ASTType = s(pType);
		s(reserved("]"));
		s(colon);
		var retType:ASTType = s(pType);
		s(semi);
		return new ASTIIndexer(docs && new TSDocs(docs), name, type, retType);
	});

	var pClass = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);
		s(optExport);
		s(reserved("class"));
		var name = s(identifier);
		var superClasse = s(option(undefined, seq((s)=>{
			s(reserved("extends"));
			s(pTypeName);
		})));
		var interfaces = s(option([], seq((s)=>{
			s(reserved("implements"));
			s(sepBy1(identifier, comma));
		})));
		s(reserved("{"));
		var members = s(many(or(pConstructor, pMethod, pField, pIIndexer)));
		s(reserved("}"));
		if(s.success){
			var clazz = new ASTClass(docs && new TSDocs(docs), name, superClasse, members);
			members.forEach((m)=>{ m.parent = clazz; });
			return clazz;
		}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Interface parser
	///////////////////////////////////////////////////////////////////////////////////	

	var pIField = seq((s)=>{
		var docs = s(documentComment);
		var name = s(identifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));
		s(colon);
		var type = s(pType);
		s(semi);
		return new ASTIField(docs && new TSDocs(docs), name, opt, type);
	});

	var pIConstructor = seq((s)=>{
		var docs = s(documentComment);
		s(reserved("new"));
		var params = s(pParameters);
		s(colon);
		var type = s(pType);
		s(semi);
		return new ASTIConstructor(docs && new TSDocs(docs), params, type);
	});

	var pIFunction = seq((s)=>{
		var docs = s(documentComment);
		var params = s(pParameters);
		s(colon);
		var type = s(pType);
		s(semi);
		return new ASTIFunction(docs && new TSDocs(docs), params, type);
	});

	var pIMethod = seq((s)=>{
		var docs:TSDocs          = s(documentComment);		
		var methodName:string    = s(identifier);
		var opt:bool             = s(option(false, map(()=>true, reserved("?"))));		
		var params:ASTParameter[] = s(pParameters);
		var retType:ASTType    = s(option(new ASTTypeName("any"), seq((s)=>{
			s(colon);
			var retType = s(pType);
			return retType;
		})));
		s(semi);
		return retType && new ASTIMethod(docs && new TSDocs(docs), methodName, new ASTFuncionSignature(params, retType));
	});

	var pInterface = seq((s)=>{
		var docs = s(documentComment);
		s(optExport);
		s(reserved("interface"));
		var name:string = s(identifier);
		var ifs:ASTTypeName[] = s(option([], seq((s)=>{
			s(reserved("extends"));
			s(sepBy1(pTypeName, comma));
		})));
		var type:ASTSpecifingType = s(pSpecifyingType);
		return new ASTInterface(docs && new TSDocs(docs), name, ifs, type);
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Other module member elements
	/////////////////////////////////////////////////////////////////////////////////////// 

	var pEnum = seq((s)=>{
		var docs = s(documentComment);		
		s(optExport);
		s(reserved("enum"));
		var name = s(identifier);
		s(reserved("{"));
		var members = s(sepBy(identifier, comma));
		s(reserved("}"));
		return new ASTEnum(docs && new TSDocs(docs), name, members);
	});

	var pFunction = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);		
		s(optExport);
		s(reserved("function"));
		var name = s(identifier);
		var params = s(pParameters);
		var retType = s(option("any", seq((s)=>{
			s(colon);
			var retType = s(pType);
			return retType;
		})));
		s(semi);
		return retType && new ASTFunction(docs && new TSDocs(docs), name, new ASTFuncionSignature(params, retType));
	});

	var pVar = seq((s)=>{
		var docs = s(documentComment);	
		s(tsDeclare);			
		s(optExport);
		s(reserved("var"));
		var name = s(identifier);
		s(colon);
		var typeName = s(pType);
		s(optional(semi));
		return typeName && new ASTVar(docs && new TSDocs(docs), name, typeName);
	});

	var pModule = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);		
		s(optExport);
		s(reserved("module"));
		var name = s(reference);
		s(reserved("{"));
		var members = s(pModuleMembers);
		s(reserved("}"));
		if(s.success){
			var mod = new ASTModule(docs && new TSDocs(docs), name, members);
			members.forEach((m)=>{ m.parent = mod; });
			return mod;
		}
	});

	var pModuleMembers = many(or(pModule, pClass, pFunction, pInterface, pEnum, pVar));

	export var program = seq((s)=>{
		s(spaces);
		var members = s(pModuleMembers);
		var mod = new ASTModule(undefined, "(global)", members);
		members.forEach((m)=>{ m.parent = mod; });
		mod.updateHierarchy();
		return mod;
	});
}
