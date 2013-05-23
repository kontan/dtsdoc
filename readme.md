dtsdoc / Documatation Generator for TypeScript
---------------

**dtsdoc** is a *experimental* documantation generator for [TypeScript](http://www.typescriptlang.org/)'s ambient source file (*.d.ts). dtsdoc has original parser developed with [Parsect](https://github.com/kontan/Parsect), my parser combinator library and it does't depends on tsc's parser. 

I believe ofiicial document generator will be developed with a parser of tsc in the future. So this project is just a quick hack, mainly for [three.d.ts](https://github.com/kontan/three.d.ts). 

#Online geratation demo
[http://phyzkit.net/dtsdoc/](http://phyzkit.net/dtsdoc/)

# Sample Docs
See [my Web Site](http://phyzkit.net/).

# Build

**If you only want to use dtsdoc, you can use the precompiled javascript source files in `bin` directory**.

1. `npm install -g grunt-cli`
2. `git submodule update --init` 
2. `grunt`

# Usage

## From command line
To run dtsdoc in node.js, you needs some files in bin dir. `dtsdoc.js` is command line script, so: 

`node bin/dtsdoc --out DEST SOURCE_FILE_PATH`

will generate a document in DEST.

## As node.js module

See `src/dtsdoc.ts` as example.

## In Web browser

Open `web/index.html` in your browser. In Chrome, `--allow-file-access-from-files` option is needed to run locally.

# Known Issues

Can't find a type name in other split module, especially the following case: 

    module M {
        var c: N.C;      <- N.C is not found
        var d: M.N.C;    <- M.N.C is OK
    }

    module M.N {
        class C {
        }
    }

# License 

dtsdoc is distributed under the MIT License.

    Copyright (c) 2013 Kon <http://phyzkit.net/>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

# Designing Problems

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
