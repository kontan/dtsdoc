/// <reference path="../Parsect/src/parsect.ts" />
/// <reference path="../Parsect/src/globals.ts" />
/// <reference path="../Parsect/src/type.ts" />

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
		return text;
	});
	var documentComment     = lexme(optional(map((ls)=>ls.join('\n'), many(documentCommentLine))));

	var reference  = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
	var identifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*/));

	var tsDeclare = optional(reserved("declare"));

	var pParameter = seq((s)=>{
		var isVarArg = s(optional(reserved("...")));
		var varName = s(identifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));
		

		var typeName = s(option(new TSNameRef("any"), seq((s)=>{
			s(colon);
			return s(typename);
		})));

		//s(colon);
		//var typeName = s(typename);
		

		return typeName && new TSParameter(varName, opt, typeName);
	});

	var pParameters = seq((s)=>{
		s(reserved("("));
		var ps = s(sepBy(pParameter, comma));
		s(reserved(")"));
		return ps;
	});



	var accessibility = option(Accessibility.Public, or(
		map(()=>Accessibility.Public,  reserved("public")), 
		map(()=>Accessibility.Private, reserved("private"))
	));

	var modStatic = option(false, map(()=>true, reserved("static")));

	//////////////////////////////////////////////////////////////////////////////////////
	// Type parsers
	/////////////////////////////////////////////////////////////////////////////////

	var spcifying = seq((s)=>{
		s(reserved("{"));
		var members = s(many(tsInterfaceMember));
		s(reserved("}"));
		return new TSSpecifing(members);
	});


	var typenameRef = lexme(seq((s)=>{
		var name = s(identifier);
		var type:TSTypeRef = new TSNameRef(name);
		s(many(seq((s)=>{
			s(reserved("."));
			s(identifier);
			s(ret(()=>{ type = new TSModuleRef(name, type); }));
		}))); 
		return type;
	}));

	var tsFunctionType = seq((s)=>{
		var params = s(pParameters);
		s(reserved("=>"));
		var retType = s(typename);
		return new TSFunctionTypeRef(params, retType);
	});

	var typename = seq((s)=>{
		var type = s(or(spcifying, typenameRef, tsFunctionType));
		s(many(seq((s)=>{
			s(reserved("["));
			s(reserved("]"));
			s(ret(()=>{ type = new TSArrayRef(type); }));
		})));
		return type;
	});


	/////////////////////////////////////////////////////////////////////////////////////
	// Class parser
	/////////////////////////////////////////////////////////////////////////////////////////

	var tsMethod = seq((s)=>{
		var docs = s(documentComment);		
		var access = s(accessibility);		
		var isStatic = s(modStatic);
		var methodName = s(identifier);
		var params = s(pParameters);
		var retType = s(option(new TSNameRef("any"), seq((s)=>{
			s(colon);
			var retType = s(typename);
			return retType;
		})));
		s(semi);
		return retType && new TSMethod(docs && new TSDocs(docs), access, isStatic, methodName, params, retType);
	});

	var tsField = seq((s)=>{
		var docs = s(documentComment);		
		var access = s(accessibility);
		var isStatic = s(modStatic);		
		var name = s(identifier);
		s(colon);
		var type = s(typename);
		s(semi);
		return new TSField(docs && new TSDocs(docs), access, isStatic, name, type);
	});

	var tsConstructor = seq((s)=>{
		var docs = s(documentComment);		
		s(reserved("constructor"));
		var params = s(pParameters);
		s(semi);
		return new TSConstructor(docs && new TSDocs(docs), params);
	});

	var tsIndexer = seq((s)=>{
		var docs = s(documentComment);
		s(reserved("["));
		var name:string = s(identifier);
		s(colon);
		var type:TSTypeRef = s(typename);
		s(reserved("]"));
		s(colon);
		var retType:TSTypeRef = s(typename);
		s(semi);
		return new TSIndexer(docs && new TSDocs(docs), name, type, retType);
	});

	var tsClassmember = or(tsConstructor, tsMethod, tsField, tsIndexer);

	var tsClass = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);
		s(optExport);
		s(reserved("class"));
		var name = s(identifier);
		var superClasses = s(option([], seq((s)=>{
			s(reserved("extends"));
			s(sepBy1(identifier, comma));
		})));
		var interfaces = s(option([], seq((s)=>{
			s(reserved("implements"));
			s(sepBy1(identifier, comma));
		})));
		s(reserved("{"));
		var members = s(many(tsClassmember));
		s(reserved("}"));
		return new TSClass(docs && new TSDocs(docs), name, members);
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Interface parser
	///////////////////////////////////////////////////////////////////////////////////	



	// x:X;
	var tsIField = seq((s)=>{
		var docs = s(documentComment);
		var name = s(identifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));
		s(colon);
		var type = s(typename);
		s(semi);
		return new TSIField(docs && new TSDocs(docs), name, opt, type);
	});

	// new (a:A, b:BS):Z
	var pIConstructor = seq((s)=>{
		var docs = s(documentComment);
		s(reserved("new"));
		var params = s(pParameters);
		s(colon);
		var type = s(typename);
		s(semi);
		return new TSIConstructor(docs && new TSDocs(docs), params, type);
	});

	var tsIFunction = seq((s)=>{
		var docs = s(documentComment);
		var params = s(pParameters);
		s(colon);
		var type = s(typename);
		s(semi);
		return new TSIFunction(docs && new TSDocs(docs), params, type);
	});

	var tsIMethod = seq((s)=>{
		var docs = s(documentComment);		
		var access = s(accessibility);		
		var isStatic = s(modStatic);
		var methodName = s(identifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));		
		var params = s(pParameters);
		var retType = s(option(new TSNameRef("any"), seq((s)=>{
			s(colon);
			var retType = s(typename);
			return retType;
		})));
		s(semi);
		return retType && new TSMethod(docs && new TSDocs(docs), access, isStatic, methodName, params, retType);
	});


	var tsInterfaceMember = or(
		pIConstructor,
		tsIMethod,
		tsIField,
		tsIndexer,
		tsIFunction
	);

	var tsInterface = seq((s)=>{
		var docs = s(documentComment);
		s(optExport);
		s(reserved("interface"));
		var name = s(identifier);
		var ifs = s(optional(seq((s)=>{
			s(reserved("extends"));
			s(sepBy1(typenameRef, comma));
		})));
		s(reserved("{"));
		var members = s(many(tsInterfaceMember));
		s(reserved("}"));
		return new TSInterface(docs && new TSDocs(docs), name, members);
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Other module member elements
	/////////////////////////////////////////////////////////////////////////////////////// 

	var tsEnum = seq((s)=>{
		var docs = s(documentComment);		
		s(optExport);
		s(reserved("enum"));
		var name = s(identifier);
		s(reserved("{"));
		var members = s(sepBy(identifier, comma));
		s(reserved("}"));
		return new TSEnum(docs && new TSDocs(docs), name, members);
	});


	var tsFunction = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);		
		s(optExport);
		s(reserved("function"));
		var name = s(identifier);
		var params = s(pParameters);
		var retType = s(option("any", seq((s)=>{
			s(colon);
			var retType = s(typename);
			return retType;
		})));
		s(semi);
		return retType && new TSFunction(docs && new TSDocs(docs), name, params, retType);
	});

	var tsVar = seq((s)=>{
		var docs = s(documentComment);	
		s(tsDeclare);			
		s(optExport);
		s(reserved("var"));
		var name = s(identifier);
		s(colon);
		var typeName = s(typename);
		s(optional(semi));
		return typeName && new TSVar(docs && new TSDocs(docs), name, typeName);
	});

	var tsModule = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);		
		s(optExport);
		s(reserved("module"));
		var name = s(reference);
		s(reserved("{"));
		var members = s(tsModuleMembers);
		s(reserved("}"));
		return new TSModule(docs && new TSDocs(docs), name, members);
	});

	var tsModuleMembers = many(or(tsModule, tsClass, tsFunction, tsInterface, tsEnum, tsVar));

	export var program = series(spaces, tsModuleMembers);
}
