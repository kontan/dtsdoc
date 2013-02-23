var Parsect;
(function (Parsect) {
    var Parser = (function () {
        function Parser(_name, _parse, _expected) {
            this._name = _name;
            this._parse = _parse;
            this._expected = _expected;
        }
        Object.defineProperty(Parser.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "parse", {
            get: function () {
                var _this = this;
                return function (arg) {
                    return arg instanceof Source ? _this._parse(arg) : _this._parse(new Source(arg));
                };
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "expected", {
            get: function () {
                return this._expected;
            },
            enumerable: true,
            configurable: true
        });
        return Parser;
    })();
    Parsect.Parser = Parser;    
    var State = (function () {
        function State(value, source, success, errorMesssage) {
            if (typeof success === "undefined") { success = true; }
            this._value = value;
            this._source = source instanceof Source ? source : new Source(source);
            this._success = success;
            this._errorMesssage = errorMesssage;
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
        Object.defineProperty(State.prototype, "value", {
            get: function () {
                return this._value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(State.prototype, "source", {
            get: function () {
                return this._source;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(State.prototype, "success", {
            get: function () {
                return this._success;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(State.prototype, "errorMesssage", {
            get: function () {
                return this._errorMesssage;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(State.prototype, "position", {
            get: function () {
                return this.source.position;
            },
            enumerable: true,
            configurable: true
        });
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
        function Source(_source, _position) {
            if (typeof _position === "undefined") { _position = 0; }
            this._source = _source;
            this._position = _position;
            if(_position < 0 || _position > _source.length + 1) {
                throw "_position: out of range: " + _position;
            }
        }
        Object.defineProperty(Source.prototype, "source", {
            get: function () {
                return this._source;
            },
            set: function (v) {
                throw "Source.source is readonly.";
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Source.prototype, "position", {
            get: function () {
                return this._position;
            },
            set: function (v) {
                throw "Source.position is readonly.";
            },
            enumerable: true,
            configurable: true
        });
        Source.prototype.progress = function (delta) {
            return new Source(this.source, this.position + delta);
        };
        Source.prototype.success = function (delta, value) {
            if (typeof delta === "undefined") { delta = 0; }
            if (typeof value === "undefined") { value = undefined; }
            return State.success(new Source(this.source, this.position + delta), value);
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
            return src && this._source === src._source && this._position === src._position;
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
            s.followedBy = function (p) {
                var _st = p.parse(st.source);
                if(!_st.success) {
                    st = st.source.fail('unexpected \"' + _st.source.source.slice(_st.position, _st.position + 1) + '\"');
                }
            };
            s.notFollowedBy = function (p) {
                var _st = p.parse(st.source);
                if(_st.success) {
                    st = st.source.fail('unexpected ' + p.expected);
                }
            };
            s.success = function () {
                return st.success;
            };
            s.source = function (n) {
                if (typeof n === "undefined") { n = 32; }
                return st.source.source.slice(st.source.position, st.source.position + n);
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
        for(var i = 0; i < arguments.length; i++) {
            if(!arguments[i]) {
                throw 'Invalid Argument';
            }
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
        return new Parser("optional", option(undefined, p).parse);
    }
    Parsect.optional = optional;
    function map(f, p) {
        return new Parser("map(" + p.name + ")", function (source) {
            var st = p.parse(source);
            return st.success ? st.source.success(0, f(st.value)) : st;
        });
    }
    Parsect.map = map;
    Parsect.sepBy1 = function (p, sep) {
        return new Parser("sepBy1", seq(function (s) {
            var x = s(p);
            var xs = s(many(series(sep, p)));
            if(s.success()) {
                xs.unshift(x);
                return xs;
            }
        }).parse);
    };
    Parsect.sepBy = function (p, sep) {
        return new Parser("sepBy", or(Parsect.sepBy1(p, sep), map(function () {
            return [];
        }, Parsect.empty)).parse);
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
        return new Parser("endBy", or(Parsect.endBy1(p, sep), Parsect.empty).parse);
    };
    Parsect.between = function (open, p, close) {
        return seq(function (s) {
            s(open);
            var v = s(p);
            s(close);
            return v;
        });
    };
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
    Parsect.spaces = regexp(/^\w*/);
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
        HTMLBuilder.prototype.buildString = function () {
            return this.array.join('');
        };
        return HTMLBuilder;
    })();
    DTSDoc.HTMLBuilder = HTMLBuilder;    
})(DTSDoc || (DTSDoc = {}));
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DTSDoc;
(function (DTSDoc) {
    var ASTDoctagSection = (function () {
        function ASTDoctagSection(tag, text) {
            this.tag = tag;
            this.text = text;
        }
        ASTDoctagSection.prototype.build = function (b) {
            var _this = this;
            if(this.tag == 'param') {
                b.elem('dl', 'ts_param', {
                }, function () {
                    var arr = /([_a-zA-Z]+)(.*)/.exec(_this.text);
                    b.elem('dt', 'ts_code ts_param_name', {
                    }, arr[1]);
                    b.elem('dt', 'ts_param_description', {
                    }, arr[2]);
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
                    b.elem('p', '', {
                    }, _this.text);
                }
                if(_this.sections.length > 0) {
                    b.elem('h5', 'ts_parameters', {
                    }, 'Parameters');
                    b.div('', function () {
                        _this.sections.forEach(function (s) {
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
                b.span('ts_symbol ts_colon', ':');
                _this.type.build(b, scope);
            });
        };
        return ASTTypeAnnotation;
    })();
    DTSDoc.ASTTypeAnnotation = ASTTypeAnnotation;    
    var ASTParameter = (function () {
        function ASTParameter(name, optional, type) {
            this.name = name;
            this.optional = optional;
            this.type = type;
        }
        ASTParameter.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                b.span('', _this.name);
                b.span('ts_symbol ts_colon', ':');
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
                b.span('', '(');
                for(var i = 0; i < _this.params.length; i++) {
                    if(i > 0) {
                        b.span('', ', ');
                    }
                    _this.params[i].build(b, scope);
                }
                b.span('', ')');
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
        function ASTTypeName(names) {
                _super.call(this);
            this.names = names;
            this.name = names[names.length - 1];
        }
        ASTTypeName.prototype.build = function (b, scope) {
            var _this = this;
            b.span('', function () {
                if(_this.name == "any" || _this.name == "void") {
                    b.span('ts_reserved', _this.name);
                } else if(typeNameLinks[_this.name]) {
                    b.link(typeNameLinks[_this.name], _this.name);
                } else {
                    var member = scope.searchType(_this);
                    if(member) {
                        b.link("#" + member.getLinkString(), _this.name);
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
                b.span('', '[]');
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
                b.span('ts_symbol ts_left_brace', '{');
                _this.members.forEach(function (m) {
                    m.build(b, scope);
                    b.span('ts_symbol ts_semi', ';');
                });
                b.span('ts_symbol ts_right_brace', '}');
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
                b.span('ts_symbol ts_arrow', '=&gt;');
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
                b.span("ts_reserved", 'new');
                _this.params.build(b, scope);
                b.span("ts_symbol ts_arrow", '=&gt;');
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
            if(!this.parent) {
                throw "";
            }
            return this.parent.findFullName(this.name);
        };
        ASTModuleMember.prototype.getLinkString = function () {
            return encodeURIComponent(this.memberKind + ' ' + this.getFullName());
        };
        ASTModuleMember.prototype.buildTitle = function (b) {
            var _this = this;
            b.elem('h1', "ts_modulemember_title ts_class_title", {
            }, function () {
                var fullName = _this.getFullName();
                var linkURL = _this.getLinkString();
                b.elem('a', 'ts_modulemember_a', {
                    "name": linkURL,
                    "href": '#' + linkURL
                }, _this.memberKind + " " + _this.name);
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
                b.elem('a', '', {
                    "name": _this.parent.name + "-constructor"
                });
                b.span("ts_reserved ts_reserved_constructor", 'constructor');
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
                    b.span("ts_reserved", 'static');
                }
                b.span('', _this.name);
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
                b.span('', (_this.isStatic ? "static " : "") + _this.name);
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
                var sc = this.parent.findType(this.superClass.name);
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
                        b.div("ts_classcontent ts_classdescription", _this.docs.text);
                        b.hr();
                    }
                    if(_this.superClass) {
                        b.h3('Hierarchy');
                        b.div("ts_classcontent ts_classhierarchy", function () {
                            b.span('', _this.name);
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
                        b.h3('Implementing Interfaces');
                        b.div("ts_classcontent ts_implementations", function () {
                            for(var i = 0; i < _this.interfaces.length; i++) {
                                if(i > 0) {
                                    b.span('', ", ");
                                }
                                var name = _this.interfaces[i].name;
                                var sc = _this.parent.findType(name);
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
                                b.link('#' + c.getFullName(), c.name);
                            }
                        });
                        b.hr();
                    }
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
                b.span('', "[" + _this.name);
                _this.indexType.build(b, scope);
                b.span('', "]");
                _this.retType.build(b, scope);
            });
        };
        return ASTIIndexer;
    })(ASTInterfaceMember);
    DTSDoc.ASTIIndexer = ASTIIndexer;    
    var ASTIMethod = (function (_super) {
        __extends(ASTIMethod, _super);
        function ASTIMethod(name, sign) {
                _super.call(this);
            this.name = name;
            this.sign = sign;
        }
        ASTIMethod.prototype.build = function (b, scope) {
            var _this = this;
            b.span("ts_code ts_method'", function () {
                b.span('', _this.name);
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
                b.span('', "new");
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
                b.span('', _this.name + (_this.isOptional ? "?" : ""));
                _this.type.build(b, scope);
            });
        };
        return ASTIField;
    })(ASTInterfaceMember);
    DTSDoc.ASTIField = ASTIField;    
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
                        b.elem('h3', '', {
                        }, 'Description');
                        b.div("ts_classcontent ts_classdescription", _this.docs.text);
                    }
                    if(_this.type.members.length > 0) {
                        b.elem('h3', '', {
                        }, 'Members');
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
                        b.span('', "function " + _this.name);
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
                        b.span('', "function");
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
        ASTEnum.prototype.getFullName = function () {
            return this.parent.findFullName(this.name);
        };
        ASTEnum.prototype.build = function (b) {
            var _this = this;
            b.section("ts_modulemember ts_enum", function () {
                _this.buildTitle(b);
                if(_this.members.length > 0) {
                    b.elem('h3', '', {
                    }, 'Members');
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
        ASTVar.prototype.toString = function () {
            return this.name;
        };
        ASTVar.prototype.build = function (b) {
            var _this = this;
            b.section('ts_modulemember ts_var', function () {
                _this.buildTitle(b);
                b.section("ts_modulemember_content", function () {
                    b.span("ts_code", function () {
                        b.span("ts_reserved ts_reserved_var", 'var');
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
            var _this = this;
            var topMember = (function (prefix) {
                for(var scope = _this; scope; scope = scope.parent) {
                    for(var i = 0; i < scope.members.length; i++) {
                        var member = scope.members[i];
                        if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                            if(member.name == prefix) {
                                return member;
                            }
                        }
                        if(member instanceof ASTModule) {
                            var mod = member;
                            if(mod.name == prefix) {
                                return mod;
                            }
                        }
                    }
                }
                return null;
            })(typeName.names[0]);
            if(topMember) {
                var focused = topMember;
                for(var i = 1; i < typeName.names.length && focused; i++) {
                    if(focused instanceof ASTModuleMember) {
                        var m = focused;
                        focused = m.getMember(typeName.names[i]);
                    } else {
                        return null;
                    }
                }
                return focused;
            }
            return null;
        };
        ASTModule.prototype.findType = function (name) {
            var splitted = name.split('.');
            if(splitted.length == 1) {
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++) {
                    var member = this.members[i];
                    if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                        if(member.name == targetType) {
                            return member;
                        }
                    }
                }
            } else if(splitted.length > 0) {
                var targetModule = splitted[0];
                for(var i = 0; i < this.members.length; i++) {
                    var member = this.members[i];
                    if(member instanceof ASTModule) {
                        var m = member;
                        if(m.name == targetModule) {
                            var t = this.getTypeFromFullName(splitted.slice(1).join("."));
                            if(t) {
                                return t;
                            }
                        }
                    }
                }
            }
            if(this.parent) {
                return this.parent.findType(name);
            }
            return null;
        };
        ASTModule.prototype.getTypeFromFullName = function (name) {
            var splitted = name.split('.');
            if(splitted.length == 1) {
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++) {
                    var member = this.members[i];
                    if(member instanceof ASTClass || member instanceof ASTInterface || member instanceof ASTEnum) {
                        if(member.name == targetType) {
                            return member;
                        }
                    }
                }
            } else if(splitted.length > 0) {
                var targetModule = splitted[0];
                for(var i = 0; i < this.members.length; i++) {
                    var member = this.members[i];
                    if(member instanceof ASTModule) {
                        var m = member;
                        if(m.name == targetModule) {
                            return this.getTypeFromFullName(splitted.slice(1).join("."));
                        }
                    }
                }
            }
            return null;
        };
        ASTModule.prototype.findFullName = function (name) {
            var type = this.findType(name);
            if(type) {
                var n = type.name;
                var mod = type.parent;
                while(mod.parent) {
                    n = mod.name + "." + n;
                    mod = mod.parent;
                }
                return n;
            } else {
                return name;
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
    function generateDocument(sourceCode, watcher) {
        var result = DTSDoc.pProgram(watcher).parse(new Source(sourceCode, 0));
        if(result.success) {
            var program = result.value;
            var global = program.global;
            var members = global.members;
            var b = new DTSDoc.HTMLBuilder();
            b.div('', function () {
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
                b.elem('footer', '', {
                }, function () {
                    b.link("https://github.com/kontan/dtsdoc", 'DTSDoc');
                });
            });
            return {
                "type": 'success',
                "docs": b.buildString()
            };
        } else {
            var pos = result.source.getPosition();
            return {
                "type": 'fail',
                'line': pos.line,
                'column': pos.column,
                'source': result.source.source.slice(result.source.position, result.source.position + 128),
                'message': result.errorMesssage
            };
        }
    }
    DTSDoc.generateDocument = generateDocument;
    ;
})(DTSDoc || (DTSDoc = {}));
var DTSDoc;
(function (DTSDoc) {
    var lineComment = regexp(/^\/\/[^\n]*(\n|$)/);
    var blockComment = regexp(/^\/\*(?!\*)([^*]|\r|\n|\*(?!\/))*?\*\//m);
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
    DTSDoc.reserved = function (s) {
        return lexme(string(s));
    };
    var keyword = function (s) {
        return lexme(regexp(new RegExp('^' + s + '(?!(\\w|_))', '')));
    };
    var colon = DTSDoc.reserved(":");
    var semi = DTSDoc.reserved(";");
    var comma = DTSDoc.reserved(",");
    var pExport = optional(DTSDoc.reserved("export"));
    var pDeclare = optional(DTSDoc.reserved("declare"));
    var pStatic = option(false, map(function () {
        return true;
    }, keyword("static")));
    var pIdentifierPath = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
    var pIdentifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
    var pStringRiteral = lexme(regexp(/^(\"[^\"]+\"|\'[^\']+\')/));
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, DTSDoc.reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, DTSDoc.reserved("private"))));
    var rDocumentComment = /^\/\*\*((\*(?!\/)|[^*])*)\*\//m;
    var rTags = /^\@([a-z]+)\s+(([^@]|\@(?![a-z]))*)/gm;
    var pDocumentComment = option(undefined, lexme(seq(function (s) {
        var text = s(regexp(rDocumentComment));
        s(whitespace);
        if(s.success()) {
            rDocumentComment.lastIndex = 0;
            var innerText = rDocumentComment.exec(text)[1].split('*').join(' ');
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
    })));
    DTSDoc.pParameter = seq(function (s) {
        var docs = s(pDocumentComment);
        var isVarArg = s(optional(DTSDoc.reserved("...")));
        var varName = s(pIdentifier);
        var opt = s(option(false, map(function () {
            return true;
        }, DTSDoc.reserved("?"))));
        var typeName = s(option(new DTSDoc.ASTTypeName([
            "any"
        ]), pTypeAnnotation));
        if(s.success()) {
            return new DTSDoc.ASTParameter(varName, opt, typeName);
        }
    });
    var pParameters = between(DTSDoc.reserved("("), map(function (ps) {
        return new DTSDoc.ASTParameters(ps);
    }, sepBy(DTSDoc.pParameter, comma)), DTSDoc.reserved(")"));
    var pTypeAnnotation = option(new DTSDoc.ASTTypeAnnotation(new DTSDoc.ASTTypeName([
        "any"
    ])), seq(function (s) {
        s(colon);
        var type = s(pType);
        if(s.success()) {
            return new DTSDoc.ASTTypeAnnotation(type);
        }
    }));
    var pOpt = option(false, map(function () {
        return true;
    }, DTSDoc.reserved("?")));
    var pImport = seq(function (s) {
        s(keyword('import'));
        var id = s(pIdentifier);
        s(DTSDoc.reserved('='));
        var mod = s(or(trying(series(keyword('module'), between(DTSDoc.reserved('('), pStringRiteral, DTSDoc.reserved(')')))), pIdentifierPath));
        s(DTSDoc.reserved(';'));
    });
    var pTypeNameLiteral = lexme(seq(function (s) {
        var name = s(pIdentifier);
        var names = s(many(series(DTSDoc.reserved('.'), pIdentifier)));
        if(s.success()) {
            names.unshift(name);
            return new DTSDoc.ASTTypeName(names);
        }
    }));
    var pFunctionTypeLiteral = seq(function (s) {
        var docs = s(pDocumentComment);
        var params = s(pParameters);
        s(DTSDoc.reserved("=>"));
        var retType = s(pType);
        if(s.success()) {
            var t = new DTSDoc.ASTFunctionType(params, retType);
            t.docs = docs;
            return t;
        }
    });
    var pConstructorTypeRiteral = seq(function (s) {
        s(keyword('new'));
        var params = s(pParameters);
        s(DTSDoc.reserved("=>"));
        var retType = s(pType);
        if(s.success()) {
            return new DTSDoc.ASTConstructorTypeLiteral(params, retType);
        }
    });
    var pSpecifyingTypeMember = seq(function (s) {
        var docs = s(pDocumentComment);
        var member = s(or(pIConstructor, trying(pIMethod), pIField, pIIndexer, pIFunction));
        s(semi);
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    var pSpecifyingType = seq(function (s) {
        s(DTSDoc.reserved("{"));
        var members = s(many(pSpecifyingTypeMember));
        s(DTSDoc.reserved("}"));
        if(s.success()) {
            return new DTSDoc.ASTSpecifingType(members);
        }
    });
    var pType = seq(function (s) {
        var type = s(or(pConstructorTypeRiteral, pTypeNameLiteral, pSpecifyingType, pFunctionTypeLiteral));
        s(many(seq(function (s) {
            s(DTSDoc.reserved("["));
            s(DTSDoc.reserved("]"));
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
        s(or(seq(function (s) {
            var params = s(pParameters);
            var retType = s(pTypeAnnotation);
            if(s.success()) {
                return new DTSDoc.ASTMethod(access, isStatic, name, new DTSDoc.ASTFuncionSignature(params, retType));
            }
        }), seq(function (s) {
            var type = s(pTypeAnnotation);
            if(s.success()) {
                return new DTSDoc.ASTField(access, isStatic, name, type);
            }
        })));
    });
    var pConstructor = seq(function (s) {
        s(keyword("constructor"));
        var params = s(pParameters);
        if(s.success()) {
            return new DTSDoc.ASTConstructor(params);
        }
    });
    var pIIndexer = seq(function (s) {
        s(DTSDoc.reserved("["));
        var name = s(pIdentifier);
        var keyType = s(pTypeAnnotation);
        s(DTSDoc.reserved("]"));
        var valueType = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIIndexer(name, keyType, valueType);
        }
    });
    var pClassMember = seq(function (s) {
        var docs = s(pDocumentComment);
        var member = s(or(pConstructor, pMethodOrField, pIIndexer));
        s(semi);
        if(s.success()) {
            member.docs = docs;
            return member;
        }
    });
    DTSDoc.pClass = seq(function (s) {
        s(DTSDoc.reserved("class"));
        var name = s(pIdentifier);
        var superClasse = s(option(undefined, seq(function (s) {
            s(DTSDoc.reserved("extends"));
            s(pTypeNameLiteral);
        })));
        var interfaces = s(option([], seq(function (s) {
            s(DTSDoc.reserved("implements"));
            s(sepBy1(pTypeNameLiteral, comma));
        })));
        s(DTSDoc.reserved("{"));
        var members = s(many(pClassMember));
        s(DTSDoc.reserved("}"));
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
        var params = s(pParameters);
        var retType = s(pTypeAnnotation);
        if(s.success()) {
            return new DTSDoc.ASTIMethod(methodName, new DTSDoc.ASTFuncionSignature(params, retType));
        }
    });
    DTSDoc.pInterface = seq(function (s) {
        s(DTSDoc.reserved("interface"));
        var name = s(pIdentifier);
        var ifs = s(option([], seq(function (s) {
            s(DTSDoc.reserved("extends"));
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
        s(DTSDoc.reserved("{"));
        var members = s(or(trying(sepBy(pIdentifier, comma)), endBy(pIdentifier, comma)));
        s(optional(comma));
        s(DTSDoc.reserved("}"));
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
        var name = s(or(pIdentifierPath, pStringRiteral));
        s(DTSDoc.reserved("{"));
        var members = s(pModuleMembers);
        s(DTSDoc.reserved("}"));
        if(s.success()) {
            var tokens = name.split('.');
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
    }, many(or(DTSDoc.pModuleMember, DTSDoc.reserved(';'), pImport)));
    function pProgram(watcher) {
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
                var mod = new DTSDoc.ASTModule("(global)", members);
                members.forEach(function (m) {
                    m.parent = mod;
                });
                mod.updateHierarchy();
                var prog = new DTSDoc.ASTProgram(mod);
                prog.docs = docs;
                return prog;
            }
        });
    }
    DTSDoc.pProgram = pProgram;
})(DTSDoc || (DTSDoc = {}));
var typeNameLinks = {
    "string": "lib.d.ts.html#String",
    "bool": "lib.d.ts.html#Boolean",
    "number": "lib.d.ts.html#Number",
    "PropertyDescriptor": "lib.d.ts.html#interface%20PropertyDescriptor",
    "PropertyDescriptorMap": "lib.d.ts.html#interface%20PropertyDescriptorMap",
    "Object": "lib.d.ts.html#interface%20Object",
    "Function": "lib.d.ts.html#interface%20Function",
    "IArguments": "lib.d.ts.html#interface%20IArguments",
    "String": "lib.d.ts.html#interface%20String",
    "Boolean": "lib.d.ts.html#interface%20Boolean",
    "Number": "lib.d.ts.html#interface%20Number",
    "Math": "lib.d.ts.html#interface%20Math",
    "Date": "lib.d.ts.html#interface%20Date",
    "RegExpExecArray": "lib.d.ts.html#interface%20RegExpExecArray",
    "RegExp": "lib.d.ts.html#interface%20RegExp",
    "Error": "lib.d.ts.html#interface%20Error",
    "EvalError": "lib.d.ts.html#interface%20EvalError",
    "RangeError": "lib.d.ts.html#interface%20RangeError",
    "ReferenceError": "lib.d.ts.html#interface%20ReferenceError",
    "SyntaxError": "lib.d.ts.html#interface%20SyntaxError",
    "TypeError": "lib.d.ts.html#interface%20TypeError",
    "URIError": "lib.d.ts.html#interface%20URIError",
    "JSON": "lib.d.ts.html#interface%20JSON",
    "Array": "lib.d.ts.html#interface%20Array",
    "ArrayBuffer": "lib.d.ts.html#interface%20ArrayBuffer",
    "ArrayBufferView": "lib.d.ts.html#interface%20ArrayBufferView",
    "Int8Array": "lib.d.ts.html#interface%20Int8Array",
    "Uint8Array": "lib.d.ts.html#interface%20Uint8Array",
    "Int16Array": "lib.d.ts.html#interface%20Int16Array",
    "Uint16Array": "lib.d.ts.html#interface%20Uint16Array",
    "Int32Array": "lib.d.ts.html#interface%20Int32Array",
    "Uint32Array": "lib.d.ts.html#interface%20Uint32Array",
    "Float32Array": "lib.d.ts.html#interface%20Float32Array",
    "Float64Array": "lib.d.ts.html#interface%20Float64Array",
    "DataView": "lib.d.ts.html#interface%20DataView",
    "NavigatorID": "lib.d.ts.html#interface%20NavigatorID",
    "HTMLTableElement": "lib.d.ts.html#interface%20HTMLTableElement",
    "TreeWalker": "lib.d.ts.html#interface%20TreeWalker",
    "GetSVGDocument": "lib.d.ts.html#interface%20GetSVGDocument",
    "HTMLHtmlElementDOML2Deprecated": "lib.d.ts.html#interface%20HTMLHtmlElementDOML2Deprecated",
    "SVGPathSegCurvetoQuadraticRel": "lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticRel",
    "Performance": "lib.d.ts.html#interface%20Performance",
    "SVGSVGElementEventHandlers": "lib.d.ts.html#interface%20SVGSVGElementEventHandlers",
    "MSDataBindingTableExtensions": "lib.d.ts.html#interface%20MSDataBindingTableExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLParagraphElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLParagraphElement",
    "CompositionEvent": "lib.d.ts.html#interface%20CompositionEvent",
    "SVGMarkerElement": "lib.d.ts.html#interface%20SVGMarkerElement",
    "WindowTimers": "lib.d.ts.html#interface%20WindowTimers",
    "CSSStyleDeclaration": "lib.d.ts.html#interface%20CSSStyleDeclaration",
    "SVGGElement": "lib.d.ts.html#interface%20SVGGElement",
    "MSStyleCSSProperties": "lib.d.ts.html#interface%20MSStyleCSSProperties",
    "MSCSSStyleSheetExtensions": "lib.d.ts.html#interface%20MSCSSStyleSheetExtensions",
    "Navigator": "lib.d.ts.html#interface%20Navigator",
    "SVGPathSegCurvetoCubicSmoothAbs": "lib.d.ts.html#interface%20SVGPathSegCurvetoCubicSmoothAbs",
    "MSBorderColorStyle_HTMLFrameSetElement": "lib.d.ts.html#interface%20MSBorderColorStyle_HTMLFrameSetElement",
    "SVGZoomEvent": "lib.d.ts.html#interface%20SVGZoomEvent",
    "NodeSelector": "lib.d.ts.html#interface%20NodeSelector",
    "HTMLTableDataCellElement": "lib.d.ts.html#interface%20HTMLTableDataCellElement",
    "MSHTMLDirectoryElementExtensions": "lib.d.ts.html#interface%20MSHTMLDirectoryElementExtensions",
    "HTMLBaseElement": "lib.d.ts.html#interface%20HTMLBaseElement",
    "ClientRect": "lib.d.ts.html#interface%20ClientRect",
    "PositionErrorCallback": "lib.d.ts.html#interface%20PositionErrorCallback",
    "DOMImplementation": "lib.d.ts.html#interface%20DOMImplementation",
    "DOML2DeprecatedWidthStyle_HTMLBlockElement": "lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLBlockElement",
    "SVGUnitTypes": "lib.d.ts.html#interface%20SVGUnitTypes",
    "DocumentRange": "lib.d.ts.html#interface%20DocumentRange",
    "MSHTMLDocumentExtensions": "lib.d.ts.html#interface%20MSHTMLDocumentExtensions",
    "CSS2Properties": "lib.d.ts.html#interface%20CSS2Properties",
    "MSImageResourceExtensions_HTMLInputElement": "lib.d.ts.html#interface%20MSImageResourceExtensions_HTMLInputElement",
    "MSHTMLEmbedElementExtensions": "lib.d.ts.html#interface%20MSHTMLEmbedElementExtensions",
    "MSHTMLModElementExtensions": "lib.d.ts.html#interface%20MSHTMLModElementExtensions",
    "Element": "lib.d.ts.html#interface%20Element",
    "SVGDocument": "lib.d.ts.html#interface%20SVGDocument",
    "HTMLNextIdElement": "lib.d.ts.html#interface%20HTMLNextIdElement",
    "SVGPathSegMovetoRel": "lib.d.ts.html#interface%20SVGPathSegMovetoRel",
    "SVGLineElement": "lib.d.ts.html#interface%20SVGLineElement",
    "HTMLParagraphElement": "lib.d.ts.html#interface%20HTMLParagraphElement",
    "MSHTMLTextAreaElementExtensions": "lib.d.ts.html#interface%20MSHTMLTextAreaElementExtensions",
    "ErrorFunction": "lib.d.ts.html#interface%20ErrorFunction",
    "HTMLAreasCollection": "lib.d.ts.html#interface%20HTMLAreasCollection",
    "SVGDescElement": "lib.d.ts.html#interface%20SVGDescElement",
    "Node": "lib.d.ts.html#interface%20Node",
    "MSHTMLLegendElementExtensions": "lib.d.ts.html#interface%20MSHTMLLegendElementExtensions",
    "MSCSSStyleDeclarationExtensions": "lib.d.ts.html#interface%20MSCSSStyleDeclarationExtensions",
    "SVGPathSegCurvetoQuadraticSmoothRel": "lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticSmoothRel",
    "DOML2DeprecatedAlignmentStyle_HTMLTableRowElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableRowElement",
    "DOML2DeprecatedBorderStyle_HTMLObjectElement": "lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_HTMLObjectElement",
    "MSHTMLSpanElementExtensions": "lib.d.ts.html#interface%20MSHTMLSpanElementExtensions",
    "MSHTMLObjectElementExtensions": "lib.d.ts.html#interface%20MSHTMLObjectElementExtensions",
    "DOML2DeprecatedListSpaceReduction": "lib.d.ts.html#interface%20DOML2DeprecatedListSpaceReduction",
    "CSS3Properties": "lib.d.ts.html#interface%20CSS3Properties",
    "MSScriptHost": "lib.d.ts.html#interface%20MSScriptHost",
    "SVGClipPathElement": "lib.d.ts.html#interface%20SVGClipPathElement",
    "MouseEvent": "lib.d.ts.html#interface%20MouseEvent",
    "DOML2DeprecatedAlignmentStyle_HTMLTableElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableElement",
    "RangeException": "lib.d.ts.html#interface%20RangeException",
    "DOML2DeprecatedAlignmentStyle_HTMLHRElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLHRElement",
    "SVGTextPositioningElement": "lib.d.ts.html#interface%20SVGTextPositioningElement",
    "HTMLAppletElement": "lib.d.ts.html#interface%20HTMLAppletElement",
    "MSHTMLFieldSetElementExtensions": "lib.d.ts.html#interface%20MSHTMLFieldSetElementExtensions",
    "DocumentEvent": "lib.d.ts.html#interface%20DocumentEvent",
    "MSHTMLUnknownElementExtensions": "lib.d.ts.html#interface%20MSHTMLUnknownElementExtensions",
    "TextMetrics": "lib.d.ts.html#interface%20TextMetrics",
    "DOML2DeprecatedWordWrapSuppression_HTMLBodyElement": "lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLBodyElement",
    "HTMLOListElement": "lib.d.ts.html#interface%20HTMLOListElement",
    "MSHTMLTableCaptionElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableCaptionElementExtensions",
    "SVGAnimatedString": "lib.d.ts.html#interface%20SVGAnimatedString",
    "SVGPathSegLinetoVerticalRel": "lib.d.ts.html#interface%20SVGPathSegLinetoVerticalRel",
    "CDATASection": "lib.d.ts.html#interface%20CDATASection",
    "StyleMedia": "lib.d.ts.html#interface%20StyleMedia",
    "TextRange": "lib.d.ts.html#interface%20TextRange",
    "HTMLSelectElement": "lib.d.ts.html#interface%20HTMLSelectElement",
    "CSSStyleSheet": "lib.d.ts.html#interface%20CSSStyleSheet",
    "HTMLBlockElement": "lib.d.ts.html#interface%20HTMLBlockElement",
    "SVGTests": "lib.d.ts.html#interface%20SVGTests",
    "MSSelection": "lib.d.ts.html#interface%20MSSelection",
    "MSHTMLDListElementExtensions": "lib.d.ts.html#interface%20MSHTMLDListElementExtensions",
    "HTMLMetaElement": "lib.d.ts.html#interface%20HTMLMetaElement",
    "Selection": "lib.d.ts.html#interface%20Selection",
    "SVGAnimatedAngle": "lib.d.ts.html#interface%20SVGAnimatedAngle",
    "SVGPatternElement": "lib.d.ts.html#interface%20SVGPatternElement",
    "SVGScriptElement": "lib.d.ts.html#interface%20SVGScriptElement",
    "HTMLDDElement": "lib.d.ts.html#interface%20HTMLDDElement",
    "NodeIterator": "lib.d.ts.html#interface%20NodeIterator",
    "CSSStyleRule": "lib.d.ts.html#interface%20CSSStyleRule",
    "MSDataBindingRecordSetReadonlyExtensions": "lib.d.ts.html#interface%20MSDataBindingRecordSetReadonlyExtensions",
    "HTMLLinkElement": "lib.d.ts.html#interface%20HTMLLinkElement",
    "SVGViewElement": "lib.d.ts.html#interface%20SVGViewElement",
    "MSHTMLAppletElementExtensions": "lib.d.ts.html#interface%20MSHTMLAppletElementExtensions",
    "SVGLocatable": "lib.d.ts.html#interface%20SVGLocatable",
    "HTMLFontElement": "lib.d.ts.html#interface%20HTMLFontElement",
    "MSHTMLTableElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableElementExtensions",
    "SVGTitleElement": "lib.d.ts.html#interface%20SVGTitleElement",
    "ControlRangeCollection": "lib.d.ts.html#interface%20ControlRangeCollection",
    "DOML2DeprecatedAlignmentStyle_HTMLImageElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLImageElement",
    "MSHTMLFrameElementExtensions": "lib.d.ts.html#interface%20MSHTMLFrameElementExtensions",
    "MSNamespaceInfo": "lib.d.ts.html#interface%20MSNamespaceInfo",
    "WindowSessionStorage": "lib.d.ts.html#interface%20WindowSessionStorage",
    "SVGAnimatedTransformList": "lib.d.ts.html#interface%20SVGAnimatedTransformList",
    "HTMLTableCaptionElement": "lib.d.ts.html#interface%20HTMLTableCaptionElement",
    "HTMLOptionElement": "lib.d.ts.html#interface%20HTMLOptionElement",
    "HTMLMapElement": "lib.d.ts.html#interface%20HTMLMapElement",
    "HTMLMenuElement": "lib.d.ts.html#interface%20HTMLMenuElement",
    "MouseWheelEvent": "lib.d.ts.html#interface%20MouseWheelEvent",
    "SVGFitToViewBox": "lib.d.ts.html#interface%20SVGFitToViewBox",
    "MSHTMLAnchorElementExtensions": "lib.d.ts.html#interface%20MSHTMLAnchorElementExtensions",
    "SVGPointList": "lib.d.ts.html#interface%20SVGPointList",
    "MSElementCSSInlineStyleExtensions": "lib.d.ts.html#interface%20MSElementCSSInlineStyleExtensions",
    "SVGAnimatedLengthList": "lib.d.ts.html#interface%20SVGAnimatedLengthList",
    "MSHTMLTableDataCellElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableDataCellElementExtensions",
    "Window": "lib.d.ts.html#interface%20Window",
    "SVGAnimatedPreserveAspectRatio": "lib.d.ts.html#interface%20SVGAnimatedPreserveAspectRatio",
    "MSSiteModeEvent": "lib.d.ts.html#interface%20MSSiteModeEvent",
    "MSCSSStyleRuleExtensions": "lib.d.ts.html#interface%20MSCSSStyleRuleExtensions",
    "StyleSheetPageList": "lib.d.ts.html#interface%20StyleSheetPageList",
    "HTMLCollection": "lib.d.ts.html#interface%20HTMLCollection",
    "MSCSSProperties": "lib.d.ts.html#interface%20MSCSSProperties",
    "HTMLImageElement": "lib.d.ts.html#interface%20HTMLImageElement",
    "HTMLAreaElement": "lib.d.ts.html#interface%20HTMLAreaElement",
    "EventTarget": "lib.d.ts.html#interface%20EventTarget",
    "SVGAngle": "lib.d.ts.html#interface%20SVGAngle",
    "HTMLButtonElement": "lib.d.ts.html#interface%20HTMLButtonElement",
    "MSHTMLLabelElementExtensions": "lib.d.ts.html#interface%20MSHTMLLabelElementExtensions",
    "HTMLSourceElement": "lib.d.ts.html#interface%20HTMLSourceElement",
    "CanvasGradient": "lib.d.ts.html#interface%20CanvasGradient",
    "KeyboardEvent": "lib.d.ts.html#interface%20KeyboardEvent",
    "Document": "lib.d.ts.html#interface%20Document",
    "MessageEvent": "lib.d.ts.html#interface%20MessageEvent",
    "SVGElement": "lib.d.ts.html#interface%20SVGElement",
    "HTMLScriptElement": "lib.d.ts.html#interface%20HTMLScriptElement",
    "MSHTMLBodyElementExtensions": "lib.d.ts.html#interface%20MSHTMLBodyElementExtensions",
    "HTMLTableRowElement": "lib.d.ts.html#interface%20HTMLTableRowElement",
    "MSCommentExtensions": "lib.d.ts.html#interface%20MSCommentExtensions",
    "DOML2DeprecatedMarginStyle_HTMLMarqueeElement": "lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_HTMLMarqueeElement",
    "MSCSSRuleList": "lib.d.ts.html#interface%20MSCSSRuleList",
    "CanvasRenderingContext2D": "lib.d.ts.html#interface%20CanvasRenderingContext2D",
    "SVGPathSegLinetoHorizontalAbs": "lib.d.ts.html#interface%20SVGPathSegLinetoHorizontalAbs",
    "DOML2DeprecatedAlignmentStyle_HTMLObjectElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLObjectElement",
    "DOML2DeprecatedBorderStyle_MSHTMLIFrameElementExtensions": "lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_MSHTMLIFrameElementExtensions",
    "MSHTMLElementRangeExtensions": "lib.d.ts.html#interface%20MSHTMLElementRangeExtensions",
    "SVGPathSegArcAbs": "lib.d.ts.html#interface%20SVGPathSegArcAbs",
    "MSScreenExtensions": "lib.d.ts.html#interface%20MSScreenExtensions",
    "HTMLHtmlElement": "lib.d.ts.html#interface%20HTMLHtmlElement",
    "MSBorderColorStyle": "lib.d.ts.html#interface%20MSBorderColorStyle",
    "SVGTransformList": "lib.d.ts.html#interface%20SVGTransformList",
    "SVGPathSegClosePath": "lib.d.ts.html#interface%20SVGPathSegClosePath",
    "DOML2DeprecatedMarginStyle_MSHTMLIFrameElementExtensions": "lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_MSHTMLIFrameElementExtensions",
    "HTMLFrameElement": "lib.d.ts.html#interface%20HTMLFrameElement",
    "SVGAnimatedLength": "lib.d.ts.html#interface%20SVGAnimatedLength",
    "CSSMediaRule": "lib.d.ts.html#interface%20CSSMediaRule",
    "HTMLQuoteElement": "lib.d.ts.html#interface%20HTMLQuoteElement",
    "SVGDefsElement": "lib.d.ts.html#interface%20SVGDefsElement",
    "SVGAnimatedPoints": "lib.d.ts.html#interface%20SVGAnimatedPoints",
    "WindowModal": "lib.d.ts.html#interface%20WindowModal",
    "MSHTMLButtonElementExtensions": "lib.d.ts.html#interface%20MSHTMLButtonElementExtensions",
    "XMLHttpRequest": "lib.d.ts.html#interface%20XMLHttpRequest",
    "HTMLTableHeaderCellElement": "lib.d.ts.html#interface%20HTMLTableHeaderCellElement",
    "HTMLDListElement": "lib.d.ts.html#interface%20HTMLDListElement",
    "MSDataBindingExtensions": "lib.d.ts.html#interface%20MSDataBindingExtensions",
    "SVGEllipseElement": "lib.d.ts.html#interface%20SVGEllipseElement",
    "SVGPathSegLinetoHorizontalRel": "lib.d.ts.html#interface%20SVGPathSegLinetoHorizontalRel",
    "SVGAElement": "lib.d.ts.html#interface%20SVGAElement",
    "MSHTMLMetaElementExtensions": "lib.d.ts.html#interface%20MSHTMLMetaElementExtensions",
    "SVGStylable": "lib.d.ts.html#interface%20SVGStylable",
    "MSHTMLTableCellElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableCellElementExtensions",
    "HTMLFrameSetElement": "lib.d.ts.html#interface%20HTMLFrameSetElement",
    "SVGTransformable": "lib.d.ts.html#interface%20SVGTransformable",
    "Screen": "lib.d.ts.html#interface%20Screen",
    "NavigatorGeolocation": "lib.d.ts.html#interface%20NavigatorGeolocation",
    "Coordinates": "lib.d.ts.html#interface%20Coordinates",
    "DOML2DeprecatedAlignmentStyle_HTMLTableColElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableColElement",
    "EventListener": "lib.d.ts.html#interface%20EventListener",
    "SVGLangSpace": "lib.d.ts.html#interface%20SVGLangSpace",
    "DataTransfer": "lib.d.ts.html#interface%20DataTransfer",
    "FocusEvent": "lib.d.ts.html#interface%20FocusEvent",
    "Range": "lib.d.ts.html#interface%20Range",
    "MSHTMLPreElementExtensions": "lib.d.ts.html#interface%20MSHTMLPreElementExtensions",
    "SVGPoint": "lib.d.ts.html#interface%20SVGPoint",
    "MSPluginsCollection": "lib.d.ts.html#interface%20MSPluginsCollection",
    "MSHTMLFontElementExtensions": "lib.d.ts.html#interface%20MSHTMLFontElementExtensions",
    "SVGAnimatedNumberList": "lib.d.ts.html#interface%20SVGAnimatedNumberList",
    "SVGSVGElement": "lib.d.ts.html#interface%20SVGSVGElement",
    "HTMLLabelElement": "lib.d.ts.html#interface%20HTMLLabelElement",
    "MSResourceMetadata": "lib.d.ts.html#interface%20MSResourceMetadata",
    "MSHTMLQuoteElementExtensions": "lib.d.ts.html#interface%20MSHTMLQuoteElementExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLIFrameElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLIFrameElement",
    "HTMLLegendElement": "lib.d.ts.html#interface%20HTMLLegendElement",
    "HTMLDirectoryElement": "lib.d.ts.html#interface%20HTMLDirectoryElement",
    "NavigatorAbilities": "lib.d.ts.html#interface%20NavigatorAbilities",
    "MSHTMLImageElementExtensions": "lib.d.ts.html#interface%20MSHTMLImageElementExtensions",
    "SVGAnimatedInteger": "lib.d.ts.html#interface%20SVGAnimatedInteger",
    "SVGTextElement": "lib.d.ts.html#interface%20SVGTextElement",
    "SVGTSpanElement": "lib.d.ts.html#interface%20SVGTSpanElement",
    "HTMLLIElement": "lib.d.ts.html#interface%20HTMLLIElement",
    "SVGPathSegLinetoVerticalAbs": "lib.d.ts.html#interface%20SVGPathSegLinetoVerticalAbs",
    "ViewCSS": "lib.d.ts.html#interface%20ViewCSS",
    "MSAttrExtensions": "lib.d.ts.html#interface%20MSAttrExtensions",
    "MSStorageExtensions": "lib.d.ts.html#interface%20MSStorageExtensions",
    "SVGStyleElement": "lib.d.ts.html#interface%20SVGStyleElement",
    "MSCurrentStyleCSSProperties": "lib.d.ts.html#interface%20MSCurrentStyleCSSProperties",
    "MSLinkStyleExtensions": "lib.d.ts.html#interface%20MSLinkStyleExtensions",
    "MSHTMLCollectionExtensions": "lib.d.ts.html#interface%20MSHTMLCollectionExtensions",
    "DOML2DeprecatedWordWrapSuppression_HTMLDivElement": "lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLDivElement",
    "DocumentTraversal": "lib.d.ts.html#interface%20DocumentTraversal",
    "Storage": "lib.d.ts.html#interface%20Storage",
    "HTMLTableHeaderCellScope": "lib.d.ts.html#interface%20HTMLTableHeaderCellScope",
    "HTMLIFrameElement": "lib.d.ts.html#interface%20HTMLIFrameElement",
    "MSNavigatorAbilities": "lib.d.ts.html#interface%20MSNavigatorAbilities",
    "TextRangeCollection": "lib.d.ts.html#interface%20TextRangeCollection",
    "HTMLBodyElement": "lib.d.ts.html#interface%20HTMLBodyElement",
    "DocumentType": "lib.d.ts.html#interface%20DocumentType",
    "MSHTMLInputElementExtensions": "lib.d.ts.html#interface%20MSHTMLInputElementExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLLegendElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLLegendElement",
    "SVGRadialGradientElement": "lib.d.ts.html#interface%20SVGRadialGradientElement",
    "MutationEvent": "lib.d.ts.html#interface%20MutationEvent",
    "DragEvent": "lib.d.ts.html#interface%20DragEvent",
    "DOML2DeprecatedWidthStyle_HTMLTableCellElement": "lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLTableCellElement",
    "HTMLTableSectionElement": "lib.d.ts.html#interface%20HTMLTableSectionElement",
    "DOML2DeprecatedListNumberingAndBulletStyle": "lib.d.ts.html#interface%20DOML2DeprecatedListNumberingAndBulletStyle",
    "HTMLInputElement": "lib.d.ts.html#interface%20HTMLInputElement",
    "HTMLAnchorElement": "lib.d.ts.html#interface%20HTMLAnchorElement",
    "SVGImageElement": "lib.d.ts.html#interface%20SVGImageElement",
    "MSElementExtensions": "lib.d.ts.html#interface%20MSElementExtensions",
    "HTMLParamElement": "lib.d.ts.html#interface%20HTMLParamElement",
    "MSHTMLDocumentViewExtensions": "lib.d.ts.html#interface%20MSHTMLDocumentViewExtensions",
    "SVGAnimatedNumber": "lib.d.ts.html#interface%20SVGAnimatedNumber",
    "PerformanceTiming": "lib.d.ts.html#interface%20PerformanceTiming",
    "DOML2DeprecatedAlignmentStyle_HTMLInputElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLInputElement",
    "HTMLPreElement": "lib.d.ts.html#interface%20HTMLPreElement",
    "EventException": "lib.d.ts.html#interface%20EventException",
    "MSBorderColorHighlightStyle_HTMLTableCellElement": "lib.d.ts.html#interface%20MSBorderColorHighlightStyle_HTMLTableCellElement",
    "DOMHTMLImplementation": "lib.d.ts.html#interface%20DOMHTMLImplementation",
    "NavigatorOnLine": "lib.d.ts.html#interface%20NavigatorOnLine",
    "SVGElementEventHandlers": "lib.d.ts.html#interface%20SVGElementEventHandlers",
    "WindowLocalStorage": "lib.d.ts.html#interface%20WindowLocalStorage",
    "SVGMetadataElement": "lib.d.ts.html#interface%20SVGMetadataElement",
    "SVGPathSegArcRel": "lib.d.ts.html#interface%20SVGPathSegArcRel",
    "SVGPathSegMovetoAbs": "lib.d.ts.html#interface%20SVGPathSegMovetoAbs",
    "SVGStringList": "lib.d.ts.html#interface%20SVGStringList",
    "XDomainRequest": "lib.d.ts.html#interface%20XDomainRequest",
    "DOML2DeprecatedBackgroundColorStyle": "lib.d.ts.html#interface%20DOML2DeprecatedBackgroundColorStyle",
    "ElementTraversal": "lib.d.ts.html#interface%20ElementTraversal",
    "SVGLength": "lib.d.ts.html#interface%20SVGLength",
    "SVGPolygonElement": "lib.d.ts.html#interface%20SVGPolygonElement",
    "HTMLPhraseElement": "lib.d.ts.html#interface%20HTMLPhraseElement",
    "MSHTMLAreaElementExtensions": "lib.d.ts.html#interface%20MSHTMLAreaElementExtensions",
    "SVGPathSegCurvetoCubicRel": "lib.d.ts.html#interface%20SVGPathSegCurvetoCubicRel",
    "MSEventObj": "lib.d.ts.html#interface%20MSEventObj",
    "SVGTextContentElement": "lib.d.ts.html#interface%20SVGTextContentElement",
    "DOML2DeprecatedColorProperty": "lib.d.ts.html#interface%20DOML2DeprecatedColorProperty",
    "MSHTMLLIElementExtensions": "lib.d.ts.html#interface%20MSHTMLLIElementExtensions",
    "HTMLCanvasElement": "lib.d.ts.html#interface%20HTMLCanvasElement",
    "HTMLTitleElement": "lib.d.ts.html#interface%20HTMLTitleElement",
    "Location": "lib.d.ts.html#interface%20Location",
    "HTMLStyleElement": "lib.d.ts.html#interface%20HTMLStyleElement",
    "MSHTMLOptGroupElementExtensions": "lib.d.ts.html#interface%20MSHTMLOptGroupElementExtensions",
    "MSBorderColorHighlightStyle": "lib.d.ts.html#interface%20MSBorderColorHighlightStyle",
    "DOML2DeprecatedSizeProperty_HTMLBaseFontElement": "lib.d.ts.html#interface%20DOML2DeprecatedSizeProperty_HTMLBaseFontElement",
    "SVGTransform": "lib.d.ts.html#interface%20SVGTransform",
    "MSCSSFilter": "lib.d.ts.html#interface%20MSCSSFilter",
    "UIEvent": "lib.d.ts.html#interface%20UIEvent",
    "ViewCSS_SVGSVGElement": "lib.d.ts.html#interface%20ViewCSS_SVGSVGElement",
    "SVGURIReference": "lib.d.ts.html#interface%20SVGURIReference",
    "SVGPathSeg": "lib.d.ts.html#interface%20SVGPathSeg",
    "WheelEvent": "lib.d.ts.html#interface%20WheelEvent",
    "DOML2DeprecatedAlignmentStyle_HTMLDivElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLDivElement",
    "MSEventAttachmentTarget": "lib.d.ts.html#interface%20MSEventAttachmentTarget",
    "SVGNumber": "lib.d.ts.html#interface%20SVGNumber",
    "SVGPathElement": "lib.d.ts.html#interface%20SVGPathElement",
    "MSCompatibleInfo": "lib.d.ts.html#interface%20MSCompatibleInfo",
    "MSHTMLDocumentEventExtensions": "lib.d.ts.html#interface%20MSHTMLDocumentEventExtensions",
    "Text": "lib.d.ts.html#interface%20Text",
    "SVGAnimatedRect": "lib.d.ts.html#interface%20SVGAnimatedRect",
    "CSSNamespaceRule": "lib.d.ts.html#interface%20CSSNamespaceRule",
    "HTMLUnknownElement": "lib.d.ts.html#interface%20HTMLUnknownElement",
    "SVGPathSegList": "lib.d.ts.html#interface%20SVGPathSegList",
    "HTMLAudioElement": "lib.d.ts.html#interface%20HTMLAudioElement",
    "MSImageResourceExtensions": "lib.d.ts.html#interface%20MSImageResourceExtensions",
    "MSBorderColorHighlightStyle_HTMLTableRowElement": "lib.d.ts.html#interface%20MSBorderColorHighlightStyle_HTMLTableRowElement",
    "PositionError": "lib.d.ts.html#interface%20PositionError",
    "BrowserPublic": "lib.d.ts.html#interface%20BrowserPublic",
    "HTMLTableCellElement": "lib.d.ts.html#interface%20HTMLTableCellElement",
    "MSNamespaceInfoCollection": "lib.d.ts.html#interface%20MSNamespaceInfoCollection",
    "SVGElementInstance": "lib.d.ts.html#interface%20SVGElementInstance",
    "MSHTMLUListElementExtensions": "lib.d.ts.html#interface%20MSHTMLUListElementExtensions",
    "SVGCircleElement": "lib.d.ts.html#interface%20SVGCircleElement",
    "HTMLBaseFontElement": "lib.d.ts.html#interface%20HTMLBaseFontElement",
    "CustomEvent": "lib.d.ts.html#interface%20CustomEvent",
    "CSSImportRule": "lib.d.ts.html#interface%20CSSImportRule",
    "StyleSheetList": "lib.d.ts.html#interface%20StyleSheetList",
    "HTMLTextAreaElement": "lib.d.ts.html#interface%20HTMLTextAreaElement",
    "MSHTMLFormElementExtensions": "lib.d.ts.html#interface%20MSHTMLFormElementExtensions",
    "DOML2DeprecatedMarginStyle": "lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle",
    "Geolocation": "lib.d.ts.html#interface%20Geolocation",
    "MSWindowModeless": "lib.d.ts.html#interface%20MSWindowModeless",
    "HTMLMarqueeElement": "lib.d.ts.html#interface%20HTMLMarqueeElement",
    "SVGRect": "lib.d.ts.html#interface%20SVGRect",
    "MSNodeExtensions": "lib.d.ts.html#interface%20MSNodeExtensions",
    "KeyboardEventExtensions": "lib.d.ts.html#interface%20KeyboardEventExtensions",
    "History": "lib.d.ts.html#interface%20History",
    "DocumentStyle": "lib.d.ts.html#interface%20DocumentStyle",
    "SVGPathSegCurvetoCubicAbs": "lib.d.ts.html#interface%20SVGPathSegCurvetoCubicAbs",
    "TimeRanges": "lib.d.ts.html#interface%20TimeRanges",
    "SVGPathSegCurvetoQuadraticAbs": "lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticAbs",
    "MSHTMLSelectElementExtensions": "lib.d.ts.html#interface%20MSHTMLSelectElementExtensions",
    "CSSRule": "lib.d.ts.html#interface%20CSSRule",
    "SVGPathSegLinetoAbs": "lib.d.ts.html#interface%20SVGPathSegLinetoAbs",
    "MSMouseEventExtensions": "lib.d.ts.html#interface%20MSMouseEventExtensions",
    "HTMLModElement": "lib.d.ts.html#interface%20HTMLModElement",
    "DOML2DeprecatedWordWrapSuppression": "lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression",
    "BeforeUnloadEvent": "lib.d.ts.html#interface%20BeforeUnloadEvent",
    "MSPopupWindow": "lib.d.ts.html#interface%20MSPopupWindow",
    "SVGMatrix": "lib.d.ts.html#interface%20SVGMatrix",
    "SVGUseElement": "lib.d.ts.html#interface%20SVGUseElement",
    "Event": "lib.d.ts.html#interface%20Event",
    "ImageData": "lib.d.ts.html#interface%20ImageData",
    "MSHTMLElementExtensions": "lib.d.ts.html#interface%20MSHTMLElementExtensions",
    "HTMLTableColElement": "lib.d.ts.html#interface%20HTMLTableColElement",
    "HTMLDocument": "lib.d.ts.html#interface%20HTMLDocument",
    "SVGException": "lib.d.ts.html#interface%20SVGException",
    "DOML2DeprecatedTableCellHeight": "lib.d.ts.html#interface%20DOML2DeprecatedTableCellHeight",
    "HTMLTableAlignment": "lib.d.ts.html#interface%20HTMLTableAlignment",
    "SVGAnimatedEnumeration": "lib.d.ts.html#interface%20SVGAnimatedEnumeration",
    "SVGLinearGradientElement": "lib.d.ts.html#interface%20SVGLinearGradientElement",
    "DOML2DeprecatedSizeProperty": "lib.d.ts.html#interface%20DOML2DeprecatedSizeProperty",
    "MSHTMLHeadingElementExtensions": "lib.d.ts.html#interface%20MSHTMLHeadingElementExtensions",
    "MSBorderColorStyle_HTMLTableCellElement": "lib.d.ts.html#interface%20MSBorderColorStyle_HTMLTableCellElement",
    "DOML2DeprecatedWidthStyle_HTMLHRElement": "lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLHRElement",
    "HTMLUListElement": "lib.d.ts.html#interface%20HTMLUListElement",
    "SVGRectElement": "lib.d.ts.html#interface%20SVGRectElement",
    "DOML2DeprecatedBorderStyle": "lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle",
    "HTMLDivElement": "lib.d.ts.html#interface%20HTMLDivElement",
    "NavigatorDoNotTrack": "lib.d.ts.html#interface%20NavigatorDoNotTrack",
    "SVG1_1Properties": "lib.d.ts.html#interface%20SVG1_1Properties",
    "NamedNodeMap": "lib.d.ts.html#interface%20NamedNodeMap",
    "MediaList": "lib.d.ts.html#interface%20MediaList",
    "SVGPathSegCurvetoQuadraticSmoothAbs": "lib.d.ts.html#interface%20SVGPathSegCurvetoQuadraticSmoothAbs",
    "SVGLengthList": "lib.d.ts.html#interface%20SVGLengthList",
    "SVGPathSegCurvetoCubicSmoothRel": "lib.d.ts.html#interface%20SVGPathSegCurvetoCubicSmoothRel",
    "MSWindowExtensions": "lib.d.ts.html#interface%20MSWindowExtensions",
    "ProcessingInstruction": "lib.d.ts.html#interface%20ProcessingInstruction",
    "MSBehaviorUrnsCollection": "lib.d.ts.html#interface%20MSBehaviorUrnsCollection",
    "CSSFontFaceRule": "lib.d.ts.html#interface%20CSSFontFaceRule",
    "DOML2DeprecatedBackgroundStyle": "lib.d.ts.html#interface%20DOML2DeprecatedBackgroundStyle",
    "TextEvent": "lib.d.ts.html#interface%20TextEvent",
    "MSHTMLHRElementExtensions": "lib.d.ts.html#interface%20MSHTMLHRElementExtensions",
    "AbstractView": "lib.d.ts.html#interface%20AbstractView",
    "DocumentFragment": "lib.d.ts.html#interface%20DocumentFragment",
    "DOML2DeprecatedAlignmentStyle_HTMLFieldSetElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLFieldSetElement",
    "SVGPolylineElement": "lib.d.ts.html#interface%20SVGPolylineElement",
    "DOML2DeprecatedWidthStyle": "lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle",
    "DOML2DeprecatedAlignmentStyle_HTMLHeadingElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLHeadingElement",
    "SVGAnimatedPathData": "lib.d.ts.html#interface%20SVGAnimatedPathData",
    "Position": "lib.d.ts.html#interface%20Position",
    "BookmarkCollection": "lib.d.ts.html#interface%20BookmarkCollection",
    "CSSPageRule": "lib.d.ts.html#interface%20CSSPageRule",
    "WindowPerformance": "lib.d.ts.html#interface%20WindowPerformance",
    "HTMLBRElement": "lib.d.ts.html#interface%20HTMLBRElement",
    "MSHTMLDivElementExtensions": "lib.d.ts.html#interface%20MSHTMLDivElementExtensions",
    "DOML2DeprecatedBorderStyle_HTMLInputElement": "lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_HTMLInputElement",
    "HTMLSpanElement": "lib.d.ts.html#interface%20HTMLSpanElement",
    "HTMLHRElementDOML2Deprecated": "lib.d.ts.html#interface%20HTMLHRElementDOML2Deprecated",
    "HTMLHeadElement": "lib.d.ts.html#interface%20HTMLHeadElement",
    "NodeFilterCallback": "lib.d.ts.html#interface%20NodeFilterCallback",
    "HTMLHeadingElement": "lib.d.ts.html#interface%20HTMLHeadingElement",
    "HTMLFormElement": "lib.d.ts.html#interface%20HTMLFormElement",
    "SVGZoomAndPan": "lib.d.ts.html#interface%20SVGZoomAndPan",
    "MSEventExtensions": "lib.d.ts.html#interface%20MSEventExtensions",
    "HTMLMediaElement": "lib.d.ts.html#interface%20HTMLMediaElement",
    "ElementCSSInlineStyle": "lib.d.ts.html#interface%20ElementCSSInlineStyle",
    "DOMParser": "lib.d.ts.html#interface%20DOMParser",
    "MSMimeTypesCollection": "lib.d.ts.html#interface%20MSMimeTypesCollection",
    "StyleSheet": "lib.d.ts.html#interface%20StyleSheet",
    "DOML2DeprecatedBorderStyle_HTMLTableElement": "lib.d.ts.html#interface%20DOML2DeprecatedBorderStyle_HTMLTableElement",
    "DOML2DeprecatedWidthStyle_HTMLAppletElement": "lib.d.ts.html#interface%20DOML2DeprecatedWidthStyle_HTMLAppletElement",
    "SVGTextPathElement": "lib.d.ts.html#interface%20SVGTextPathElement",
    "NodeList": "lib.d.ts.html#interface%20NodeList",
    "HTMLDTElement": "lib.d.ts.html#interface%20HTMLDTElement",
    "XMLSerializer": "lib.d.ts.html#interface%20XMLSerializer",
    "StyleSheetPage": "lib.d.ts.html#interface%20StyleSheetPage",
    "DOML2DeprecatedWordWrapSuppression_HTMLDDElement": "lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLDDElement",
    "MSHTMLTableRowElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableRowElementExtensions",
    "SVGGradientElement": "lib.d.ts.html#interface%20SVGGradientElement",
    "DOML2DeprecatedTextFlowControl_HTMLBRElement": "lib.d.ts.html#interface%20DOML2DeprecatedTextFlowControl_HTMLBRElement",
    "MSHTMLParagraphElementExtensions": "lib.d.ts.html#interface%20MSHTMLParagraphElementExtensions",
    "NodeFilter": "lib.d.ts.html#interface%20NodeFilter",
    "MSBorderColorStyle_HTMLFrameElement": "lib.d.ts.html#interface%20MSBorderColorStyle_HTMLFrameElement",
    "MSHTMLOListElementExtensions": "lib.d.ts.html#interface%20MSHTMLOListElementExtensions",
    "DOML2DeprecatedWordWrapSuppression_HTMLDTElement": "lib.d.ts.html#interface%20DOML2DeprecatedWordWrapSuppression_HTMLDTElement",
    "ScreenView": "lib.d.ts.html#interface%20ScreenView",
    "DOML2DeprecatedMarginStyle_HTMLObjectElement": "lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_HTMLObjectElement",
    "DOML2DeprecatedMarginStyle_HTMLInputElement": "lib.d.ts.html#interface%20DOML2DeprecatedMarginStyle_HTMLInputElement",
    "MSHTMLTableSectionElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableSectionElementExtensions",
    "HTMLFieldSetElement": "lib.d.ts.html#interface%20HTMLFieldSetElement",
    "MediaError": "lib.d.ts.html#interface%20MediaError",
    "SVGNumberList": "lib.d.ts.html#interface%20SVGNumberList",
    "HTMLBGSoundElement": "lib.d.ts.html#interface%20HTMLBGSoundElement",
    "HTMLElement": "lib.d.ts.html#interface%20HTMLElement",
    "Comment": "lib.d.ts.html#interface%20Comment",
    "CanvasPattern": "lib.d.ts.html#interface%20CanvasPattern",
    "HTMLHRElement": "lib.d.ts.html#interface%20HTMLHRElement",
    "MSHTMLFrameSetElementExtensions": "lib.d.ts.html#interface%20MSHTMLFrameSetElementExtensions",
    "DOML2DeprecatedTextFlowControl_HTMLBlockElement": "lib.d.ts.html#interface%20DOML2DeprecatedTextFlowControl_HTMLBlockElement",
    "PositionOptions": "lib.d.ts.html#interface%20PositionOptions",
    "HTMLObjectElement": "lib.d.ts.html#interface%20HTMLObjectElement",
    "MSHTMLMenuElementExtensions": "lib.d.ts.html#interface%20MSHTMLMenuElementExtensions",
    "DocumentView": "lib.d.ts.html#interface%20DocumentView",
    "StorageEvent": "lib.d.ts.html#interface%20StorageEvent",
    "HTMLEmbedElement": "lib.d.ts.html#interface%20HTMLEmbedElement",
    "CharacterData": "lib.d.ts.html#interface%20CharacterData",
    "DOML2DeprecatedAlignmentStyle_HTMLTableSectionElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableSectionElement",
    "HTMLOptGroupElement": "lib.d.ts.html#interface%20HTMLOptGroupElement",
    "HTMLIsIndexElement": "lib.d.ts.html#interface%20HTMLIsIndexElement",
    "SVGPathSegLinetoRel": "lib.d.ts.html#interface%20SVGPathSegLinetoRel",
    "MSHTMLDocumentSelection": "lib.d.ts.html#interface%20MSHTMLDocumentSelection",
    "DOMException": "lib.d.ts.html#interface%20DOMException",
    "MSCompatibleInfoCollection": "lib.d.ts.html#interface%20MSCompatibleInfoCollection",
    "MSHTMLIsIndexElementExtensions": "lib.d.ts.html#interface%20MSHTMLIsIndexElementExtensions",
    "SVGAnimatedBoolean": "lib.d.ts.html#interface%20SVGAnimatedBoolean",
    "SVGSwitchElement": "lib.d.ts.html#interface%20SVGSwitchElement",
    "MSHTMLIFrameElementExtensions": "lib.d.ts.html#interface%20MSHTMLIFrameElementExtensions",
    "SVGPreserveAspectRatio": "lib.d.ts.html#interface%20SVGPreserveAspectRatio",
    "Attr": "lib.d.ts.html#interface%20Attr",
    "MSBorderColorStyle_HTMLTableRowElement": "lib.d.ts.html#interface%20MSBorderColorStyle_HTMLTableRowElement",
    "DOML2DeprecatedAlignmentStyle_HTMLTableCaptionElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableCaptionElement",
    "PerformanceNavigation": "lib.d.ts.html#interface%20PerformanceNavigation",
    "HTMLBodyElementDOML2Deprecated": "lib.d.ts.html#interface%20HTMLBodyElementDOML2Deprecated",
    "SVGStopElement": "lib.d.ts.html#interface%20SVGStopElement",
    "PositionCallback": "lib.d.ts.html#interface%20PositionCallback",
    "SVGSymbolElement": "lib.d.ts.html#interface%20SVGSymbolElement",
    "SVGElementInstanceList": "lib.d.ts.html#interface%20SVGElementInstanceList",
    "MSDataBindingRecordSetExtensions": "lib.d.ts.html#interface%20MSDataBindingRecordSetExtensions",
    "CSSRuleList": "lib.d.ts.html#interface%20CSSRuleList",
    "MSHTMLTableColElementExtensions": "lib.d.ts.html#interface%20MSHTMLTableColElementExtensions",
    "LinkStyle": "lib.d.ts.html#interface%20LinkStyle",
    "MSHTMLMarqueeElementExtensions": "lib.d.ts.html#interface%20MSHTMLMarqueeElementExtensions",
    "HTMLVideoElement": "lib.d.ts.html#interface%20HTMLVideoElement",
    "MSXMLHttpRequestExtensions": "lib.d.ts.html#interface%20MSXMLHttpRequestExtensions",
    "ClientRectList": "lib.d.ts.html#interface%20ClientRectList",
    "DOML2DeprecatedAlignmentStyle_HTMLTableCellElement": "lib.d.ts.html#interface%20DOML2DeprecatedAlignmentStyle_HTMLTableCellElement",
    "SVGMaskElement": "lib.d.ts.html#interface%20SVGMaskElement",
    "MSGestureEvent": "lib.d.ts.html#interface%20MSGestureEvent",
    "ErrorEvent": "lib.d.ts.html#interface%20ErrorEvent",
    "SVGFilterElement": "lib.d.ts.html#interface%20SVGFilterElement",
    "TrackEvent": "lib.d.ts.html#interface%20TrackEvent",
    "SVGFEMergeNodeElement": "lib.d.ts.html#interface%20SVGFEMergeNodeElement",
    "SVGFEFloodElement": "lib.d.ts.html#interface%20SVGFEFloodElement",
    "MSCSSScrollTranslationProperties": "lib.d.ts.html#interface%20MSCSSScrollTranslationProperties",
    "MSGesture": "lib.d.ts.html#interface%20MSGesture",
    "TextTrackCue": "lib.d.ts.html#interface%20TextTrackCue",
    "MSStreamReader": "lib.d.ts.html#interface%20MSStreamReader",
    "CSSFlexibleBoxProperties": "lib.d.ts.html#interface%20CSSFlexibleBoxProperties",
    "DOMTokenList": "lib.d.ts.html#interface%20DOMTokenList",
    "SVGFEFuncAElement": "lib.d.ts.html#interface%20SVGFEFuncAElement",
    "SVGFETileElement": "lib.d.ts.html#interface%20SVGFETileElement",
    "SVGFEBlendElement": "lib.d.ts.html#interface%20SVGFEBlendElement",
    "MessageChannel": "lib.d.ts.html#interface%20MessageChannel",
    "SVGFEMergeElement": "lib.d.ts.html#interface%20SVGFEMergeElement",
    "TransitionEvent": "lib.d.ts.html#interface%20TransitionEvent",
    "MediaQueryList": "lib.d.ts.html#interface%20MediaQueryList",
    "DOMError": "lib.d.ts.html#interface%20DOMError",
    "SVGFEPointLightElement": "lib.d.ts.html#interface%20SVGFEPointLightElement",
    "CSSFontsProperties": "lib.d.ts.html#interface%20CSSFontsProperties",
    "CloseEvent": "lib.d.ts.html#interface%20CloseEvent",
    "WebSocket": "lib.d.ts.html#interface%20WebSocket",
    "ProgressEvent": "lib.d.ts.html#interface%20ProgressEvent",
    "IDBObjectStore": "lib.d.ts.html#interface%20IDBObjectStore",
    "ObjectURLOptions": "lib.d.ts.html#interface%20ObjectURLOptions",
    "SVGFEGaussianBlurElement": "lib.d.ts.html#interface%20SVGFEGaussianBlurElement",
    "MSCSSSelectionBoundaryProperties": "lib.d.ts.html#interface%20MSCSSSelectionBoundaryProperties",
    "SVGFilterPrimitiveStandardAttributes": "lib.d.ts.html#interface%20SVGFilterPrimitiveStandardAttributes",
    "IDBVersionChangeEvent": "lib.d.ts.html#interface%20IDBVersionChangeEvent",
    "IDBIndex": "lib.d.ts.html#interface%20IDBIndex",
    "FileList": "lib.d.ts.html#interface%20FileList",
    "IDBCursor": "lib.d.ts.html#interface%20IDBCursor",
    "CSSAnimationsProperties": "lib.d.ts.html#interface%20CSSAnimationsProperties",
    "SVGFESpecularLightingElement": "lib.d.ts.html#interface%20SVGFESpecularLightingElement",
    "File": "lib.d.ts.html#interface%20File",
    "URL": "lib.d.ts.html#interface%20URL",
    "IDBCursorWithValue": "lib.d.ts.html#interface%20IDBCursorWithValue",
    "XMLHttpRequestEventTarget": "lib.d.ts.html#interface%20XMLHttpRequestEventTarget",
    "IDBEnvironment": "lib.d.ts.html#interface%20IDBEnvironment",
    "AudioTrackList": "lib.d.ts.html#interface%20AudioTrackList",
    "MSBaseReader": "lib.d.ts.html#interface%20MSBaseReader",
    "MSProtocol": "lib.d.ts.html#interface%20MSProtocol",
    "SVGFEMorphologyElement": "lib.d.ts.html#interface%20SVGFEMorphologyElement",
    "CSSTransitionsProperties": "lib.d.ts.html#interface%20CSSTransitionsProperties",
    "SVGFEFuncRElement": "lib.d.ts.html#interface%20SVGFEFuncRElement",
    "WindowTimersExtension": "lib.d.ts.html#interface%20WindowTimersExtension",
    "SVGFEDisplacementMapElement": "lib.d.ts.html#interface%20SVGFEDisplacementMapElement",
    "MSCSSContentZoomProperties": "lib.d.ts.html#interface%20MSCSSContentZoomProperties",
    "AnimationEvent": "lib.d.ts.html#interface%20AnimationEvent",
    "SVGComponentTransferFunctionElement": "lib.d.ts.html#interface%20SVGComponentTransferFunctionElement",
    "MSRangeCollection": "lib.d.ts.html#interface%20MSRangeCollection",
    "MSCSSPositionedFloatsProperties": "lib.d.ts.html#interface%20MSCSSPositionedFloatsProperties",
    "SVGFEDistantLightElement": "lib.d.ts.html#interface%20SVGFEDistantLightElement",
    "MSCSSRegionProperties": "lib.d.ts.html#interface%20MSCSSRegionProperties",
    "SVGFEFuncBElement": "lib.d.ts.html#interface%20SVGFEFuncBElement",
    "IDBKeyRange": "lib.d.ts.html#interface%20IDBKeyRange",
    "WindowConsole": "lib.d.ts.html#interface%20WindowConsole",
    "IDBTransaction": "lib.d.ts.html#interface%20IDBTransaction",
    "AudioTrack": "lib.d.ts.html#interface%20AudioTrack",
    "SVGFEConvolveMatrixElement": "lib.d.ts.html#interface%20SVGFEConvolveMatrixElement",
    "TextTrackCueList": "lib.d.ts.html#interface%20TextTrackCueList",
    "CSSKeyframesRule": "lib.d.ts.html#interface%20CSSKeyframesRule",
    "MSCSSTouchManipulationProperties": "lib.d.ts.html#interface%20MSCSSTouchManipulationProperties",
    "SVGFETurbulenceElement": "lib.d.ts.html#interface%20SVGFETurbulenceElement",
    "TextTrackList": "lib.d.ts.html#interface%20TextTrackList",
    "WindowAnimationTiming": "lib.d.ts.html#interface%20WindowAnimationTiming",
    "SVGFEFuncGElement": "lib.d.ts.html#interface%20SVGFEFuncGElement",
    "SVGFEColorMatrixElement": "lib.d.ts.html#interface%20SVGFEColorMatrixElement",
    "Console": "lib.d.ts.html#interface%20Console",
    "SVGFESpotLightElement": "lib.d.ts.html#interface%20SVGFESpotLightElement",
    "DocumentVisibility": "lib.d.ts.html#interface%20DocumentVisibility",
    "WindowBase64": "lib.d.ts.html#interface%20WindowBase64",
    "IDBDatabase": "lib.d.ts.html#interface%20IDBDatabase",
    "MSProtocolsCollection": "lib.d.ts.html#interface%20MSProtocolsCollection",
    "DOMStringList": "lib.d.ts.html#interface%20DOMStringList",
    "CSSMultiColumnProperties": "lib.d.ts.html#interface%20CSSMultiColumnProperties",
    "IDBOpenDBRequest": "lib.d.ts.html#interface%20IDBOpenDBRequest",
    "HTMLProgressElement": "lib.d.ts.html#interface%20HTMLProgressElement",
    "SVGFEOffsetElement": "lib.d.ts.html#interface%20SVGFEOffsetElement",
    "MSUnsafeFunctionCallback": "lib.d.ts.html#interface%20MSUnsafeFunctionCallback",
    "TextTrack": "lib.d.ts.html#interface%20TextTrack",
    "MediaQueryListListener": "lib.d.ts.html#interface%20MediaQueryListListener",
    "IDBRequest": "lib.d.ts.html#interface%20IDBRequest",
    "MessagePort": "lib.d.ts.html#interface%20MessagePort",
    "FileReader": "lib.d.ts.html#interface%20FileReader",
    "Blob": "lib.d.ts.html#interface%20Blob",
    "ApplicationCache": "lib.d.ts.html#interface%20ApplicationCache",
    "MSHTMLVideoElementExtensions": "lib.d.ts.html#interface%20MSHTMLVideoElementExtensions",
    "FrameRequestCallback": "lib.d.ts.html#interface%20FrameRequestCallback",
    "CSS3DTransformsProperties": "lib.d.ts.html#interface%20CSS3DTransformsProperties",
    "PopStateEvent": "lib.d.ts.html#interface%20PopStateEvent",
    "CSSKeyframeRule": "lib.d.ts.html#interface%20CSSKeyframeRule",
    "CSSGridProperties": "lib.d.ts.html#interface%20CSSGridProperties",
    "MSFileSaver": "lib.d.ts.html#interface%20MSFileSaver",
    "MSStream": "lib.d.ts.html#interface%20MSStream",
    "MSBlobBuilder": "lib.d.ts.html#interface%20MSBlobBuilder",
    "MSRangeExtensions": "lib.d.ts.html#interface%20MSRangeExtensions",
    "DOMSettableTokenList": "lib.d.ts.html#interface%20DOMSettableTokenList",
    "IDBFactory": "lib.d.ts.html#interface%20IDBFactory",
    "MSPointerEvent": "lib.d.ts.html#interface%20MSPointerEvent",
    "CSSTextProperties": "lib.d.ts.html#interface%20CSSTextProperties",
    "CSS2DTransformsProperties": "lib.d.ts.html#interface%20CSS2DTransformsProperties",
    "MSCSSHighContrastProperties": "lib.d.ts.html#interface%20MSCSSHighContrastProperties",
    "MSManipulationEvent": "lib.d.ts.html#interface%20MSManipulationEvent",
    "FormData": "lib.d.ts.html#interface%20FormData",
    "MSHTMLMediaElementExtensions": "lib.d.ts.html#interface%20MSHTMLMediaElementExtensions",
    "SVGFEImageElement": "lib.d.ts.html#interface%20SVGFEImageElement",
    "HTMLDataListElement": "lib.d.ts.html#interface%20HTMLDataListElement",
    "AbstractWorker": "lib.d.ts.html#interface%20AbstractWorker",
    "SVGFECompositeElement": "lib.d.ts.html#interface%20SVGFECompositeElement",
    "ValidityState": "lib.d.ts.html#interface%20ValidityState",
    "HTMLTrackElement": "lib.d.ts.html#interface%20HTMLTrackElement",
    "MSApp": "lib.d.ts.html#interface%20MSApp",
    "SVGFEDiffuseLightingElement": "lib.d.ts.html#interface%20SVGFEDiffuseLightingElement",
    "SVGFEComponentTransferElement": "lib.d.ts.html#interface%20SVGFEComponentTransferElement",
    "MSCSSMatrix": "lib.d.ts.html#interface%20MSCSSMatrix",
    "Worker": "lib.d.ts.html#interface%20Worker",
    "MSMediaErrorExtensions": "lib.d.ts.html#interface%20MSMediaErrorExtensions",
    "ITextWriter": "lib.d.ts.html#interface%20ITextWriter"
};
var fileInput = $("#input_file");
var openButton = $("#button_open");
var genButton = $("#gen");
var textarea = $("#source");
var docs = $("#docs");
textarea.val("");
function getFullHTML(bodyHTML, callback) {
    var cssText;
    var templete;
    function onAjaxComplete() {
        if(cssText && templete) {
            templete = templete.replace('<!-- CSS Content -->', cssText);
            templete = templete.replace('<!-- Document Content -->', bodyHTML);
            callback(templete);
        }
    }
    $.ajax("style.css", {
        contentType: "text/plain",
        dataType: "text",
        success: function (data) {
            cssText = data;
            onAjaxComplete();
        }
    });
    $.ajax('templete.html', {
        dataType: 'text',
        success: function (data, dataType) {
            templete = data;
            onAjaxComplete();
        }
    });
}
function updateDocument(documentContent) {
    var _Blob = Blob;
    var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    getFullHTML(documentContent, function (content) {
        var downloadBlob = new _Blob([
            content
        ], {
            "type": "text/html"
        });
        var tempFileName = "docs.html";
        requestFileSystem(window.TEMPORARY, downloadBlob.size, function (fileSystem) {
            function createTempFile() {
                fileSystem.root.getFile(tempFileName, {
                    create: true
                }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.addEventListener('writeend', function (e) {
                            $('#downloadLink').attr('href', fileEntry.toURL());
                        });
                        fileWriter.write(downloadBlob);
                    });
                }, function (error) {
                    throw error;
                });
            }
            fileSystem.root.getFile(tempFileName, {
            }, function (fileEntry) {
                fileEntry.remove(createTempFile);
            }, createTempFile);
        });
    });
}
function generateDocuments(sync, watcher) {
    docs.children().remove();
    var canvas = $('#progressbar');
    var graphics = (canvas[0]).getContext('2d');
    graphics.fillStyle = 'rgba(0, 0, 255, 0.3)';
    watcher = function (v) {
        graphics.clearRect(0, 0, canvas.width(), canvas.height());
        graphics.fillRect(0, 0, canvas.width() * v / 100, canvas.height());
    };
    function showResult(dat) {
        docs.children().remove();
        if(dat['type'] === 'success') {
            var documentContent = dat['docs'];
            docs.html(documentContent);
            updateDocument(documentContent);
        } else {
            docs.html("<p>Parsing failed at line " + dat.line + ", column " + dat.column + ": \"" + dat.source + "\", " + dat.message + "</p>");
        }
        $('#performance').text("time: " + (/\d+(\.\d{1,3})/.exec(((window.performance.now() - start) * 0.001).toString()))[0] + " sec.");
    }
    docs.append("<p>Parsing...</p>");
    var start = window.performance.now();
    var sourceCode = textarea.val();
    if(sync) {
        setTimeout(function () {
            showResult(DTSDoc.generateDocument(sourceCode, watcher));
        }, 1);
    } else {
        var worker = new Worker("worker.js");
        worker.addEventListener('message', function (event) {
            if(watcher && event.data['type'] === 'state') {
                watcher(event.data['state']);
            } else if(event.data['type'] === 'success' || event.data['type'] === 'fail') {
                showResult(event.data);
            }
        });
        worker.postMessage(sourceCode);
    }
}
genButton.click(function () {
    generateDocuments();
});
fileInput.change(function () {
    var input = fileInput[0];
    var files = input.files;
    var reader = new FileReader();
    reader.addEventListener('load', function (e) {
        textarea.val(reader.result);
        generateDocuments();
    });
    reader.readAsText(files[0]);
});
openButton.click(function () {
    fileInput.val(undefined);
    fileInput.trigger('click');
});
function loadSourceFile(url) {
    $.ajax(url, {
        contentType: "text/plain",
        dataType: "text",
        success: function (data) {
            textarea.val(data);
            generateDocuments();
        }
    });
}
function generateHierarchy(global) {
    var section = $('<section/>');
    return section;
}
function generateTypeList(path, global) {
    var list = {
    };
    function generateTypeListFromModule(m) {
        list[m.name] = path + "#" + m.name;
        m.members.forEach(function (m) {
            if(m instanceof DTSDoc.ASTInterface || m instanceof DTSDoc.ASTClass || m instanceof DTSDoc.ASTEnum) {
                list[m.name] = path + "#" + encodeURIComponent(m.memberKind + ' ' + m.getFullName());
            } else if(m instanceof DTSDoc.ASTModule) {
                generateTypeListFromModule(m);
            }
        });
    }
    generateTypeListFromModule(global);
    return JSON.stringify(list);
}
loadSourceFile("sample.d.ts");
