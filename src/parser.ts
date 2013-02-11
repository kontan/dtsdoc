/// <reference path="../../Parsect/src/parsect.ts" />
/// <reference path="../../Parsect/src/globals.ts" />
/// <reference path="../../Parsect/src/type.ts" />

module DTSDoc{

	////////////////////////////////////////////////////////////////////////////////////
	// lex
	////////////////////////////////////////////////////////////////////////////////////
	var lineComment      = regexp(/^\/\/(?!>)[^\n]*\n/);
	var blockComment     = regexp(/^\/\*(?!\*)(.|\r|\n)*?\*\//m);
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
	export var comma = lexme(string(","));
	var optExport = lexme(optional(string("export")));

	export var reserved:(s:string)=>Parsect.Parser = (s)=>lexme(string(s));

	var keyword:(s:string)=>Parsect.Parser = (s)=>lexme(regexp(new RegExp(s + '(?!(\w|_))')));



	var documentComment     = option(undefined, lexme(seq(s=>{
		var text = s(regexp(/\/\*\*(\*(?!\/)|[^*])*\*\//));
		s(whitespace);
		if(s.success()){
			var innerText = seq(s=>{
				s(string("/**"));
				var lines = s(many(seq(s=>{
					s(optional(regexp(/\s*\*(?!\/)\s*/)));
					var line = s(regexp(/[^\r\n]*\n/));
					s(whitespace);
					return line;
				})));
				s(string("*/"));
				if(s.success()){
					return lines.join("");
				}
			});
			var parsed = innerText.parse(text);
			return new TSDocs(parsed.value);
		}
	})));

	var reference  = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
	var identifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));

	var tsDeclare = optional(reserved("declare"));

	export var pParameter = seq((s)=>{
		var isVarArg = s(optional(reserved("...")));
		var varName = s(identifier);
		var opt = s(option(false, map(()=>true, reserved("?"))));
		
		var typeName = s(option(new ASTTypeName("any"), seq((s)=>{
			s(colon);
			s(pType);
		})));

		if(s.success()){
			return new ASTParameter(varName, opt, typeName);
		}
	});

	var pParameters = between(
		reserved("("),
		sepBy(pParameter, comma),
		reserved(")")
	);

	var pAccessibility = option(Accessibility.Public, or(
		map(()=>Accessibility.Public,  reserved("public")), 
		map(()=>Accessibility.Private, reserved("private"))
	));

	var modStatic = option(false, map(()=>true, reserved("static")));

	var pTypeAnnotation = option(new ASTTypeName("any"), seq((s)=>{
		s(colon);
		s(pType);
	}));

	var pOpt = option(false, map(()=>true, reserved("?")));

	//////////////////////////////////////////////////////////////////////////////////////
	// Type parsers
	/////////////////////////////////////////////////////////////////////////////////

	var pSpecifyingTypeMember = seq(s=>{
		var docs = s(documentComment);
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

	var pSpecifyingType = seq((s)=>{
		s(reserved("{"));
		var members = s(many(pSpecifyingTypeMember));
		s(reserved("}"));
		if(s.success()){
			return new ASTSpecifingType(members);
		}
	});

	var pTypeName = lexme(seq((s)=>{
		var name = s(identifier);
		var type:ASTType = new ASTTypeName(name);
		s(many(seq((s)=>{
			s(reserved("."));
			s(identifier);
			if(s.success()){
				type = new ASTModulePrefix(name, type);
			}
		}))); 
		return type;
	}));

	var pFunctionType = seq((s)=>{
		var params = s(pParameters);
		s(reserved("=>"));
		var retType = s(pType);
		if(s.success()){
			return new ASTFunctionTypeRef(params, retType);
		}
	});

	var pType = seq((s)=>{
		var type = s(or(pSpecifyingType, pTypeName, pFunctionType));
		s(many(seq((s)=>{
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

	var pMethodOrField = seq((s)=>{
		var access = s(pAccessibility);		
		var isStatic = s(modStatic);
		var name = s(identifier);
		s(or(
			// method
			seq(s=>{
				var params = s(pParameters);
				var retType = s(pTypeAnnotation);
				if(s.success()){
					return new ASTMethod(access, isStatic, name, new ASTFuncionSignature(params, retType));
				}
			}),
			// field
			seq(s=>{
				s(colon);
				var type = s(pType);
				if(s.success()){
					return new ASTField(access, isStatic, name, type);
				}
			})
		));
	});

	var pConstructor = seq((s)=>{
		s(keyword("constructor"));
		var params = s(pParameters);
		if(s.success()){
			return new ASTConstructor(params);
		}
	});

	var pIIndexer = seq((s)=>{
		s(reserved("["));
		var name:string = s(identifier);
		s(colon);
		var type:ASTType = s(pType);
		s(reserved("]"));
		s(colon);
		var retType:ASTType = s(pType);
		if(s.success()){
			return new ASTIIndexer(name, type, retType);
		}
	});

	var pClassMember = seq(s=>{
		var docs = s(documentComment);
		var member:ASTClassMember = s(or(pConstructor, pMethodOrField, pIIndexer));
		s(semi);
		if(s.success()){
			member.docs = docs;
			return member;
		}
	});

	export var pClass = seq((s)=>{
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
			s(sepBy1(pTypeName, comma));
		})));
		s(reserved("{"));
		var members = s(many(pClassMember));
		s(reserved("}"));
		if(s.success()){
			var clazz = new ASTClass(name, superClasse, members);
			members.forEach((m)=>{ m.parent = clazz; });
			return clazz;
		}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Interface parser
	///////////////////////////////////////////////////////////////////////////////////	

	var pIField = seq((s)=>{
		var name = s(identifier);
		var opt  = s(pOpt);
		var type = s(pTypeAnnotation);
		return new ASTIField(name, opt, type);
	});

	var pIConstructor = seq((s)=>{
		s(keyword("new"));
		var params = s(pParameters);
		var type   = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIConstructor(params, type);
		}
	});

	var pIFunction = seq((s)=>{
		var params = s(pParameters);
		var type   = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIFunction(params, type);
		}
	});

	var pIMethod = seq((s)=>{
		var methodName:string     = s(identifier);
		var opt:bool              = s(pOpt);		
		var params:ASTParameter[] = s(pParameters);
		var retType:ASTType       = s(pTypeAnnotation);
		if(s.success()){
			return new ASTIMethod(methodName, new ASTFuncionSignature(params, retType));
		}
	});

	export var pInterface = seq((s)=>{
		s(reserved("interface"));
		var name:string = s(identifier);
		var ifs:ASTTypeName[] = s(option([], seq((s)=>{
			s(reserved("extends"));
			s(sepBy1(pTypeName, comma));
		})));
		var type:ASTSpecifingType = s(pSpecifyingType);
		if(s.success()){
			return new ASTInterface(name, ifs, type);
		}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	// Other module member elements
	/////////////////////////////////////////////////////////////////////////////////////// 

	export var pEnum = seq((s)=>{
		s(reserved("enum"));
		var name = s(identifier);
		s(reserved("{"));
		var members = s(or(
			trying(sepBy(identifier, comma)), 
			endBy(identifier, comma)
		));
		s(optional(comma));
		s(reserved("}"));
		if(s.success()){
			return new ASTEnum(name, members);
		}
	});

	export var pFunction = seq((s)=>{
		s(reserved("function"));
		var name    = s(identifier);
		var params  = s(pParameters);
		var retType = s(pTypeAnnotation);
		s(semi);
		if(s.success()){
			return new ASTFunction(name, new ASTFuncionSignature(params, retType));
		}
	});

	export var pVar = seq((s)=>{
		s(reserved("var"));
		var name = s(identifier);
		var typeName = s(pTypeAnnotation);
		s(optional(semi));
		if(s.success()){
			return new ASTVar(name, typeName);
		}
	});

	export var pModule = seq((s)=>{
		s(reserved("module"));
		var name = s(reference);
		s(reserved("{"));
		var members = s(pModuleMembers);
		s(reserved("}"));
		if(s.success()){
			var mod = new ASTModule(name, members);
			members.forEach((m)=>{ m.parent = mod; });
			return mod;
		}
	});

	export var pModuleMember:Parsect.Parser = seq((s)=>{
		var docs = s(documentComment);
		s(tsDeclare);		
		s(optExport);
		var member:ASTModuleMember = s(or(pVar, pModule, pClass, pFunction, pInterface, pEnum));
		if(s.success()){
			member.docs = docs;
			return member;
		}
	});

	var pModuleMembers:Parsect.Parser = many(or(pModuleMember, reserved(';')));

	export var pProgram = seq((s)=>{
		s(spaces);
		var docs = s(documentComment);
		var members = s(pModuleMembers);
		s(eof);
		if(s.success()){
			var mod = new ASTModule("(global)", members);
			members.forEach((m)=>{ m.parent = mod; });
			mod.updateHierarchy();
			//return mod;

			var prog = new ASTProgram(mod);
			prog.docs = docs;
			return prog;
		}
	});
}
