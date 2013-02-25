var DTSDoc;
(function (DTSDoc) {
    var HTMLBuilder = (function () {
        function HTMLBuilder() {
            this.array = [];
        }
        HTMLBuilder.prototype.add = function () {
            var _this = this;
            var ss = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                ss[_i] = arguments[_i + 0];
            }
            ss.forEach(function (s) {
                return _this.array.push(s);
            });
        };
        HTMLBuilder.prototype.elem = function (name, classes, attr, contents) {
            this.add('<', name);
            var keys = Object.getOwnPropertyNames(attr);
            if(classes.length > 0) {
                this.add(' class="', classes, '"');
            }
            for(var i = 0; i < keys.length; i++) {
                this.add(' ', keys[i], '=\"', attr[keys[i]], '\"');
            }
            if(contents) {
                this.add('>');
                if(contents instanceof Function) {
                    contents();
                } else {
                    this.array.push(contents);
                }
                this.add('</', name, '>');
            } else {
                this.add('/>');
            }
        };
        HTMLBuilder.prototype.span = function (classes, contents) {
            this.elem('span', classes, {
            }, contents);
        };
        HTMLBuilder.prototype.div = function (classes, contents) {
            this.elem('div', classes, {
            }, contents);
        };
        HTMLBuilder.prototype.p = function (classes, contents) {
            this.elem('p', classes, {
            }, contents);
        };
        HTMLBuilder.prototype.section = function (classes, contents) {
            this.elem('section', classes, {
            }, contents);
        };
        HTMLBuilder.prototype.a = function (classes, href, contents) {
            this.elem('a', classes, {
                'href': href
            }, contents);
        };
        HTMLBuilder.prototype.anchor = function (name) {
            this.elem('a', '', {
                'name': name
            });
        };
        HTMLBuilder.prototype.link = function (url, content) {
            this.elem('a', '', {
                'href': url
            }, content);
        };
        HTMLBuilder.prototype.hr = function () {
            this.elem('hr', '', {
            });
        };
        HTMLBuilder.prototype.h1 = function (x, y) {
            this.elem('h1', y ? x : '', {
            }, y ? y : x);
        };
        HTMLBuilder.prototype.h2 = function (content) {
            this.elem('h2', '', {
            }, content);
        };
        HTMLBuilder.prototype.h3 = function (content) {
            this.elem('h3', '', {
            }, content);
        };
        HTMLBuilder.prototype.ul = function (classes, content) {
            this.elem('ul', classes, {
            }, content);
        };
        HTMLBuilder.prototype.li = function (content) {
            this.elem('li', '', {
            }, content);
        };
        HTMLBuilder.prototype.dl = function (classes, content) {
            this.elem('dl', classes, {
            }, content);
        };
        HTMLBuilder.prototype.dt = function (classes, content) {
            this.elem('dt', classes, {
            }, content);
        };
        HTMLBuilder.prototype.dd = function (classes, content) {
            this.elem('dd', classes, {
            }, content);
        };
        HTMLBuilder.prototype.footer = function (content) {
            this.elem('footer', '', {
            }, content);
        };
        HTMLBuilder.prototype.buildString = function () {
            return this.array.join('');
        };
        return HTMLBuilder;
    })();
    DTSDoc.HTMLBuilder = HTMLBuilder;    
})(DTSDoc || (DTSDoc = {}));
