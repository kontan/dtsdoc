dtsdoc / Documatation Generator for TypeScript
---------------

**dtsdoc** is a *experimental* documantation generator for [TypeScript](http://www.typescriptlang.org/)'s ambient source file (*.d.ts). dtsdoc has original parser developed with [Parsect](https://github.com/kontan/Parsect), my parser combinator library and it does't depends on tsc's parser. 

I believe ofiicial document generator will be developed with a parser of tsc in the future. So this project is just a quick hack, mainly for [three.d.ts](https://github.com/kontan/three.d.ts). 

#Online geratation demo
[http://phyzkit.net/dtsdoc/](http://phyzkit.net/dtsdoc/)

# Sample Docs
See [my Web Site](http://phyzkit.net/).

#Problems

* Interface is open: Multiple interfaces with the same name exist together. Merge or split them in documents? Which definition should be linked from a interface name? 

* Interface is structual: Finding of subtype of interface is difficult because all combination of Classed and Interfaces have to be checked. 

* Module is open: One-to-one mapping of a module and a source file does not hold true. I want to keep this docs generator simple but never seems to get there...

* javadoc/jsdoc style start/end tag (/** */) is so bad...("@tag" is good!), because:
    * Needs Addtional lines
    * Complicating parsers
    * Break nested block comment
    * Ugly, jaggy indentation
    * no uniformity: asterisks on line top is needed or not?
    * Break other markup like markdown (ex:  

    /*
     * *hoge* <- ???
     */