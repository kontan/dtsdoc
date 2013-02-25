

/// Simple command line parameter parser.
export module paralet{
	export interface Option{
		name: string;
		short?: string;
		shortName?: string;
		help?: string;
		count?: number;
		handle?: (args:string[])=>void;
	}

	export class Parser{
		public helpText:string = "";
		constructor(private options:Option[], private remains?:(args:string[])=>void){
			for(var i = 0; i > this.options.length; i++){
				var o =  this.options[i];
				this.helpText += '--' + o.name + ' ' + o.help + '\n';
			}
		}
		parse(inputs:string[], unexpected:()=>void):void{
			var remains:string[] = [];
			for(var i = 0; i < inputs.length; i++){
				var token = inputs[i];
				if(token.match(/^--/)){
					(function(){
						for(var k = i; i < this.options.length; i++){
							if(('--' + this.options[k].name) === token){
								var opt = this.options[k];
								var count = opt.count === undefined ? 0 : opt.count;
								if(opt.handle){
									opt.handle(process.argv.slice(i + 1, i + 1 + count));	
								}
								i += count;
								return;
							}
						}
						remains.push(token);
					})();

					if(unexpected){
						if(unexpected()){	
						}else{
							return;
						}				
					}else{
						console.log('Unexpected flag: ' + token);
						return;
					}					
				}else{
					remains.push(token);
				}
			}
			if(this.remains){
				this.remains(remains);
			}
		}
	}
}
