dtsdoc / Documatation Generator for TypeScript
---------------

**dtsdoc** is a *experimental* documantation generator for [TypeScript](http://www.typescriptlang.org/)'s ambient source file (*.d.ts). dtsdoc has original parser developed with [Parsect](https://github.com/kontan/Parsect), my parser combinator library and it does't depends on tsc's parser. 

I believe ofiicial document generator will be developed with a parser of tsc in the future. So this project is just a quick hack, mainly for [three.d.ts](https://github.com/kontan/three.d.ts). 

#Online geratation demo
[http://phyzkit.net/dtsdoc/](http://phyzkit.net/dtsdoc/)

# Sample Docs
See [my Web Site](http://phyzkit.net/).

# Build

Some messy step is needed. In node.js command line,

1. `npm install -g jakefile`
2. Download [Parsect](https://github.com/kontan/Parsect) and place same directory with dtsdoc. 
2. `jake`

# Usage

## From command line
To run dtsdoc in node.js, you needs 5 files in build/node dir. `command.js` is command line script, so: 

`node build/node/command source_file_path`

will generate document in the same directory of the input file.

## As node.js module

See `src/command.ts` as example.

## In Web browser

Open `build/web/index.html` in your browser. In Chrome, `--allow-file-access-from-files` option is needed to run locally.

# Known Issues

Can't find a type name in other split module. 

    module M {
        var c: N.C;      <- N.C is not found
        var d: M.N.C;    <- M.N.C is OK
    }

    module M.N {
        class C {
        }
    }

# Desing Problems

## Interface is open
Multiple interfaces with the same name exist together. Merge or split them in documents? Which definition should be linked from a interface name? 

## Interface is structual
Finding of subtype of interface is difficult because all combination of Classed and Interfaces have to be checked. 

## Module is open
One-to-one mapping of a module and a source file does not hold true. I want to keep this docs generator simple but never seems to get there...

## Ugly tags
javadoc/jsdoc style start/end tag (from `/**` to `*/`) is not good...(though `@tag` is good!), because:
  
### Needs Addtional lines
Generally a single line code needes three lines of the document.

    /**                               <- Boo!
     *  Variable hoge is bad.
     */                               <- Boo!
    var hoge:Hoge;

C#-style tags `///` is cool!

    /// Variable piyo is good!
    var piyo:Piyo;


### Complicating parsers
Can you understand the following regexp matches javadoc-style block comments?

    \/(\*(?!\*)|\*\*\*+)([^*]|\r|\n|\*(?!\/))*\*\/      <- block comment

    \/\*(\*(?!\*))((\*(?!\/)|[^*])*)\*\/				<- document comment

C#-style document comment is simple:

	(\s*\/{3}.*\n)*

### Break other block comment

    /* I temporary don't need Puyo...

    	class Puyo{

		    /**                               
		     *  class variable hoge is bad.
		     */                               
		    hoge:Hoge;
		}
	*/							              <- Oops! "Check format of expression term"!

### Jaggy indentation

    /**                               <- no leading spaces, 3 chars
     *  Variable hoge is bad.         <- 1 leading spaces, 1 chars 
     */                               <- 1 leading spaces, 2 chars
    var hoge:Hoge;                    <- no leading spaces

    ///                               <- no leading spaces, 3 chars
    /// Variable hoge is bad.         <- Same as above 
    ///                               <- Same as above
    var hoge:Hoge;                    <- no leading spaces    

### no uniformity
asterisks on line top is needed or not?

    /**
     *  hoge is hoge.
     *  Because hoge is so hoge.
     */
    var hoge: Hoge;

    /**
    	piyo is piyo.
    	Because piyo is so piyo.
    */ 
    var piyo: Piyo; 

### Break other markup like markdown 

    /**
        *hoge* is bad variable!          <- Leading asterisk will be removed or not?
     */
    var hoge: Hoge;

    /// *piyo* is good variable!         <- Obvious, there are always leading `///`. 
    var piyo: Piyo;          