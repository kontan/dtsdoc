/// <reference path="../Parsect/src/parsect.ts" />
/// <reference path="../Parsect/src/globals.ts" />
/// <reference path="type.ts" />

module DTSDoc{	

	////////////////////////////////////////////////////////////////////////////////////
	// lex
	////////////////////////////////////////////////////////////////////////////////////
	
	var lineComment      = regexp(/^\/\/[^\r\n]*(\r\n|\r|\n|$)/m);
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

	export function reserved(s:string): Parsect.Parser{
		return new Parsect.Parser("", (src)=>{ return lexme(string(s)).parse(src); });
	}
	function keyword(s:string): Parsect.Parser{
		return lexme(regexp(new RegExp('^' + s + '(?!(\\w|_))', '')));
	}
	
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

	var pDocumentCommentSection     = lexme(seq(s=>{
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
	}));

	var pDocumentComment = option(undefined, pDocumentCommentSection);
	var pDocumentComments = many(pDocumentCommentSection);
	var pIdentifierPath = sepBy1(pIdentifier, period);
	var pOpt = option(false, map(()=>true, reserved("?")));
	export var pParameter = Parsect.lazy(()=>Parsect.build(ASTParameter, [pDocumentComment, optional(reserved("..."))], [pIdentifier], [pOpt], [pTypeAnnotation]));
	export var pParameters = Parsect.build(ASTParameters, [reserved("("), sepBy(pParameter, comma)], [reserved(")")]);	
	var pTypeAnnotation = Parsect.lazy(()=>option(new ASTTypeAnnotation(new ASTTypeName(["any"])), Parsect.build(ASTTypeAnnotation, [colon, pType])));

	//////////////////////////////////////////////////////////////////////////////////////
	// Type Riteral
	/////////////////////////////////////////////////////////////////////////////////

	var pSpecifyingTypeMember = seq(s=>{
		var docs:ASTDocs[] = s(pDocumentComments);
		var member:ASTInterfaceMember = s(or(
			pIConstructor,
			trying(pIMethod),
			pIField,
			pIIndexer,
			pIFunction
		));
		s(semi);
		if(s.success()){
			if(docs.length >= 2){
				console.log("WARNING: Too many document comment at a specifying type member." + s.peek());
			}
			member.docs = docs[docs.length - 1];
			return member;
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

	var pTypeNameLiteral        = Parsect.build(ASTTypeName, [pIdentifierPath]);
	var pSpecifyingType         = Parsect.build(ASTSpecifingType, [reserved("{"), many(pSpecifyingTypeMember)], [reserved("}")]);
	var pConstructorTypeRiteral = Parsect.build(ASTConstructorTypeLiteral, [keyword('new'), pParameters], [reserved("=>"), pType]);
	var pFunctionTypeLiteral    = Parsect.build(ASTFunctionType, [pDocumentComment], [pParameters], [reserved("=>"), pType]);

	/////////////////////////////////////////////////////////////////////////////////////
	// Class parser
	/////////////////////////////////////////////////////////////////////////////////////////

	var pMethodOrField = seq(s=>{
		var access = s(pAccessibility);		
		var isStatic = s(pStatic);
		var name = s(pIdentifier);
		s(or(
			Parsect.map((sig)=>new ASTMethod(access, isStatic, name, sig), pFunctionSigniture),
			Parsect.map((type)=>new ASTField(access, isStatic, name, type), pTypeAnnotation)
		));
	});

	var pConstructor = Parsect.build(ASTConstructor, [keyword("constructor"), pParameters]);
	var pIIndexer    = Parsect.build(ASTIIndexer, [reserved("["), pIdentifier], [pTypeAnnotation], [reserved("]"), pTypeAnnotation]);
	var pClassMember = seq(s=>{
		var docs:ASTDocs[] = s(pDocumentComments);
		var member:ASTClassMember = s(or(pConstructor, pMethodOrField, pIIndexer));
		s(semi);
		if(s.success()){
			if(docs.length >= 2){
				console.log("WARNING: Too many document comment for a member at: " + s.peek());
			}
			member.docs = docs[docs.length - 1];
			
			return member;
		}
	});

	var pClass = Parsect.build(ASTClass, 
		[reserved("class"), pIdentifier], 
		[option(undefined, series(reserved("extends"), pTypeNameLiteral))], 
		[option([], series(reserved("implements"), sepBy1(pTypeNameLiteral, comma)))],
		[between(reserved("{"), many(pClassMember), reserved("}"))]
	);

	/////////////////////////////////////////////////////////////////////////////////////////
	// Interface parser
	///////////////////////////////////////////////////////////////////////////////////	

	var pFunctionSigniture = Parsect.build(ASTFuncionSignature, [pParameters], [pTypeAnnotation]);
	var pIField            = Parsect.build(ASTIField, [pIdentifier], [pOpt], [pTypeAnnotation]);
	var pIConstructor      = Parsect.build(ASTIConstructor, [keyword("new"), pParameters], [pTypeAnnotation]);
	var pIFunction         = Parsect.build(ASTIFunction, [pParameters], [pTypeAnnotation]);
	var pIMethod           = Parsect.build(ASTIMethod, [pIdentifier], [pOpt], [pFunctionSigniture]);
	var pInterface         = Parsect.build(ASTInterface, [reserved("interface"), pIdentifier], [option([], series(reserved("extends"), sepBy1(pTypeNameLiteral, comma)))], [pSpecifyingType]);

	/////////////////////////////////////////////////////////////////////////////////////////
	// Other module member elements
	/////////////////////////////////////////////////////////////////////////////////////// 

	var pModuleRef = or(trying(series(keyword('module'), between(reserved('('), pStringRiteral, reserved(')')))), pTypeNameLiteral);
	var pImport    = Parsect.build(ASTImport, [keyword('import'), pIdentifier], [reserved('='), pModuleRef], [reserved(';')]);
	var pEnum      = Parsect.build(ASTEnum, [keyword("enum"), pIdentifier], [reserved("{"), or(trying(sepBy(pIdentifier, comma)), endBy(pIdentifier, comma))], [optional(comma), reserved("}")]);
	var pFunction  = Parsect.build(ASTFunction, [keyword("function"), pIdentifier], [pFunctionSigniture], [semi]);
	var pVar       = Parsect.build(ASTVar, [keyword("var"), pIdentifier], [pTypeAnnotation], [optional(semi)]);
	var pCallable  = Parsect.build(ASTCallable, [keyword("function"), pFunctionSigniture], [semi]);
	var pModuleMemberDocs = Parsect.build(ASTModuleMemberDocs, [pDocumentCommentSection]);
	var pModule = seq(s=>{
		s(keyword("module"));
		var tokens:string[] = s(or(pIdentifierPath, map((s)=>[s], pStringRiteral)));
		s(reserved("{"));
		var members = s(pModuleMembers);
		s(reserved("}"));
		if(s.success()){
			var mod = new ASTModule(tokens[tokens.length - 1], members);
			for(var i = tokens.length - 2; i >= 0; i--){
				var parent = new ASTModule(tokens[i], [mod]);
				mod.parent = parent;
				mod = parent;
			}
			return mod;
		}
	});

	var pModuleMember:Parsect.Parser = seq(s=>{
		var docs = s(pDocumentComment);
		s(pDeclare);		
		s(pExport);
		var member:ASTModuleMember = s(or(pVar, pModule, pClass, trying(pFunction), pCallable, pInterface, pEnum, pImport));
		s(many(semi));
		if(s.success()){
			member.docs = docs;
			return member;
		}
	});

	var pModuleMembers:Parsect.Parser = many(pModuleMember);

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
