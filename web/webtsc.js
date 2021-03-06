var Parsect;
(function (Parsect) {
    var Parser = (function () {
        function Parser(name, _parse, expected) {
            this.name = name;
            this._parse = _parse;
            this.expected = expected;
        }
        Parser.prototype.parse = function (arg) {
            return arg instanceof Source ? this._parse(arg) : this._parse(new Source(arg));
        };
        return Parser;
    })();
    Parsect.Parser = Parser;    
    var State = (function () {
        function State(value, source, success, errorMesssage) {
            if (typeof success === "undefined") { success = true; }
            this.value = value;
            this.source = source instanceof Source ? source : new Source(source);
            this.success = success;
            this.errorMesssage = errorMesssage;
            this.position = this.source.position;
        }
        State.success = function success(arg0, arg1, arg2) {
            var source = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
            var value = arg0 instanceof Source ? arg1 : arg2;
            return new State(value, source, true, undefined);
        };
        State.fail = function fail(arg0, arg1, arg2) {
            var source = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
            var message = arg0 instanceof Source ? arg1 : arg2;
            return new State(undefined, source, false, message);
        };
        State.prototype.equals = function (st) {
            if(!st) {
                return false;
            }
            return this.value === st.value && this.source.equals(st.source) && this.success === st.success && this.errorMesssage === st.errorMesssage;
        };
        return State;
    })();
    Parsect.State = State;    
    var Source = (function () {
        function Source(source, position, userData) {
            if (typeof position === "undefined") { position = 0; }
            this.source = source;
            this.position = position;
            this.userData = userData;
            if(position < 0 || position > source.length + 1) {
                throw "_position: out of range: " + position;
            }
        }
        Source.prototype.progress = function (delta) {
            return new Source(this.source, this.position + delta, this.userData);
        };
        Source.prototype.success = function (delta, value) {
            if (typeof delta === "undefined") { delta = 0; }
            if (typeof value === "undefined") { value = undefined; }
            return State.success(new Source(this.source, this.position + delta, this.userData), value);
        };
        Source.prototype.fail = function (message) {
            return State.fail(this, message);
        };
        Source.prototype.getPosition = function () {
            var lines = this.source.slice(0, this.position).split('\n');
            return {
                line: lines.length,
                column: lines[lines.length - 1].length
            };
        };
        Source.prototype.getInput = function () {
            return this.source.slice(this.position);
        };
        Source.prototype.equals = function (src) {
            return src && this.source === src.source && this.position === src.position;
        };
        return Source;
    })();
    Parsect.Source = Source;    
    function string(text) {
        return new Parser("string \"" + text + "\"", function (s) {
            return s.source.indexOf(text, s.position) === s.position ? s.success(text.length, text) : s.fail("expected \"" + text + "\"");
        }, "\"" + text + "\"");
    }
    Parsect.string = string;
    function regexp(pattern) {
        return new Parser("regexp \"" + pattern + "\"", function (s) {
            var input = s.source.slice(s.position);
            pattern.lastIndex = 0;
            var ms = pattern.exec(input);
            if(ms && ms.index == 0 && ms.length > 0) {
                var m = ms[0];
                return input.indexOf(ms[0]) == 0 ? s.success(m.length, m) : s.fail("expected /" + pattern + "/");
            } else {
                return s.fail("expected " + pattern);
            }
        }, pattern.toString());
    }
    Parsect.regexp = regexp;
    function satisfy(cond) {
        var expectedChars = function () {
            var cs = [];
            for(var i = 32; i <= 126; i++) {
                var c = String.fromCharCode(i);
                if(cond(c)) {
                    cs.push(c);
                }
            }
            return cs;
        };
        return new Parser("satisfy", function (s) {
            var c = s.source[s.position];
            return cond(c) ? s.success(1, c) : s.fail("expected one char of \"" + expectedChars().join('') + "\"");
        }, '(satisfy)');
    }
    Parsect.satisfy = satisfy;
    function seq(f) {
        return new Parser("seq", function (source) {
            var st = source.success();
            var s = function (a) {
                if(st.success) {
                    st = (a instanceof Parser ? a : string(a)).parse(st.source);
                    if(st.success) {
                        return st.value;
                    }
                }
            };
            s.notFollowedBy = function (p) {
                var _st = p.parse(st.source);
                if(_st.success) {
                    st = st.source.fail('unexpected ' + p.expected);
                }
            };
            s.getUserState = function () {
                return source.userData;
            };
            s.success = function () {
                return st.success;
            };
            s.peek = function () {
                return st.source.source.slice(st.source.position, st.source.position + 128);
            };
            s.result = function () {
                return st.value;
            };
            var r = f(s);
            return s.success() ? (r !== undefined ? st.source.success(0, r) : st) : st;
        });
    }
    Parsect.seq = seq;
    function trying(p) {
        return new Parser('tring', function (source) {
            var st = p.parse(source);
            return st.success ? st : source.fail(st.errorMesssage);
        });
    }
    Parsect.trying = trying;
    function series() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        return new Parser("series", function (source) {
            var st = source.success();
            for(var i = 0; i < ps.length && st.success; i++) {
                var _st = ps[i].parse(st.source);
                if(_st.success) {
                    st = _st;
                } else {
                    return st.source.fail(_st.errorMesssage);
                }
            }
            return st.success ? st : st.source.fail();
        });
    }
    Parsect.series = series;
    function stream(ps) {
        return new Parser("series", function (source) {
            var st = source.success();
            for(var i = 0; i < ps.length && st.success; i++) {
                var _st = ps[i].parse(st.source);
                if(_st.success) {
                    st = _st;
                } else {
                    return st.source.fail(_st.errorMesssage);
                }
            }
            return st.success ? st : st.source.fail();
        });
    }
    Parsect.stream = stream;
    function ret(f) {
        return new Parser("ret", function (s) {
            return s.success(0, f());
        });
    }
    Parsect.ret = ret;
    function count(n, p) {
        return new Parser("count " + n, function (s) {
            var st = s.success();
            var results = [];
            for(var i = 0; i < n; i++) {
                var _st = p.parse(st.source);
                if(_st.success) {
                    st = _st;
                    results.push(st.value);
                } else {
                    return st.source.fail();
                }
            }
            return st.source.success(0, results);
        });
    }
    Parsect.count = count;
    function many(p) {
        return new Parser("many", function (s) {
            var st = s.success();
            var results = [];
            for(var i = 0; true; i++) {
                var _st = p.parse(st.source);
                if(_st.success) {
                    st = _st;
                    results.push(st.value);
                } else if(_st.source.position == st.source.position) {
                    return st.source.success(0, results);
                } else {
                    return _st;
                }
            }
        });
    }
    Parsect.many = many;
    function many1(p) {
        return new Parser("many1", function (s) {
            var st = s.success();
            var results = [];
            var i = 0;
            for(var i = 0; true; i++) {
                var _st = p.parse(st.source);
                if(_st.success) {
                    st = _st;
                    results.push(st.value);
                } else {
                    break;
                }
            }
            return results.length > 0 ? st.source.success(0, results) : st.source.fail("expected one or more " + p.expected);
        });
    }
    Parsect.many1 = many1;
    function or() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        var ps = arguments;
        return new Parser("or", function (source) {
            for(var i = 0; i < ps.length; i++) {
                var st = ps[i].parse(source);
                if(st.success) {
                    return st;
                } else if(st.source.position != source.position) {
                    return st;
                }
            }
            return source.fail();
        });
    }
    Parsect.or = or;
    function option(defaultValue, p) {
        return new Parser("option", function (source) {
            var st = p.parse(source);
            return st.success ? st : source.success(0, defaultValue);
        });
    }
    Parsect.option = option;
    function optional(p) {
        return new Parser("optional", function (source) {
            return option(undefined, p).parse(source);
        });
    }
    Parsect.optional = optional;
    function notFollowedBy(value, p) {
        return new Parser("notFollowedBy " + p.name, function (source) {
            var st = p.parse(source);
            return st.success ? State.success(source, value) : st.source.fail('not expected ' + p.expected);
        });
    }
    Parsect.notFollowedBy = notFollowedBy;
    function map(f, p) {
        return new Parser("map(" + p.name + ")", function (source) {
            var st = p.parse(source);
            return st.success ? st.source.success(0, f(st.value)) : st;
        });
    }
    Parsect.map = map;
    Parsect.sepBy1 = function (p, sep) {
        return new Parser("sepBy1", function (source) {
            return seq(function (s) {
                var x = s(p);
                var xs = s(many(series(sep, p)));
                if(s.success()) {
                    xs.unshift(x);
                    return xs;
                }
            }).parse(source);
        });
    };
    Parsect.sepBy = function (p, sep) {
        return new Parser("sepBy", function (source) {
            return or(Parsect.sepBy1(p, sep), map(function () {
                return [];
            }, Parsect.empty)).parse(source);
        });
    };
    Parsect.endBy1 = function (p, sep) {
        return new Parser("endBy1", function (source) {
            var q = seq(function (s) {
                var x = s(p);
                s(sep);
                return x;
            });
            return seq(function (s) {
                var x = s(q);
                var xs = s(many(q));
                if(s.success()) {
                    xs.unshift(x);
                    return xs;
                }
            }).parse(source);
        });
    };
    Parsect.endBy = function (p, sep) {
        return new Parser("endBy", function (source) {
            return or(Parsect.endBy1(p, sep), Parsect.empty).parse(source);
        });
    };
    Parsect.between = function (open, p, close) {
        return seq(function (s) {
            s(open);
            var v = s(p);
            s(close);
            return v;
        });
    };
    function apply(func) {
        var parserSeq = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            parserSeq[_i] = arguments[_i + 1];
        }
        return new Parser("apply", function (source) {
            var args = [];
            var st = source.success();
            for(var i = 0; i < parserSeq.length; i++) {
                var _st = stream(parserSeq[i]).parse(st.source);
                if(_st.success) {
                    st = _st;
                    args.push(_st.value);
                } else {
                    return st.source.fail("");
                }
            }
            return st.source.success(0, func.apply(undefined, args));
        });
    }
    Parsect.apply = apply;
    function build(ctor) {
        var parserSeq = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            parserSeq[_i] = arguments[_i + 1];
        }
        return new Parser("apply", function (source) {
            var args = [];
            var st = source.success();
            for(var i = 0; i < parserSeq.length; i++) {
                var _st = stream(parserSeq[i]).parse(st.source);
                if(_st.success) {
                    st = _st;
                    args.push(_st.value);
                } else {
                    return st.source.fail("");
                }
            }
            var obj = Object.create(ctor.prototype);
            ctor.apply(obj, args);
            return st.source.success(0, obj);
        });
    }
    Parsect.build = build;
    function log(f) {
        var count = 0;
        return new Parser("log", function (source) {
            var pos = Math.floor(100 * source.position / source.source.length);
            if(pos > count) {
                count = pos;
                f(count);
            }
            return source.success(0);
        });
    }
    Parsect.log = log;
    Parsect.eof = new Parser('eof', function (source) {
        return source.position === source.source.length ? source.success(1) : source.fail();
    });
    Parsect.empty = new Parser("empty", function (source) {
        return source.success(0);
    });
    Parsect.spaces = regexp(/^\s*/);
    Parsect.lower = regexp(/^[a-z]/);
    Parsect.upper = regexp(/^[A-Z]/);
    Parsect.alpha = regexp(/^[a-zA-Z]/);
    Parsect.digit = regexp(/^[0-9]/);
    Parsect.alphaNum = regexp(/^[0-9a-zA-Z]/);
    Parsect.number;
    Parsect.number = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
})(Parsect || (Parsect = {}));
var Source = Parsect.Source;
var ret = Parsect.ret;
var seq = Parsect.seq;
var many = Parsect.many;
var many1 = Parsect.many1;
var option = Parsect.option;
var optional = Parsect.optional;
var count = Parsect.count;
var map = Parsect.map;
var series = Parsect.series;
var or = Parsect.or;
var sepBy1 = Parsect.sepBy1;
var sepBy = Parsect.sepBy;
var endBy = Parsect.endBy;
var between = Parsect.between;
var trying = Parsect.trying;
var satisfy = Parsect.satisfy;
var eof = Parsect.eof;
var empty = Parsect.empty;
var string = Parsect.string;
var regexp = Parsect.regexp;
var number = Parsect.number;
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
                this.add('>');
                this.add('</', name, '>');
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
                'id': name
            });
        };
        HTMLBuilder.prototype.link = function (url, content) {
            this.elem('a', '', {
                'href': url
            }, content);
        };
        HTMLBuilder.prototype.hr = function () {
            this.add('<hr/>');
        };
        HTMLBuilder.prototype.h1 = function (x, y) {
            this.elem('h1', y ? x : '', {
            }, y ? y : x);
        };
        HTMLBuilder.prototype.h2 = function (x, y) {
            this.elem('h2', y ? x : '', {
            }, y ? y : x);
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
var primitiveTypeNameLinks = {
    "string": "http://phyzkit.net/docs/lib.d.ts.html#interface%20String",
    "bool": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Boolean",
    "number": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Number"
};
var typeNameLinks = {
    "PropertyDescriptor": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PropertyDescriptor",
    "PropertyDescriptorMap": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PropertyDescriptorMap",
    "Object": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Object",
    "Function": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Function",
    "IArguments": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IArguments",
    "String": "http://phyzkit.net/docs/lib.d.ts.html#interface%20String",
    "Boolean": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Boolean",
    "Number": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Number",
    "Math": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Math",
    "Date": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Date",
    "RegExpExecArray": "http://phyzkit.net/docs/lib.d.ts.html#interface%20RegExpExecArray",
    "RegExp": "http://phyzkit.net/docs/lib.d.ts.html#interface%20RegExp",
    "Error": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Error",
    "EvalError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20EvalError",
    "RangeError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20RangeError",
    "ReferenceError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ReferenceError",
    "SyntaxError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SyntaxError",
    "TypeError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TypeError",
    "URIError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20URIError",
    "JSON": "http://phyzkit.net/docs/lib.d.ts.html#interface%20JSON",
    "Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Array",
    "ArrayBuffer": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ArrayBuffer",
    "ArrayBufferView": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ArrayBufferView",
    "Int8Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Int8Array",
    "Uint8Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Uint8Array",
    "Int16Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Int16Array",
    "Uint16Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Uint16Array",
    "Int32Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Int32Array",
    "Uint32Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Uint32Array",
    "Float32Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Float32Array",
    "Float64Array": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Float64Array",
    "DataView": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DataView",
    "NavigatorID": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NavigatorID",
    "HTMLTableElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableElement",
    "TreeWalker": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TreeWalker",
    "GetSVGDocument": "http://phyzkit.net/docs/lib.d.ts.html#interface%20GetSVGDocument",
    "HTMLHtmlElementDOML2Deprecated": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLHtmlElementDOML2Deprecated",
    "SVGPathSegCurvetoQuadraticRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticRel",
    "Performance": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Performance",
    "SVGSVGElementEventHandlers": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGSVGElementEventHandlers",
    "MSDataBindingTableExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSDataBindingTableExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLParagraphElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLParagraphElement",
    "CompositionEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CompositionEvent",
    "SVGMarkerElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGMarkerElement",
    "WindowTimers": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowTimers",
    "CSSStyleDeclaration": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSStyleDeclaration",
    "SVGGElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGGElement",
    "MSStyleCSSProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSStyleCSSProperties",
    "MSCSSStyleSheetExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSStyleSheetExtensions",
    "Navigator": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Navigator",
    "SVGPathSegCurvetoCubicSmoothAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoCubicSmoothAbs",
    "MSBorderColorStyle_HTMLFrameSetElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorStyle_HTMLFrameSetElement",
    "SVGZoomEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGZoomEvent",
    "NodeSelector": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NodeSelector",
    "HTMLTableDataCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableDataCellElement",
    "MSHTMLDirectoryElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDirectoryElementExtensions",
    "HTMLBaseElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBaseElement",
    "ClientRect": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ClientRect",
    "PositionErrorCallback": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PositionErrorCallback",
    "DOMImplementation": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMImplementation",
    "DOML2DeprecatedWidthStyle_HTMLBlockElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLBlockElement",
    "SVGUnitTypes": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGUnitTypes",
    "DocumentRange": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentRange",
    "MSHTMLDocumentExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDocumentExtensions",
    "CSS2Properties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSS2Properties",
    "MSImageResourceExtensions_HTMLInputElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSImageResourceExtensions_HTMLInputElement",
    "MSHTMLEmbedElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLEmbedElementExtensions",
    "MSHTMLModElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLModElementExtensions",
    "Element": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Element",
    "SVGDocument": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGDocument",
    "HTMLNextIdElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLNextIdElement",
    "SVGPathSegMovetoRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegMovetoRel",
    "SVGLineElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGLineElement",
    "HTMLParagraphElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLParagraphElement",
    "MSHTMLTextAreaElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTextAreaElementExtensions",
    "ErrorFunction": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ErrorFunction",
    "HTMLAreasCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLAreasCollection",
    "SVGDescElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGDescElement",
    "Node": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Node",
    "MSHTMLLegendElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLLegendElementExtensions",
    "MSCSSStyleDeclarationExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSStyleDeclarationExtensions",
    "SVGPathSegCurvetoQuadraticSmoothRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticSmoothRel",
    "DOML2DeprecatedAlignmentStyle_HTMLTableRowElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableRowElement",
    "DOML2DeprecatedBorderStyle_HTMLObjectElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_HTMLObjectElement",
    "MSHTMLSpanElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLSpanElementExtensions",
    "MSHTMLObjectElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLObjectElementExtensions",
    "DOML2DeprecatedListSpaceReduction": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedListSpaceReduction",
    "CSS3Properties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSS3Properties",
    "MSScriptHost": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSScriptHost",
    "SVGClipPathElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGClipPathElement",
    "MouseEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MouseEvent",
    "DOML2DeprecatedAlignmentStyle_HTMLTableElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableElement",
    "RangeException": "http://phyzkit.net/docs/lib.d.ts.html#interface%20RangeException",
    "DOML2DeprecatedAlignmentStyle_HTMLHRElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLHRElement",
    "SVGTextPositioningElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTextPositioningElement",
    "HTMLAppletElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLAppletElement",
    "MSHTMLFieldSetElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLFieldSetElementExtensions",
    "DocumentEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentEvent",
    "MSHTMLUnknownElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLUnknownElementExtensions",
    "TextMetrics": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextMetrics",
    "DOML2DeprecatedWordWrapSuppression_HTMLBodyElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLBodyElement",
    "HTMLOListElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLOListElement",
    "MSHTMLTableCaptionElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableCaptionElementExtensions",
    "SVGAnimatedString": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedString",
    "SVGPathSegLinetoVerticalRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegLinetoVerticalRel",
    "CDATASection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CDATASection",
    "StyleMedia": "http://phyzkit.net/docs/lib.d.ts.html#interface%20StyleMedia",
    "TextRange": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextRange",
    "HTMLSelectElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLSelectElement",
    "CSSStyleSheet": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSStyleSheet",
    "HTMLBlockElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBlockElement",
    "SVGTests": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTests",
    "MSSelection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSSelection",
    "MSHTMLDListElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDListElementExtensions",
    "HTMLMetaElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLMetaElement",
    "Selection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Selection",
    "SVGAnimatedAngle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedAngle",
    "SVGPatternElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPatternElement",
    "SVGScriptElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGScriptElement",
    "HTMLDDElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDDElement",
    "NodeIterator": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NodeIterator",
    "CSSStyleRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSStyleRule",
    "MSDataBindingRecordSetReadonlyExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSDataBindingRecordSetReadonlyExtensions",
    "HTMLLinkElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLLinkElement",
    "SVGViewElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGViewElement",
    "MSHTMLAppletElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLAppletElementExtensions",
    "SVGLocatable": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGLocatable",
    "HTMLFontElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLFontElement",
    "MSHTMLTableElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableElementExtensions",
    "SVGTitleElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTitleElement",
    "ControlRangeCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ControlRangeCollection",
    "DOML2DeprecatedAlignmentStyle_HTMLImageElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLImageElement",
    "MSHTMLFrameElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLFrameElementExtensions",
    "MSNamespaceInfo": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSNamespaceInfo",
    "WindowSessionStorage": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowSessionStorage",
    "SVGAnimatedTransformList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedTransformList",
    "HTMLTableCaptionElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableCaptionElement",
    "HTMLOptionElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLOptionElement",
    "HTMLMapElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLMapElement",
    "HTMLMenuElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLMenuElement",
    "MouseWheelEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MouseWheelEvent",
    "SVGFitToViewBox": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFitToViewBox",
    "MSHTMLAnchorElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLAnchorElementExtensions",
    "SVGPointList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPointList",
    "MSElementCSSInlineStyleExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSElementCSSInlineStyleExtensions",
    "SVGAnimatedLengthList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedLengthList",
    "MSHTMLTableDataCellElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableDataCellElementExtensions",
    "Window": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Window",
    "SVGAnimatedPreserveAspectRatio": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedPreserveAspectRatio",
    "MSSiteModeEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSSiteModeEvent",
    "MSCSSStyleRuleExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSStyleRuleExtensions",
    "StyleSheetPageList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20StyleSheetPageList",
    "HTMLCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLCollection",
    "MSCSSProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSProperties",
    "HTMLImageElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLImageElement",
    "HTMLAreaElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLAreaElement",
    "EventTarget": "http://phyzkit.net/docs/lib.d.ts.html#interface%20EventTarget",
    "SVGAngle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAngle",
    "HTMLButtonElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLButtonElement",
    "MSHTMLLabelElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLLabelElementExtensions",
    "HTMLSourceElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLSourceElement",
    "CanvasGradient": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CanvasGradient",
    "KeyboardEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20KeyboardEvent",
    "Document": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Document",
    "MessageEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MessageEvent",
    "SVGElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGElement",
    "HTMLScriptElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLScriptElement",
    "MSHTMLBodyElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLBodyElementExtensions",
    "HTMLTableRowElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableRowElement",
    "MSCommentExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCommentExtensions",
    "DOML2DeprecatedMarginStyle_HTMLMarqueeElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_HTMLMarqueeElement",
    "MSCSSRuleList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSRuleList",
    "CanvasRenderingContext2D": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CanvasRenderingContext2D",
    "SVGPathSegLinetoHorizontalAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegLinetoHorizontalAbs",
    "DOML2DeprecatedAlignmentStyle_HTMLObjectElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLObjectElement",
    "DOML2DeprecatedBorderStyle_MSHTMLIFrameElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_MSHTMLIFrameElementExtensions",
    "MSHTMLElementRangeExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLElementRangeExtensions",
    "SVGPathSegArcAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegArcAbs",
    "MSScreenExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSScreenExtensions",
    "HTMLHtmlElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLHtmlElement",
    "MSBorderColorStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorStyle",
    "SVGTransformList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTransformList",
    "SVGPathSegClosePath": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegClosePath",
    "DOML2DeprecatedMarginStyle_MSHTMLIFrameElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_MSHTMLIFrameElementExtensions",
    "HTMLFrameElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLFrameElement",
    "SVGAnimatedLength": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedLength",
    "CSSMediaRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSMediaRule",
    "HTMLQuoteElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLQuoteElement",
    "SVGDefsElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGDefsElement",
    "SVGAnimatedPoints": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedPoints",
    "WindowModal": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowModal",
    "MSHTMLButtonElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLButtonElementExtensions",
    "XMLHttpRequest": "http://phyzkit.net/docs/lib.d.ts.html#interface%20XMLHttpRequest",
    "HTMLTableHeaderCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableHeaderCellElement",
    "HTMLDListElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDListElement",
    "MSDataBindingExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSDataBindingExtensions",
    "SVGEllipseElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGEllipseElement",
    "SVGPathSegLinetoHorizontalRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegLinetoHorizontalRel",
    "SVGAElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAElement",
    "MSHTMLMetaElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLMetaElementExtensions",
    "SVGStylable": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGStylable",
    "MSHTMLTableCellElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableCellElementExtensions",
    "HTMLFrameSetElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLFrameSetElement",
    "SVGTransformable": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTransformable",
    "Screen": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Screen",
    "NavigatorGeolocation": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NavigatorGeolocation",
    "Coordinates": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Coordinates",
    "DOML2DeprecatedAlignmentStyle_HTMLTableColElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableColElement",
    "EventListener": "http://phyzkit.net/docs/lib.d.ts.html#interface%20EventListener",
    "SVGLangSpace": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGLangSpace",
    "DataTransfer": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DataTransfer",
    "FocusEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20FocusEvent",
    "Range": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Range",
    "MSHTMLPreElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLPreElementExtensions",
    "SVGPoint": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPoint",
    "MSPluginsCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSPluginsCollection",
    "MSHTMLFontElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLFontElementExtensions",
    "SVGAnimatedNumberList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedNumberList",
    "SVGSVGElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGSVGElement",
    "HTMLLabelElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLLabelElement",
    "MSResourceMetadata": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSResourceMetadata",
    "MSHTMLQuoteElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLQuoteElementExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLIFrameElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLIFrameElement",
    "HTMLLegendElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLLegendElement",
    "HTMLDirectoryElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDirectoryElement",
    "NavigatorAbilities": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NavigatorAbilities",
    "MSHTMLImageElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLImageElementExtensions",
    "SVGAnimatedInteger": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedInteger",
    "SVGTextElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTextElement",
    "SVGTSpanElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTSpanElement",
    "HTMLLIElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLLIElement",
    "SVGPathSegLinetoVerticalAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegLinetoVerticalAbs",
    "ViewCSS": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ViewCSS",
    "MSAttrExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSAttrExtensions",
    "MSStorageExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSStorageExtensions",
    "SVGStyleElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGStyleElement",
    "MSCurrentStyleCSSProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCurrentStyleCSSProperties",
    "MSLinkStyleExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSLinkStyleExtensions",
    "MSHTMLCollectionExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLCollectionExtensions",
    "DOML2DeprecatedWordWrapSuppression_HTMLDivElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLDivElement",
    "DocumentTraversal": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentTraversal",
    "Storage": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Storage",
    "HTMLTableHeaderCellScope": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableHeaderCellScope",
    "HTMLIFrameElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLIFrameElement",
    "MSNavigatorAbilities": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSNavigatorAbilities",
    "TextRangeCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextRangeCollection",
    "HTMLBodyElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBodyElement",
    "DocumentType": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentType",
    "MSHTMLInputElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLInputElementExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLLegendElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLLegendElement",
    "SVGRadialGradientElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGRadialGradientElement",
    "MutationEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MutationEvent",
    "DragEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DragEvent",
    "DOML2DeprecatedWidthStyle_HTMLTableCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLTableCellElement",
    "HTMLTableSectionElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableSectionElement",
    "DOML2DeprecatedListNumberingAndBulletStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedListNumberingAndBulletStyle",
    "HTMLInputElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLInputElement",
    "HTMLAnchorElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLAnchorElement",
    "SVGImageElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGImageElement",
    "MSElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSElementExtensions",
    "HTMLParamElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLParamElement",
    "MSHTMLDocumentViewExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDocumentViewExtensions",
    "SVGAnimatedNumber": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedNumber",
    "PerformanceTiming": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PerformanceTiming",
    "DOML2DeprecatedAlignmentStyle_HTMLInputElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLInputElement",
    "HTMLPreElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLPreElement",
    "EventException": "http://phyzkit.net/docs/lib.d.ts.html#interface%20EventException",
    "MSBorderColorHighlightStyle_HTMLTableCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorHighlightStyle_HTMLTableCellElement",
    "DOMHTMLImplementation": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMHTMLImplementation",
    "NavigatorOnLine": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NavigatorOnLine",
    "SVGElementEventHandlers": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGElementEventHandlers",
    "WindowLocalStorage": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowLocalStorage",
    "SVGMetadataElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGMetadataElement",
    "SVGPathSegArcRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegArcRel",
    "SVGPathSegMovetoAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegMovetoAbs",
    "SVGStringList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGStringList",
    "XDomainRequest": "http://phyzkit.net/docs/lib.d.ts.html#interface%20XDomainRequest",
    "DOML2DeprecatedBackgroundColorStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBackgroundColorStyle",
    "ElementTraversal": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ElementTraversal",
    "SVGLength": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGLength",
    "SVGPolygonElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPolygonElement",
    "HTMLPhraseElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLPhraseElement",
    "MSHTMLAreaElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLAreaElementExtensions",
    "SVGPathSegCurvetoCubicRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoCubicRel",
    "MSEventObj": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSEventObj",
    "SVGTextContentElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTextContentElement",
    "DOML2DeprecatedColorProperty": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedColorProperty",
    "MSHTMLLIElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLLIElementExtensions",
    "HTMLCanvasElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLCanvasElement",
    "HTMLTitleElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTitleElement",
    "Location": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Location",
    "HTMLStyleElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLStyleElement",
    "MSHTMLOptGroupElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLOptGroupElementExtensions",
    "MSBorderColorHighlightStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorHighlightStyle",
    "DOML2DeprecatedSizeProperty_HTMLBaseFontElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedSizeProperty_HTMLBaseFontElement",
    "SVGTransform": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTransform",
    "MSCSSFilter": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSFilter",
    "UIEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20UIEvent",
    "ViewCSS_SVGSVGElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ViewCSS_SVGSVGElement",
    "SVGURIReference": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGURIReference",
    "SVGPathSeg": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSeg",
    "WheelEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WheelEvent",
    "DOML2DeprecatedAlignmentStyle_HTMLDivElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLDivElement",
    "MSEventAttachmentTarget": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSEventAttachmentTarget",
    "SVGNumber": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGNumber",
    "SVGPathElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathElement",
    "MSCompatibleInfo": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCompatibleInfo",
    "MSHTMLDocumentEventExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDocumentEventExtensions",
    "Text": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Text",
    "SVGAnimatedRect": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedRect",
    "CSSNamespaceRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSNamespaceRule",
    "HTMLUnknownElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLUnknownElement",
    "SVGPathSegList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegList",
    "HTMLAudioElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLAudioElement",
    "MSImageResourceExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSImageResourceExtensions",
    "MSBorderColorHighlightStyle_HTMLTableRowElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorHighlightStyle_HTMLTableRowElement",
    "PositionError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PositionError",
    "BrowserPublic": "http://phyzkit.net/docs/lib.d.ts.html#interface%20BrowserPublic",
    "HTMLTableCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableCellElement",
    "MSNamespaceInfoCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSNamespaceInfoCollection",
    "SVGElementInstance": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGElementInstance",
    "MSHTMLUListElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLUListElementExtensions",
    "SVGCircleElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGCircleElement",
    "HTMLBaseFontElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBaseFontElement",
    "CustomEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CustomEvent",
    "CSSImportRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSImportRule",
    "StyleSheetList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20StyleSheetList",
    "HTMLTextAreaElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTextAreaElement",
    "MSHTMLFormElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLFormElementExtensions",
    "DOML2DeprecatedMarginStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle",
    "Geolocation": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Geolocation",
    "MSWindowModeless": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSWindowModeless",
    "HTMLMarqueeElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLMarqueeElement",
    "SVGRect": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGRect",
    "MSNodeExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSNodeExtensions",
    "KeyboardEventExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20KeyboardEventExtensions",
    "History": "http://phyzkit.net/docs/lib.d.ts.html#interface%20History",
    "DocumentStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentStyle",
    "SVGPathSegCurvetoCubicAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoCubicAbs",
    "TimeRanges": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TimeRanges",
    "SVGPathSegCurvetoQuadraticAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticAbs",
    "MSHTMLSelectElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLSelectElementExtensions",
    "CSSRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSRule",
    "SVGPathSegLinetoAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegLinetoAbs",
    "MSMouseEventExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSMouseEventExtensions",
    "HTMLModElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLModElement",
    "DOML2DeprecatedWordWrapSuppression": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression",
    "BeforeUnloadEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20BeforeUnloadEvent",
    "MSPopupWindow": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSPopupWindow",
    "SVGMatrix": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGMatrix",
    "SVGUseElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGUseElement",
    "Event": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Event",
    "ImageData": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ImageData",
    "MSHTMLElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLElementExtensions",
    "HTMLTableColElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableColElement",
    "HTMLDocument": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDocument",
    "SVGException": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGException",
    "DOML2DeprecatedTableCellHeight": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedTableCellHeight",
    "HTMLTableAlignment": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTableAlignment",
    "SVGAnimatedEnumeration": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedEnumeration",
    "SVGLinearGradientElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGLinearGradientElement",
    "DOML2DeprecatedSizeProperty": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedSizeProperty",
    "MSHTMLHeadingElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLHeadingElementExtensions",
    "MSBorderColorStyle_HTMLTableCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorStyle_HTMLTableCellElement",
    "DOML2DeprecatedWidthStyle_HTMLHRElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLHRElement",
    "HTMLUListElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLUListElement",
    "SVGRectElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGRectElement",
    "DOML2DeprecatedBorderStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle",
    "HTMLDivElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDivElement",
    "NavigatorDoNotTrack": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NavigatorDoNotTrack",
    "SVG1_1Properties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVG1_1Properties",
    "NamedNodeMap": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NamedNodeMap",
    "MediaList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MediaList",
    "SVGPathSegCurvetoQuadraticSmoothAbs": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticSmoothAbs",
    "SVGLengthList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGLengthList",
    "SVGPathSegCurvetoCubicSmoothRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegCurvetoCubicSmoothRel",
    "MSWindowExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSWindowExtensions",
    "ProcessingInstruction": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ProcessingInstruction",
    "MSBehaviorUrnsCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBehaviorUrnsCollection",
    "CSSFontFaceRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSFontFaceRule",
    "DOML2DeprecatedBackgroundStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBackgroundStyle",
    "TextEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextEvent",
    "MSHTMLHRElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLHRElementExtensions",
    "AbstractView": "http://phyzkit.net/docs/lib.d.ts.html#interface%20AbstractView",
    "DocumentFragment": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentFragment",
    "DOML2DeprecatedAlignmentStyle_HTMLFieldSetElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLFieldSetElement",
    "SVGPolylineElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPolylineElement",
    "DOML2DeprecatedWidthStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle",
    "DOML2DeprecatedAlignmentStyle_HTMLHeadingElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLHeadingElement",
    "SVGAnimatedPathData": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedPathData",
    "Position": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Position",
    "BookmarkCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20BookmarkCollection",
    "CSSPageRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSPageRule",
    "WindowPerformance": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowPerformance",
    "HTMLBRElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBRElement",
    "MSHTMLDivElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDivElementExtensions",
    "DOML2DeprecatedBorderStyle_HTMLInputElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_HTMLInputElement",
    "HTMLSpanElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLSpanElement",
    "HTMLHRElementDOML2Deprecated": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLHRElementDOML2Deprecated",
    "HTMLHeadElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLHeadElement",
    "NodeFilterCallback": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NodeFilterCallback",
    "HTMLHeadingElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLHeadingElement",
    "HTMLFormElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLFormElement",
    "SVGZoomAndPan": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGZoomAndPan",
    "MSEventExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSEventExtensions",
    "HTMLMediaElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLMediaElement",
    "ElementCSSInlineStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ElementCSSInlineStyle",
    "DOMParser": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMParser",
    "MSMimeTypesCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSMimeTypesCollection",
    "StyleSheet": "http://phyzkit.net/docs/lib.d.ts.html#interface%20StyleSheet",
    "DOML2DeprecatedBorderStyle_HTMLTableElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_HTMLTableElement",
    "DOML2DeprecatedWidthStyle_HTMLAppletElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLAppletElement",
    "SVGTextPathElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGTextPathElement",
    "NodeList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NodeList",
    "HTMLDTElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDTElement",
    "XMLSerializer": "http://phyzkit.net/docs/lib.d.ts.html#interface%20XMLSerializer",
    "StyleSheetPage": "http://phyzkit.net/docs/lib.d.ts.html#interface%20StyleSheetPage",
    "DOML2DeprecatedWordWrapSuppression_HTMLDDElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLDDElement",
    "MSHTMLTableRowElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableRowElementExtensions",
    "SVGGradientElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGGradientElement",
    "DOML2DeprecatedTextFlowControl_HTMLBRElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedTextFlowControl_HTMLBRElement",
    "MSHTMLParagraphElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLParagraphElementExtensions",
    "NodeFilter": "http://phyzkit.net/docs/lib.d.ts.html#interface%20NodeFilter",
    "MSBorderColorStyle_HTMLFrameElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorStyle_HTMLFrameElement",
    "MSHTMLOListElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLOListElementExtensions",
    "DOML2DeprecatedWordWrapSuppression_HTMLDTElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLDTElement",
    "ScreenView": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ScreenView",
    "DOML2DeprecatedMarginStyle_HTMLObjectElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_HTMLObjectElement",
    "DOML2DeprecatedMarginStyle_HTMLInputElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_HTMLInputElement",
    "MSHTMLTableSectionElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableSectionElementExtensions",
    "HTMLFieldSetElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLFieldSetElement",
    "MediaError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MediaError",
    "SVGNumberList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGNumberList",
    "HTMLBGSoundElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBGSoundElement",
    "HTMLElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLElement",
    "Comment": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Comment",
    "CanvasPattern": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CanvasPattern",
    "HTMLHRElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLHRElement",
    "MSHTMLFrameSetElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLFrameSetElementExtensions",
    "DOML2DeprecatedTextFlowControl_HTMLBlockElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedTextFlowControl_HTMLBlockElement",
    "PositionOptions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PositionOptions",
    "HTMLObjectElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLObjectElement",
    "MSHTMLMenuElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLMenuElementExtensions",
    "DocumentView": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentView",
    "StorageEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20StorageEvent",
    "HTMLEmbedElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLEmbedElement",
    "CharacterData": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CharacterData",
    "DOML2DeprecatedAlignmentStyle_HTMLTableSectionElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableSectionElement",
    "HTMLOptGroupElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLOptGroupElement",
    "HTMLIsIndexElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLIsIndexElement",
    "SVGPathSegLinetoRel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPathSegLinetoRel",
    "MSHTMLDocumentSelection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLDocumentSelection",
    "DOMException": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMException",
    "MSCompatibleInfoCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCompatibleInfoCollection",
    "MSHTMLIsIndexElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLIsIndexElementExtensions",
    "SVGAnimatedBoolean": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGAnimatedBoolean",
    "SVGSwitchElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGSwitchElement",
    "MSHTMLIFrameElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLIFrameElementExtensions",
    "SVGPreserveAspectRatio": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGPreserveAspectRatio",
    "Attr": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Attr",
    "MSBorderColorStyle_HTMLTableRowElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBorderColorStyle_HTMLTableRowElement",
    "DOML2DeprecatedAlignmentStyle_HTMLTableCaptionElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableCaptionElement",
    "PerformanceNavigation": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PerformanceNavigation",
    "HTMLBodyElementDOML2Deprecated": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLBodyElementDOML2Deprecated",
    "SVGStopElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGStopElement",
    "PositionCallback": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PositionCallback",
    "SVGSymbolElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGSymbolElement",
    "SVGElementInstanceList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGElementInstanceList",
    "MSDataBindingRecordSetExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSDataBindingRecordSetExtensions",
    "CSSRuleList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSRuleList",
    "MSHTMLTableColElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLTableColElementExtensions",
    "LinkStyle": "http://phyzkit.net/docs/lib.d.ts.html#interface%20LinkStyle",
    "MSHTMLMarqueeElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLMarqueeElementExtensions",
    "HTMLVideoElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLVideoElement",
    "MSXMLHttpRequestExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSXMLHttpRequestExtensions",
    "ClientRectList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ClientRectList",
    "DOML2DeprecatedAlignmentStyle_HTMLTableCellElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableCellElement",
    "SVGMaskElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGMaskElement",
    "MSGestureEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSGestureEvent",
    "ErrorEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ErrorEvent",
    "SVGFilterElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFilterElement",
    "TrackEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TrackEvent",
    "SVGFEMergeNodeElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEMergeNodeElement",
    "SVGFEFloodElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEFloodElement",
    "MSCSSScrollTranslationProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSScrollTranslationProperties",
    "MSGesture": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSGesture",
    "TextTrackCue": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextTrackCue",
    "MSStreamReader": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSStreamReader",
    "CSSFlexibleBoxProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSFlexibleBoxProperties",
    "DOMTokenList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMTokenList",
    "SVGFEFuncAElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEFuncAElement",
    "SVGFETileElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFETileElement",
    "SVGFEBlendElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEBlendElement",
    "MessageChannel": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MessageChannel",
    "SVGFEMergeElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEMergeElement",
    "TransitionEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TransitionEvent",
    "MediaQueryList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MediaQueryList",
    "DOMError": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMError",
    "SVGFEPointLightElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEPointLightElement",
    "CSSFontsProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSFontsProperties",
    "CloseEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CloseEvent",
    "WebSocket": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WebSocket",
    "ProgressEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ProgressEvent",
    "IDBObjectStore": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBObjectStore",
    "ObjectURLOptions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ObjectURLOptions",
    "SVGFEGaussianBlurElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEGaussianBlurElement",
    "MSCSSSelectionBoundaryProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSSelectionBoundaryProperties",
    "SVGFilterPrimitiveStandardAttributes": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFilterPrimitiveStandardAttributes",
    "IDBVersionChangeEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBVersionChangeEvent",
    "IDBIndex": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBIndex",
    "FileList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20FileList",
    "IDBCursor": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBCursor",
    "CSSAnimationsProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSAnimationsProperties",
    "SVGFESpecularLightingElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFESpecularLightingElement",
    "File": "http://phyzkit.net/docs/lib.d.ts.html#interface%20File",
    "URL": "http://phyzkit.net/docs/lib.d.ts.html#interface%20URL",
    "IDBCursorWithValue": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBCursorWithValue",
    "XMLHttpRequestEventTarget": "http://phyzkit.net/docs/lib.d.ts.html#interface%20XMLHttpRequestEventTarget",
    "IDBEnvironment": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBEnvironment",
    "AudioTrackList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20AudioTrackList",
    "MSBaseReader": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBaseReader",
    "MSProtocol": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSProtocol",
    "SVGFEMorphologyElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEMorphologyElement",
    "CSSTransitionsProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSTransitionsProperties",
    "SVGFEFuncRElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEFuncRElement",
    "WindowTimersExtension": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowTimersExtension",
    "SVGFEDisplacementMapElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEDisplacementMapElement",
    "MSCSSContentZoomProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSContentZoomProperties",
    "AnimationEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20AnimationEvent",
    "SVGComponentTransferFunctionElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGComponentTransferFunctionElement",
    "MSRangeCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSRangeCollection",
    "MSCSSPositionedFloatsProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSPositionedFloatsProperties",
    "SVGFEDistantLightElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEDistantLightElement",
    "MSCSSRegionProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSRegionProperties",
    "SVGFEFuncBElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEFuncBElement",
    "IDBKeyRange": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBKeyRange",
    "WindowConsole": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowConsole",
    "IDBTransaction": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBTransaction",
    "AudioTrack": "http://phyzkit.net/docs/lib.d.ts.html#interface%20AudioTrack",
    "SVGFEConvolveMatrixElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEConvolveMatrixElement",
    "TextTrackCueList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextTrackCueList",
    "CSSKeyframesRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSKeyframesRule",
    "MSCSSTouchManipulationProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSTouchManipulationProperties",
    "SVGFETurbulenceElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFETurbulenceElement",
    "TextTrackList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextTrackList",
    "WindowAnimationTiming": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowAnimationTiming",
    "SVGFEFuncGElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEFuncGElement",
    "SVGFEColorMatrixElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEColorMatrixElement",
    "Console": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Console",
    "SVGFESpotLightElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFESpotLightElement",
    "DocumentVisibility": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DocumentVisibility",
    "WindowBase64": "http://phyzkit.net/docs/lib.d.ts.html#interface%20WindowBase64",
    "IDBDatabase": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBDatabase",
    "MSProtocolsCollection": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSProtocolsCollection",
    "DOMStringList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMStringList",
    "CSSMultiColumnProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSMultiColumnProperties",
    "IDBOpenDBRequest": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBOpenDBRequest",
    "HTMLProgressElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLProgressElement",
    "SVGFEOffsetElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEOffsetElement",
    "MSUnsafeFunctionCallback": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSUnsafeFunctionCallback",
    "TextTrack": "http://phyzkit.net/docs/lib.d.ts.html#interface%20TextTrack",
    "MediaQueryListListener": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MediaQueryListListener",
    "IDBRequest": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBRequest",
    "MessagePort": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MessagePort",
    "FileReader": "http://phyzkit.net/docs/lib.d.ts.html#interface%20FileReader",
    "Blob": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Blob",
    "ApplicationCache": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ApplicationCache",
    "MSHTMLVideoElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLVideoElementExtensions",
    "FrameRequestCallback": "http://phyzkit.net/docs/lib.d.ts.html#interface%20FrameRequestCallback",
    "CSS3DTransformsProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSS3DTransformsProperties",
    "PopStateEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20PopStateEvent",
    "CSSKeyframeRule": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSKeyframeRule",
    "CSSGridProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSGridProperties",
    "MSFileSaver": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSFileSaver",
    "MSStream": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSStream",
    "MSBlobBuilder": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSBlobBuilder",
    "MSRangeExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSRangeExtensions",
    "DOMSettableTokenList": "http://phyzkit.net/docs/lib.d.ts.html#interface%20DOMSettableTokenList",
    "IDBFactory": "http://phyzkit.net/docs/lib.d.ts.html#interface%20IDBFactory",
    "MSPointerEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSPointerEvent",
    "CSSTextProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSSTextProperties",
    "CSS2DTransformsProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20CSS2DTransformsProperties",
    "MSCSSHighContrastProperties": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSHighContrastProperties",
    "MSManipulationEvent": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSManipulationEvent",
    "FormData": "http://phyzkit.net/docs/lib.d.ts.html#interface%20FormData",
    "MSHTMLMediaElementExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSHTMLMediaElementExtensions",
    "SVGFEImageElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEImageElement",
    "HTMLDataListElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLDataListElement",
    "AbstractWorker": "http://phyzkit.net/docs/lib.d.ts.html#interface%20AbstractWorker",
    "SVGFECompositeElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFECompositeElement",
    "ValidityState": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ValidityState",
    "HTMLTrackElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20HTMLTrackElement",
    "MSApp": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSApp",
    "SVGFEDiffuseLightingElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEDiffuseLightingElement",
    "SVGFEComponentTransferElement": "http://phyzkit.net/docs/lib.d.ts.html#interface%20SVGFEComponentTransferElement",
    "MSCSSMatrix": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSCSSMatrix",
    "Worker": "http://phyzkit.net/docs/lib.d.ts.html#interface%20Worker",
    "MSMediaErrorExtensions": "http://phyzkit.net/docs/lib.d.ts.html#interface%20MSMediaErrorExtensions",
    "ITextWriter": "http://phyzkit.net/docs/lib.d.ts.html#interface%20ITextWriter"
};
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var marked;
if(!marked) {
    marked = require("./marked");
}
var DTSDoc;
(function (DTSDoc) {
    function emitReserved(b, name) {
        b.span('ts_reserved ts_reserved_' + name, name);
    }
    function emitIdentifier(b, name) {
        b.span('ts_identifier', name);
    }
    function emitSymbol(b, name, symbol) {
        b.span('ts_symbol ts_symbol_' + name, symbol);
    }
    var ASTDoctagSection = (function () {
        function ASTDoctagSection(tag, text) {
            this.tag = tag;
            this.text = text;
        }
        ASTDoctagSection.prototype.build = function (b) {
            var _this = this;
            if(this.tag == 'param') {
                b.dl('ts_param', function () {
                    var arr = /([_a-zA-Z]+)(.*)/.exec(_this.text);
                    if(arr.length >= 2) {
                        b.dt('ts_code ts_param_name', arr[1]);
                    }
                    if(arr.length >= 3) {
                        b.dd('ts_param_description', arr[2]);
                    }
                });
            }
        };
        return ASTDoctagSection;
    })();
    DTSDoc.ASTDoctagSection = ASTDoctagSection;    
    var ASTDocs = (function () {
        function ASTDocs(text, sections) {
            this.text = text;
            this.sections = sections;
        }
        ASTDocs.prototype.build = function (b) {
            var _this = this;
            b.elem('section', 'ts_classmember_description', {
            }, function () {
                if(_this.text) {
                    b.elem('div', '', {
                    }, marked(_this.text));
                }
                var params = _this.sections.filter(function (tag) {
                    return tag.tag === 'param';
                });
                if(params.length > 0) {
                    b.elem('h5', 'ts_parameters', {
                    }, 'Parameters');
                    b.div('', function () {
                        params.forEach(function (s) {
                            s.build(b);
                        });
                    });
                }
            });
        };
        return ASTDocs;
    })();
    DTSDoc.ASTDocs = ASTDocs;    
    var ASTTypeAnnotation = (function () {
        function ASTTypeAnnotation(type) {
            this.type = type;
        }
        ASTTypeAnnotation.prototype.build = function (b, scope) {
            var _this = this;
            b.span('ts_type_annotation', function () {
                emitSymbol(b, 'colon', ':');
                _this.type.build(b, scope);
            });
        };
        return ASTTypeAnnotation;
    })();
    DTSDoc.ASTTypeAnnotation = ASTTypeAnnotation;    
    var ASTParameter = (function () {
        function ASTParameter(isVarLength, name, optional, type) {
            this.isVarLength = isVarLength;
            this.name = name;
            this.optional = optional;
            this.type = type;
        }
        ASTParameter.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                if(_this.isVarLength) {
                    emitSymbol(b, 'dots', '...');
                }
                emitIdentifier(b, _this.name);
                if(_this.optional) {
                    emitSymbol(b, 'question', '?');
                }
                _this.type.build(b, scope);
            });
        };
        return ASTParameter;
    })();
    DTSDoc.ASTParameter = ASTParameter;    
    var ASTParameters = (function () {
        function ASTParameters(params) {
            this.params = params;
        }
        ASTParameters.prototype.build = function (b, scope) {
            var _this = this;
            b.span('ts_params', function () {
                emitSymbol(b, 'leftparenthesis', '(');
                for(var i = 0; i < _this.params.length; i++) {
                    if(i > 0) {
                        emitSymbol(b, 'comma', ',');
                    }
                    _this.params[i].build(b, scope);
                }
                emitSymbol(b, 'rightparenthesis', ')');
            });
        };
        return ASTParameters;
    })();
    DTSDoc.ASTParameters = ASTParameters;    
    var ASTFuncionSignature = (function () {
        function ASTFuncionSignature(params, retType) {
            this.params = params;
            this.retType = retType;
        }
        ASTFuncionSignature.prototype.build = function (b, scope) {
            var _this = this;
            b.span('ts_signiture', function () {
                _this.params.build(b, scope);
                _this.retType.build(b, scope);
            });
        };
        return ASTFuncionSignature;
    })();
    DTSDoc.ASTFuncionSignature = ASTFuncionSignature;    
    var ASTType = (function () {
        function ASTType() { }
        ASTType.prototype.build = function (b, scope) {
        };
        return ASTType;
    })();
    DTSDoc.ASTType = ASTType;    
    var ASTTypeName = (function (_super) {
        __extends(ASTTypeName, _super);
        function ASTTypeName(segments) {
                _super.call(this);
            this.segments = segments;
            this.name = segments[segments.length - 1];
        }
        ASTTypeName.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                if(_this.name == "any" || _this.name == "void") {
                    emitReserved(b, _this.name);
                } else if(primitiveTypeNameLinks[_this.name]) {
                    b.link(primitiveTypeNameLinks[_this.name], _this.name);
                } else {
                    var member = scope.searchType(_this);
                    if(member) {
                        b.link("#" + member.getLinkString(), _this.name);
                    } else if(typeNameLinks[_this.name]) {
                        b.link(typeNameLinks[_this.name], _this.name);
                    } else {
                        b.span('', _this.name);
                    }
                }
            });
        };
        return ASTTypeName;
    })(ASTType);
    DTSDoc.ASTTypeName = ASTTypeName;    
    var ASTArrayType = (function (_super) {
        __extends(ASTArrayType, _super);
        function ASTArrayType(type) {
                _super.call(this);
            this.type = type;
        }
        ASTArrayType.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                _this.type.build(b, scope);
                emitSymbol(b, 'array', '[]');
            });
        };
        return ASTArrayType;
    })(ASTType);
    DTSDoc.ASTArrayType = ASTArrayType;    
    var ASTSpecifingType = (function (_super) {
        __extends(ASTSpecifingType, _super);
        function ASTSpecifingType(members) {
                _super.call(this);
            this.members = members;
        }
        ASTSpecifingType.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                emitSymbol(b, 'leftbrace', '{');
                _this.members.forEach(function (m) {
                    m.build(b, scope);
                    emitSymbol(b, 'semicolon', ';');
                });
                emitSymbol(b, 'rightbrace', '}');
            });
        };
        return ASTSpecifingType;
    })(ASTType);
    DTSDoc.ASTSpecifingType = ASTSpecifingType;    
    var ASTFunctionType = (function (_super) {
        __extends(ASTFunctionType, _super);
        function ASTFunctionType(params, retType) {
                _super.call(this);
            this.params = params;
            this.retType = retType;
        }
        ASTFunctionType.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                _this.params.build(b, scope);
                emitSymbol(b, 'arrow', '=&gt;');
                _this.retType.build(b, scope);
            });
        };
        return ASTFunctionType;
    })(ASTType);
    DTSDoc.ASTFunctionType = ASTFunctionType;    
    var ASTConstructorTypeLiteral = (function (_super) {
        __extends(ASTConstructorTypeLiteral, _super);
        function ASTConstructorTypeLiteral(params, retType) {
                _super.call(this);
            this.params = params;
            this.retType = retType;
        }
        ASTConstructorTypeLiteral.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                emitReserved(b, 'new');
                _this.params.build(b, scope);
                emitSymbol(b, 'arrow', '=&gt;');
                _this.retType.build(b, scope);
            });
        };
        return ASTConstructorTypeLiteral;
    })(ASTType);
    DTSDoc.ASTConstructorTypeLiteral = ASTConstructorTypeLiteral;    
    var ASTModuleMember = (function () {
        function ASTModuleMember(memberKind, name) {
            this.memberKind = memberKind;
            this.name = name;
        }
        ASTModuleMember.prototype.getGlobal = function () {
            return this.parent ? this.parent.getGlobal() : this instanceof ASTModule ? this : null;
        };
        ASTModuleMember.prototype.build = function (b) {
        };
        ASTModuleMember.prototype.getFullName = function () {
            var type = this;
            var n = type.name;
            var mod = type.parent;
            while(mod.parent) {
                n = mod.name + "." + n;
                mod = mod.parent;
            }
            return n;
        };
        ASTModuleMember.prototype.getLinkString = function () {
            return encodeURIComponent(this.memberKind + ' ' + this.getFullName());
        };
        ASTModuleMember.prototype.buildTitle = function (b) {
            var _this = this;
            b.h1("ts_modulemember_title ts_class_title", function () {
                var fullName = _this.getFullName();
                var linkURL = _this.getLinkString();
                b.anchor(linkURL);
                b.link('#' + linkURL, function () {
                    b.span('ts_modulemember_a', _this.memberKind + " " + _this.name);
                });
            });
        };
        return ASTModuleMember;
    })();
    DTSDoc.ASTModuleMember = ASTModuleMember;    
    var ASTClassMember = (function () {
        function ASTClassMember() { }
        ASTClassMember.prototype.buildMember = function (b) {
        };
        return ASTClassMember;
    })();
    DTSDoc.ASTClassMember = ASTClassMember;    
    (function (Accessibility) {
        Accessibility._map = [];
        Accessibility._map[0] = "Public";
        Accessibility.Public = 0;
        Accessibility._map[1] = "Private";
        Accessibility.Private = 1;
    })(DTSDoc.Accessibility || (DTSDoc.Accessibility = {}));
    var Accessibility = DTSDoc.Accessibility;
    ;
    var ASTConstructor = (function (_super) {
        __extends(ASTConstructor, _super);
        function ASTConstructor(params) {
                _super.call(this);
            this.params = params;
        }
        ASTConstructor.prototype.buildMember = function (b) {
            var _this = this;
            b.div("ts_code ts_class_member_title ts_constructor", function () {
                b.anchor(_this.parent.name + "-constructor");
                emitReserved(b, 'constructor');
                _this.params.build(b, _this.parent.parent);
            });
        };
        return ASTConstructor;
    })(ASTClassMember);
    DTSDoc.ASTConstructor = ASTConstructor;    
    var ASTMethod = (function (_super) {
        __extends(ASTMethod, _super);
        function ASTMethod(access, isStatic, name, sign) {
                _super.call(this);
            this.access = access;
            this.isStatic = isStatic;
            this.name = name;
            this.sign = sign;
        }
        ASTMethod.prototype.buildMember = function (b) {
            var _this = this;
            b.div("ts_code ts_class_member_title ts_method", function () {
                b.anchor(_this.parent.name + "-" + _this.name);
                if(_this.isStatic) {
                    emitReserved(b, 'static');
                }
                emitIdentifier(b, _this.name);
                _this.sign.build(b, _this.parent.parent);
            });
        };
        return ASTMethod;
    })(ASTClassMember);
    DTSDoc.ASTMethod = ASTMethod;    
    var ASTField = (function (_super) {
        __extends(ASTField, _super);
        function ASTField(access, isStatic, name, type) {
                _super.call(this);
            this.access = access;
            this.isStatic = isStatic;
            this.name = name;
            this.type = type;
        }
        ASTField.prototype.buildMember = function (b) {
            var _this = this;
            b.div("ts_code ts_class_member_title ts_field", function () {
                b.anchor(_this.parent.name + "-" + _this.name);
                if(_this.isStatic) {
                    emitReserved(b, 'static');
                }
                emitIdentifier(b, _this.name);
                _this.type.build(b, _this.parent.parent);
            });
        };
        return ASTField;
    })(ASTClassMember);
    DTSDoc.ASTField = ASTField;    
    var ASTClass = (function (_super) {
        __extends(ASTClass, _super);
        function ASTClass(name, superClass, interfaces, members) {
                _super.call(this, 'class', name);
            this.superClass = superClass;
            this.interfaces = interfaces;
            this.members = members;
            this.derivedClasses = [];
        }
        ASTClass.prototype.getSuperClass = function () {
            if(this.superClass) {
                var sc = this.parent.searchType(this.superClass);
                if(sc instanceof ASTClass) {
                    return sc;
                }
            }
            return null;
        };
        ASTClass.prototype.updateHierarchy = function () {
            var superClass = this.getSuperClass();
            if(superClass) {
                superClass.derivedClasses.push(this);
            }
        };
        ASTClass.prototype.buildHierarchy = function (b) {
            var _this = this;
            if(this.getSuperClass() || this.derivedClasses.length > 0) {
                b.div("ts_hierarchey", function () {
                    b.link('#' + _this.getLinkString(), _this.name);
                    if(_this.derivedClasses.length > 0) {
                        _this.derivedClasses.map(function (m) {
                            return m.buildHierarchy(b);
                        });
                    }
                });
            }
        };
        ASTClass.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_class", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    if(_this.docs) {
                        b.div("ts_classcontent ts_classdescription", function () {
                            _this.docs.build(b);
                        });
                        b.hr();
                    }
                    if(_this.superClass) {
                        b.h3('Hierarchy');
                        b.div("ts_classcontent ts_classhierarchy", function () {
                            emitIdentifier(b, _this.name);
                            var superClass = _this.getSuperClass();
                            if(superClass) {
                                while(superClass) {
                                    b.span('', " ← ");
                                    b.link("#" + superClass.getLinkString(), superClass.name);
                                    superClass = superClass.getSuperClass();
                                }
                            } else {
                                b.span('', " ← " + _this.superClass.name);
                            }
                        });
                        b.hr();
                    }
                    if(_this.interfaces.length > 0) {
                        b.h3('Implemented Interfaces');
                        b.div("ts_classcontent ts_implementations", function () {
                            for(var i = 0; i < _this.interfaces.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var name = _this.interfaces[i].name;
                                var sc = _this.parent.searchType(new ASTTypeName([
                                    name
                                ]));
                                if(sc instanceof ASTInterface) {
                                    var ifs = sc;
                                    b.link('#' + ifs.getLinkString(), name);
                                } else {
                                    b.span('', name);
                                }
                            }
                        });
                        b.hr();
                    }
                    if(_this.derivedClasses.length > 0) {
                        b.h3('Subclasses');
                        b.div("ts_classcontent ts_classsubclasses", function () {
                            for(var i = 0; i < _this.derivedClasses.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var c = _this.derivedClasses[i];
                                b.link('#' + c.getLinkString(), c.name);
                            }
                        });
                        b.hr();
                    }
                    if(_this.members.length > 0) {
                        b.h3('Members');
                        _this.members.forEach(function (m) {
                            if(m.buildMember) {
                                b.div("ts_classcontent ts_classmember", function () {
                                    m.buildMember(b);
                                    if(m.docs) {
                                        b.div("ts_classmemberdescription", function () {
                                            m.docs.build(b);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
        };
        return ASTClass;
    })(ASTModuleMember);
    DTSDoc.ASTClass = ASTClass;    
    var ASTInterfaceMember = (function () {
        function ASTInterfaceMember() { }
        ASTInterfaceMember.prototype.build = function (b, scope) {
        };
        return ASTInterfaceMember;
    })();
    DTSDoc.ASTInterfaceMember = ASTInterfaceMember;    
    var ASTIIndexer = (function (_super) {
        __extends(ASTIIndexer, _super);
        function ASTIIndexer(name, indexType, retType) {
                _super.call(this);
            this.name = name;
            this.indexType = indexType;
            this.retType = retType;
        }
        ASTIIndexer.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_indexer", function () {
                emitSymbol(b, 'leftbracket', "[");
                emitIdentifier(b, _this.name);
                _this.indexType.build(b, scope);
                emitSymbol(b, 'rightbracket', "]");
                _this.retType.build(b, scope);
            });
        };
        return ASTIIndexer;
    })(ASTInterfaceMember);
    DTSDoc.ASTIIndexer = ASTIIndexer;    
    var ASTIMethod = (function (_super) {
        __extends(ASTIMethod, _super);
        function ASTIMethod(name, isOpt, sign) {
                _super.call(this);
            this.name = name;
            this.isOpt = isOpt;
            this.sign = sign;
        }
        ASTIMethod.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_method'", function () {
                emitIdentifier(b, _this.name);
                if(_this.isOpt) {
                    emitSymbol(b, 'question', '?');
                }
                _this.sign.build(b, scope);
            });
        };
        return ASTIMethod;
    })(ASTInterfaceMember);
    DTSDoc.ASTIMethod = ASTIMethod;    
    var ASTIConstructor = (function (_super) {
        __extends(ASTIConstructor, _super);
        function ASTIConstructor(params, type) {
                _super.call(this);
            this.params = params;
            this.type = type;
        }
        ASTIConstructor.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_constructor", function () {
                emitReserved(b, "new");
                _this.params.build(b, scope);
                _this.type.build(b, scope);
            });
        };
        return ASTIConstructor;
    })(ASTInterfaceMember);
    DTSDoc.ASTIConstructor = ASTIConstructor;    
    var ASTIField = (function (_super) {
        __extends(ASTIField, _super);
        function ASTIField(name, isOptional, type) {
                _super.call(this);
            this.name = name;
            this.isOptional = isOptional;
            this.type = type;
        }
        ASTIField.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code", function () {
                emitIdentifier(b, _this.name);
                if(_this.isOptional) {
                    emitSymbol(b, 'question', "?");
                }
                _this.type.build(b, scope);
            });
        };
        return ASTIField;
    })(ASTInterfaceMember);
    DTSDoc.ASTIField = ASTIField;    
    var ASTIFunction = (function (_super) {
        __extends(ASTIFunction, _super);
        function ASTIFunction(params, retType) {
                _super.call(this);
            this.params = params;
            this.retType = retType;
        }
        ASTIFunction.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_method ts_signiture", function () {
                _this.params.build(b, scope);
                _this.retType.build(b, scope);
            });
        };
        return ASTIFunction;
    })(ASTInterfaceMember);
    DTSDoc.ASTIFunction = ASTIFunction;    
    var ASTInterface = (function (_super) {
        __extends(ASTInterface, _super);
        function ASTInterface(name, interfaces, type) {
                _super.call(this, 'interface', name);
            this.interfaces = interfaces;
            this.type = type;
        }
        ASTInterface.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_interface", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    if(_this.docs) {
                        b.h3('Description');
                        b.div("ts_classcontent ts_classdescription", _this.docs.text);
                    }
                    if(_this.interfaces.length > 0) {
                        b.h3('Extended Interfaces');
                        b.div("ts_classcontent ts_implementations", function () {
                            for(var i = 0; i < _this.interfaces.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var name = _this.interfaces[i].name;
                                var sc = _this.parent.searchType(new ASTTypeName([
                                    name
                                ]));
                                if(sc instanceof ASTInterface) {
                                    var ifs = sc;
                                    b.link('#' + ifs.getLinkString(), name);
                                } else {
                                    b.span('', name);
                                }
                            }
                        });
                        b.hr();
                    }
                    if(_this.type.members.length > 0) {
                        b.h3('Members');
                        _this.type.members.forEach(function (m) {
                            b.div("ts_classcontent ts_classmember ts_class_member_title", function () {
                                m.build(b, _this.parent);
                            });
                            if(m.docs) {
                                m.docs.build(b);
                            }
                        });
                    }
                });
            });
        };
        return ASTInterface;
    })(ASTModuleMember);
    DTSDoc.ASTInterface = ASTInterface;    
    var ASTFunction = (function (_super) {
        __extends(ASTFunction, _super);
        function ASTFunction(name, sign) {
                _super.call(this, 'function', name);
            this.sign = sign;
        }
        ASTFunction.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_function", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code ts_method", function () {
                        emitReserved(b, "function");
                        emitIdentifier(b, _this.name);
                        _this.sign.build(b, _this.parent);
                    });
                });
                if(_this.docs) {
                    _this.docs.build(b);
                }
            });
        };
        return ASTFunction;
    })(ASTModuleMember);
    DTSDoc.ASTFunction = ASTFunction;    
    var ASTCallable = (function (_super) {
        __extends(ASTCallable, _super);
        function ASTCallable(sign) {
                _super.call(this, 'function()', '');
            this.sign = sign;
        }
        ASTCallable.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_function", function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code ts_method", function () {
                        emitReserved(b, "function");
                        _this.sign.build(b, _this.parent);
                    });
                });
            });
        };
        return ASTCallable;
    })(ASTModuleMember);
    DTSDoc.ASTCallable = ASTCallable;    
    var ASTEnum = (function (_super) {
        __extends(ASTEnum, _super);
        function ASTEnum(name, members) {
                _super.call(this, 'enum', name);
            this.members = members;
        }
        ASTEnum.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_enum", function () {
                _this.buildTitle(b);
                if(_this.members.length > 0) {
                    b.h3('Members');
                    _this.members.forEach(function (m) {
                        b.div('ts_classcontent ts_classmember', function () {
                            b.div("ts_code ts_class_member_title ts_method", m);
                        });
                    });
                }
            });
        };
        return ASTEnum;
    })(ASTModuleMember);
    DTSDoc.ASTEnum = ASTEnum;    
    var ASTVar = (function (_super) {
        __extends(ASTVar, _super);
        function ASTVar(name, type) {
                _super.call(this, 'var', name);
            this.type = type;
        }
        ASTVar.prototype.build = function (b) {
            var _this = this;
            b.section('ts_modulemember ts_var', function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code", function () {
                        emitReserved(b, 'var');
                        b.span('', _this.name);
                        _this.type.build(b, _this.parent);
                    });
                    if(_this.docs) {
                        _this.docs.build(b);
                    }
                });
            });
        };
        return ASTVar;
    })(ASTModuleMember);
    DTSDoc.ASTVar = ASTVar;    
    var ASTImport = (function (_super) {
        __extends(ASTImport, _super);
        function ASTImport(alias, moduleName) {
                _super.call(this, 'import', alias);
            this.alias = alias;
            this.moduleName = moduleName;
        }
        return ASTImport;
    })(ASTModuleMember);
    DTSDoc.ASTImport = ASTImport;    
    var ASTModule = (function (_super) {
        __extends(ASTModule, _super);
        function ASTModule(name, members) {
                _super.call(this, 'module', name);
            this.members = members;
        }
        ASTModule.prototype.getMember = function (name) {
            for(var i = 0; i < this.members.length; i++) {
                var member = this.members[i];
                if(member.name == name) {
                    return member;
                }
            }
            return null;
        };
        ASTModule.prototype.searchType = function (typeName) {
            var type;
            this.searchMember(typeName, function (member) {
                if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                    type = member;
                    return false;
                }
 {
                    return true;
                }
            });
            return type;
        };
        ASTModule.prototype.searchMember = function (typeName, filter) {
            function grabType(topMember) {
                if(topMember) {
                    var focused = topMember;
                    for(var i = 1; i < typeName.segments.length && focused; i++) {
                        if(focused instanceof ASTModuleMember) {
                            var m = focused;
                            focused = m.getMember(typeName.segments[i]);
                        } else {
                            return null;
                        }
                    }
                    return focused;
                }
            }
            var prefix = typeName.segments[0];
            for(var scope = this; scope; scope = scope.parent) {
                for(var i = 0; i < scope.members.length; i++) {
                    var member = scope.members[i];
                    if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                        if(member.name == prefix) {
                            var target = grabType(member);
                            if(target) {
                                if(!filter(target)) {
                                    return;
                                }
                            }
                        }
                    }
                    if(member instanceof ASTImport) {
                        var importDecl = member;
                        if(importDecl.alias == prefix) {
                            var target = grabType(importDecl.actualModule);
                            if(target) {
                                if(!filter(target)) {
                                    return;
                                }
                            }
                        }
                    }
                    if(member instanceof ASTModule) {
                        var mod = member;
                        if(mod.name == prefix) {
                            var target = grabType(mod);
                            if(target) {
                                if(!filter(target)) {
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        };
        ASTModule.prototype.updateHierarchy = function () {
            this.members.forEach(function (m) {
                if(m instanceof ASTModule) {
                    (m).updateHierarchy();
                } else if(m instanceof ASTClass) {
                    (m).updateHierarchy();
                }
            });
        };
        ASTModule.prototype.buildHierarchy = function (b) {
            var _this = this;
            b.div('', function () {
                _this.members.forEach(function (m) {
                    if(m instanceof ASTModule) {
                        (m).buildHierarchy(b);
                    } else if(m instanceof ASTClass) {
                        var clazz = m;
                        if(clazz.derivedClasses.length > 0) {
                            clazz.buildHierarchy(b);
                        }
                    }
                });
            });
        };
        ASTModule.prototype.build = function (b) {
            var _this = this;
            b.section('ts_modulemember ts_module', function () {
                _this.buildTitle(b);
                b.section('', function () {
                    if(_this.docs) {
                        b.p("ts_modulemember_description", _this.docs.text);
                    }
                    _this.members.forEach(function (m) {
                        m.build(b);
                    });
                });
            });
        };
        return ASTModule;
    })(ASTModuleMember);
    DTSDoc.ASTModule = ASTModule;    
    var ASTProgram = (function () {
        function ASTProgram(global) {
            this.global = global;
        }
        ASTProgram.prototype.build = function (b) {
            this.global.build(b);
        };
        return ASTProgram;
    })();
    DTSDoc.ASTProgram = ASTProgram;    
    (function (GenerationResultType) {
        GenerationResultType._map = [];
        GenerationResultType.Success = "success";
        GenerationResultType.Fail = "fail";
        GenerationResultType.State = "state";
    })(DTSDoc.GenerationResultType || (DTSDoc.GenerationResultType = {}));
    var GenerationResultType = DTSDoc.GenerationResultType;
    function generateDocument(sourceCode, watcher) {
        var result = DTSDoc.pScript(watcher).parse(new Source(sourceCode, 0));
        if(result.success) {
            var program = result.value;
            var global = program.global;
            var members = global.members;
            var b = new DTSDoc.HTMLBuilder();
            b.div('ts_document', function () {
                b.div('ts_index', function () {
                    b.h1('Index');
                    var currentModule = null;
                    var linkString = null;
                    var moduleEmitted = false;
                    function emitMember(scope) {
                        scope.members.forEach(function (member) {
                            if(member instanceof ASTModule) {
                                if(member.getFullName() != currentModule) {
                                    currentModule = member.getFullName();
                                    linkString = member.getLinkString();
                                    moduleEmitted = false;
                                }
                                emitMember(member);
                            } else {
                                if(currentModule && !moduleEmitted) {
                                    moduleEmitted = true;
                                    b.link('#' + linkString, function () {
                                        b.h2('ts_index_module', currentModule);
                                    });
                                }
                                b.p('ts_index_item', function () {
                                    var symbol = member instanceof ASTClass ? '■' : member instanceof ASTInterface ? '□' : member instanceof ASTVar ? '●' : member instanceof ASTEnum ? '▼' : '◇';
                                    b.link('#' + member.getLinkString(), symbol + " " + member.name);
                                });
                            }
                        });
                    }
                    emitMember(global);
                });
                b.div('ts_index_static', '');
                b.div('ts_content', function () {
                    if(program.docs) {
                        program.docs.build(b);
                    }
                    if(global.docs) {
                        b.p('', function () {
                            global.docs.build(b);
                        });
                    }
                    b.h2('Contents');
                    b.ul("contents", function () {
                        b.li(function () {
                            b.link("#members", 'Members');
                        });
                        b.li(function () {
                            b.link("#hierarchy", 'Class Hierarchy');
                        });
                    });
                    b.anchor("members");
                    b.h2('Members');
                    b.div('', function () {
                        members.map(function (m) {
                            m.build(b);
                        });
                    });
                    b.hr();
                    b.anchor("hierarchy");
                    b.h2('Class Hierarchy');
                    b.div('', function () {
                        global.buildHierarchy(b);
                    });
                    b.hr();
                    b.footer(function () {
                        b.link("https://github.com/kontan/dtsdoc", 'DTSDoc');
                    });
                });
            });
            return {
                "type": GenerationResultType.Success,
                "docs": b.buildString()
            };
        } else {
            var pos = result.source.getPosition();
            var i = result.source.position;
            return {
                "type": GenerationResultType.Fail,
                'line': pos.line,
                'column': pos.column,
                'source': result.source.source.slice(i, i + 128),
                'message': result.errorMesssage
            };
        }
    }
    DTSDoc.generateDocument = generateDocument;
    ;
})(DTSDoc || (DTSDoc = {}));
var DTSDoc;
(function (DTSDoc) {
    var lineComment = regexp(/^\/\/[^\r\n]*(\r\n|\r|\n|$)/m);
    var blockComment = regexp(/^\/(\*(?!\*)|\*\*\*+)([^*]|\r|\n|\*(?!\/))*\*\//m);
    var comment = or(lineComment, blockComment);
    var whitespace = regexp(/^[ \t\r\n]+/m);
    var spaces = many(or(whitespace, comment));
    var logger;
    function lexme(p) {
        return seq(function (s) {
            s(logger);
            var v = s(p);
            s(spaces);
            return v;
        });
    }
    function reserved(s) {
        return new Parsect.Parser("", function (src) {
            return lexme(string(s)).parse(src);
        });
    }
    DTSDoc.reserved = reserved;
    var keyword = function (s) {
        return lexme(regexp(new RegExp('^' + s + '(?!(\\w|_))', '')));
    };
    var colon = reserved(":");
    var semi = reserved(";");
    var comma = reserved(",");
    var period = reserved(".");
    var pExport = optional(reserved("export"));
    var pDeclare = optional(reserved("declare"));
    var pStatic = option(false, map(function () {
        return true;
    }, keyword("static")));
    var pIdentifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
    var pStringRiteral = lexme(regexp(/^(\"[^\"]+\"|\'[^\']+\')/));
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, reserved("private"))));
    var rDocumentComment = /^\/\*(\*(?!\*))((\*(?!\/)|[^*])*)\*\//m;
    var rTags = /^\@([a-z]+)\s+(([^@]|\@(?![a-z]))*)/mg;
    var pDocumentCommentSection = lexme(seq(function (s) {
        var text = s(regexp(rDocumentComment));
        s(whitespace);
        if(s.success()) {
            rDocumentComment.lastIndex = 0;
            var innerText = rDocumentComment.exec(text)[2].split(/\n[ \t]*\*[ ]?/).join('\n');
            var pDescription = /^([^@]|\@(?![a-z]))*/m;
            var arr = pDescription.exec(innerText);
            var description = arr[0];
            rTags.lastIndex = pDescription.lastIndex;
            var tags = [];
            while(rTags.lastIndex < innerText.length) {
                var arr = rTags.exec(innerText);
                if(!arr) {
                    break;
                }
                tags.push(new DTSDoc.ASTDoctagSection(arr[1], arr[2]));
            }
            return new DTSDoc.ASTDocs(description, tags);
        }
    }));
    var pDocumentComment = option(undefined, pDocumentCommentSection);
    var pDocumentComments = many(pDocumentCommentSection);
    var pIdentifierPath = sepBy1(pIdentifier, period);
    DTSDoc.pParameter = seq(function (s) {
        s(pDocumentComment);
        var isVarArg = s(optional(reserved("...")));
        var varName = s(pIdentifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        var typeName = s(option(new DTSDoc.ASTTypeName([
            "any"
        ]), pTypeAnnotation));
        if(s.success()) {
            return new DTSDoc.ASTParameter(isVarArg, varName, opt, typeName);
        }
    });
    var pParameters = between(reserved("("), map(function (ps) {
        return new DTSDoc.ASTParameters(ps);
    }, sepBy(DTSDoc.pParameter, comma)), reserved(")"));
    var pTypeAnnotation = option(new DTSDoc.ASTTypeAnnotation(new DTSDoc.ASTTypeName([
        "any"
    ])), seq(function (s) {
        s(colon);
        s(map(function (t) {
            return new DTSDoc.ASTTypeAnnotation(t);
        }, pType));
    }));
    var pOpt = option(false, map(function () {
        return true;
    }, reserved("?")));
    var pImport = seq(function (s) {
        s(keyword('import'));
        var id = s(pIdentifier);
        s(reserved('='));
        var mod = s(or(trying(series(keyword('module'), between(reserved('('), pStringRiteral, reserved(')')))), pTypeNameLiteral));
        s(reserved(';'));
        if(s.success()) {
            return new DTSDoc.ASTImport(id, mod);
        }
    });
    var pTypeNameLiteral = map(function (n) {
        return new DTSDoc.ASTTypeName(n);
    }, pIdentifierPath);
    var pFunctionTypeLiteral = seq(function (s) {
        var docs = s(pDocumentComment);
        var params = s(pParameters);
        s(reserved("=>"));
        var retType = s(pType);
        if(s.success()) {
            var t = new DTSDoc.ASTFunctionType(params, retType);
            t.docs = docs;
            return t;
        }
    });
    var pConstructorTypeRiteral = Parsect.build(DTSDoc.ASTConstructorTypeLiteral, [
        keyword('new'), 
        pParameters
    ], [
        reserved("=>"), 
        pType
    ]);
    var pSpecifyingTypeMember = seq(function (s) {
        var docs = s(pDocumentComments);
        var member = s(or(pIConstructor, trying(pIMethod), pIField, pIIndexer, pIFunction));
        s(semi);
        if(s.success()) {
            if(docs.length >= 2) {
                console.log("WARNING: Too many document comment at a specifying type member." + s.peek());
            }
            member.docs = docs[docs.length - 1];
            return member;
        }
    });
    var pSpecifyingType = Parsect.build(DTSDoc.ASTSpecifingType, [
        reserved("{"), 
        many(pSpecifyingTypeMember)
    ], [
        reserved("}")
    ]);
    var pType = seq(function (s) {
        var type = s(or(pConstructorTypeRiteral, pTypeNameLiteral, pSpecifyingType, pFunctionTypeLiteral));
        s(many(seq(function (s) {
            s(reserved("["));
            s(reserved("]"));
            if(s.success()) {
                type = new DTSDoc.ASTArrayType(type);
            }
        })));
        return type;
    });
    var pMethodOrField = seq(function (s) {
        var access = s(pAccessibility);
        var isStatic = s(pStatic);
        var name = s(pIdentifier);
        s(or(Parsect.map(function (sig) {
            return new DTSDoc.ASTMethod(access, isStatic, name, sig);
        }, pFunctionSigniture), Parsect.map(function (type) {
            return new DTSDoc.ASTField(access, isStatic, name, type);
        }, pTypeAnnotation)));
    });
    var pConstructor = Parsect.build(DTSDoc.ASTConstructor, [
        keyword("constructor"), 
        pParameters
    ]);
    var pIIndexer = Parsect.build(DTSDoc.ASTIIndexer, [
        reserved("["), 
        pIdentifier
    ], [
        pTypeAnnotation
    ], [
        reserved("]"), 
        pTypeAnnotation
    ]);
    var pClassMember = seq(function (s) {
        var docs = s(pDocumentComments);
        var member = s(or(pConstructor, pMethodOrField, pIIndexer));
        s(semi);
        if(s.success()) {
            if(docs.length >= 2) {
                console.log("WARNING: Too many document comment for a member at: " + s.peek());
            }
            member.docs = docs[docs.length - 1];
            return member;
        }
    });
    DTSDoc.pClass = seq(function (s) {
        s(reserved("class"));
        var name = s(pIdentifier);
        var superClasse = s(option(undefined, seq(function (s) {
            s(reserved("extends"));
            s(pTypeNameLiteral);
        })));
        var interfaces = s(option([], seq(function (s) {
            s(reserved("implements"));
            s(sepBy1(pTypeNameLiteral, comma));
        })));
        s(reserved("{"));
        var members = s(many(pClassMember));
        s(reserved("}"));
        if(s.success()) {
            var clazz = new DTSDoc.ASTClass(name, superClasse, interfaces, members);
            members.forEach(function (m) {
                m.parent = clazz;
            });
            return clazz;
        }
    });
    var pIField = seq(function (s) {
        var name = s(pIdentifier);
        var opt = s(pOpt);
        var type = s(pTypeAnnotation);
        return new DTSDoc.ASTIField(name, opt, type);
    });
    var pIConstructor = seq(function (s) {
        s(keyword("new"));
        var params = s(pParameters);
        var type = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIConstructor(params, type);
        }
    });
    var pIFunction = seq(function (s) {
        var params = s(pParameters);
        var type = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIFunction(params, type);
        }
    });
    var pIMethod = seq(function (s) {
        var methodName = s(pIdentifier);
        var opt = s(pOpt);
        var sig = s(pFunctionSigniture);
        if(s.success()) {
            return new DTSDoc.ASTIMethod(methodName, opt, sig);
        }
    });
    DTSDoc.pInterface = seq(function (s) {
        s(reserved("interface"));
        var name = s(pIdentifier);
        var ifs = s(option([], seq(function (s) {
            s(reserved("extends"));
            s(sepBy1(pTypeNameLiteral, comma));
        })));
        var type = s(pSpecifyingType);
        if(s.success()) {
            return new DTSDoc.ASTInterface(name, ifs, type);
        }
    });
    DTSDoc.pEnum = seq(function (s) {
        s(keyword("enum"));
        var name = s(pIdentifier);
        s(reserved("{"));
        var members = s(or(trying(sepBy(pIdentifier, comma)), endBy(pIdentifier, comma)));
        s(optional(comma));
        s(reserved("}"));
        if(s.success()) {
            return new DTSDoc.ASTEnum(name, members);
        }
    });
    var pFunctionSigniture = seq(function (s) {
        var params = s(pParameters);
        var retType = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTFuncionSignature(params, retType);
        }
    });
    DTSDoc.pFunction = seq(function (s) {
        s(keyword("function"));
        var name = s(pIdentifier);
        var sign = s(pFunctionSigniture);
        s(semi);
        if(s.success()) {
            return new DTSDoc.ASTFunction(name, sign);
        }
    });
    DTSDoc.pVar = seq(function (s) {
        s(keyword("var"));
        var name = s(pIdentifier);
        var typeName = s(pTypeAnnotation);
        s(optional(semi));
        if(s.success()) {
            return new DTSDoc.ASTVar(name, typeName);
        }
    });
    DTSDoc.pCallable = seq(function (s) {
        s(keyword("function"));
        var sign = s(pFunctionSigniture);
        s(semi);
        if(s.success()) {
            return new DTSDoc.ASTCallable(sign);
        }
    });
    DTSDoc.pModule = seq(function (s) {
        s(keyword("module"));
        var tokens = s(or(pIdentifierPath, map(function (s) {
            return [
                s
            ];
        }, pStringRiteral)));
        s(reserved("{"));
        var members = s(pModuleMembers);
        s(reserved("}"));
        if(s.success()) {
            var mod = new DTSDoc.ASTModule(tokens[tokens.length - 1], members);
            members.forEach(function (m) {
                m.parent = mod;
            });
            for(var i = tokens.length - 2; i >= 0; i--) {
                var parent = new DTSDoc.ASTModule(tokens[i], [
                    mod
                ]);
                mod.parent = parent;
                mod = parent;
            }
            return mod;
        }
    });
    DTSDoc.pModuleMember = seq(function (s) {
        var docs = s(pDocumentComment);
        s(pDeclare);
        s(pExport);
        var member = s(or(DTSDoc.pVar, DTSDoc.pModule, DTSDoc.pClass, trying(DTSDoc.pFunction), DTSDoc.pCallable, DTSDoc.pInterface, DTSDoc.pEnum));
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    var pModuleMembers = map(function (ms) {
        return ms.filter(function (m) {
            return m instanceof DTSDoc.ASTModuleMember;
        });
    }, many(or(DTSDoc.pModuleMember, reserved(';'), pImport)));
    function pScript(watcher) {
        return seq(function (s) {
            logger = Parsect.log(function (n) {
                if(watcher) {
                    watcher(n);
                }
            });
            s(lexme(spaces));
            var docs = s(pDocumentComment);
            var members = s(pModuleMembers);
            s(eof);
            if(s.success()) {
                var mod = new DTSDoc.ASTModule("__global__", members);
                members.forEach(function (m) {
                    m.parent = mod;
                });
                mod.updateHierarchy();
                var prog = new DTSDoc.ASTProgram(mod);
                prog.docs = docs;
                prog.global.members.forEach(function (member) {
                    if(member instanceof DTSDoc.ASTImport) {
                        var i = member;
                        prog.global.searchMember(i.moduleName, function (member) {
                            if(member instanceof DTSDoc.ASTModule) {
                                i.actualModule = member;
                                return false;
                            } else {
                                return true;
                            }
                        });
                    }
                });
                return prog;
            }
        });
    }
    DTSDoc.pScript = pScript;
})(DTSDoc || (DTSDoc = {}));
