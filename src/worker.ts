self.onmessage = (event:MessageEvent)=>{
    var sourceCode = event.data;

	var result = DTSDoc.pProgram.parse(new Source(sourceCode, 0));
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
			b.elem('footer', '', {}, ()=>{
				b.link("https://github.com/kontan/dtsdoc", 'DTSDoc');
			});
			
		});

		postMessage({
			"type": 'success',
			"docs": b.buildString()
		}, undefined);
	}else{
		var pos = result.source.getPosition();
		postMessage({
			"type": 'fail',
			'line': pos.line,
			'column': pos.column,
			'source': result.source.source.slice(result.source.position, result.source.position + 128),
			'message': result.errorMesssage
		}, undefined);
	}
};