module DTSDoc{
	export class HTMLBuilder{
		private array:string[] = [];
		constructor(){
		}
		add(...ss:string[]):void{
			ss.forEach(s=>this.array.push(s));
		}
		elem(name:string, classes:string, attr:any, contents?:string):void;
		elem(name:string, classes:string, attr:any, contents?:()=>void):void;
		elem(name:string, classes:string, attr:any, contents?:any):void{
			this.add('<', name);
			var keys:string[] = Object.getOwnPropertyNames(attr);

			// classses
			if(classes.length > 0){
				this.add(' class="', classes, '"');
			}

			// attributes
			for(var i = 0; i < keys.length; i++){
				this.add(' ', keys[i], '=\"', attr[keys[i]], '\"');
			} 

			if(contents){
				this.add('>');
				if(contents instanceof Function){
					contents();
				}else{
					this.array.push(contents);
				}

				this.add('</', name, '>');
			}else{
				this.add('/>');
			}
		}		

		span(classes:string, contents?:string):void;
		span(classes:string, contents?:()=>void):void;
		span(classes:string, contents?:any):void{
			this.elem('span', classes, {}, contents);
		}

		div(classes:string, contents?:string):void;
		div(classes:string, contents?:()=>void):void;
		div(classes:string, contents?:any):void{
			this.elem('div', classes, {}, contents);
		}

		p(classes:string, contents?:string):void;
		p(classes:string, contents?:()=>void):void;
		p(classes:string, contents?:any):void{
			this.elem('p', classes, {}, contents);
		}

		section(classes:string, contents?:string):void;
		section(classes:string, contents?:()=>void):void;
		section(classes:string, contents?:any):void{
			this.elem('section', classes, {}, contents);
		}

		a(classes:string, href:string, contents?:string):void;
		a(classes:string, href:string, contents?:()=>void):void;
		a(classes:string, href:string, contents?:any):void{
			this.elem('a', classes, {'href': href}, contents);
		}

		anchor(name:string):void{
			this.elem('a', '', {'name': name});
		}

		link(url:string, content:string):void{
			this.elem('a', '', { 'href': url }, content);
		}

		hr():void{
			this.elem('hr', '', {});
		}

		h2(content:string):void{
			this.elem('h2', '', {}, content);
		}
		h3(content:string):void{
			this.elem('h3', '', {}, content);
		}

		ul(classes:string, content:()=>void):void;
		ul(classes:string, content:string):void;
		ul(classes:string, content:any):void{
			this.elem('ul', classes, {}, content);
		}
		
		li(content:()=>void):void;
		li(content:string):void;
		li(content:any):void{
			this.elem('li', '', {}, content);
		}

		buildString():string{
			return this.array.join('');
		}
	}
}