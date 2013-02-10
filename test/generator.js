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
            if(ms && ms.length > 0) {
                var m = ms[0];
                return input.indexOf(ms[0]) == 0 ? s.success(m.length, m) : s.fail("expected /" + pattern + "/");
            } else {
                return s.fail("expected /" + pattern + "/");
            }
        }, "/" + pattern + "/");
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
            s.success = function () {
                return st.success;
            };
            s.source = function () {
                return st.source.source.slice(st.source.position);
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
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DTSDoc;
(function (DTSDoc) {
    (function (Accessibility) {
        Accessibility._map = [];
        Accessibility._map[0] = "Public";
        Accessibility.Public = 0;
        Accessibility._map[1] = "Private";
        Accessibility.Private = 1;
    })(DTSDoc.Accessibility || (DTSDoc.Accessibility = {}));
    var Accessibility = DTSDoc.Accessibility;
    ;
    var TSDocs = (function () {
        function TSDocs(text) {
            this.text = text;
        }
        return TSDocs;
    })();
    DTSDoc.TSDocs = TSDocs;    
    var ASTParameter = (function () {
        function ASTParameter(name, optional, type) {
            this.name = name;
            this.optional = optional;
            this.type = type;
        }
        ASTParameter.prototype.toString = function () {
            return this.name + ":" + this.type;
        };
        ASTParameter.prototype.toHTML = function (mod) {
            var span = $("<span/>");
            span.append($("<span/>").text(this.name + (this.optional ? "?" : "")));
            span.append(":");
            span.append(this.type.toHTML(mod));
            return span;
        };
        return ASTParameter;
    })();
    DTSDoc.ASTParameter = ASTParameter;    
    var ASTFuncionSignature = (function () {
        function ASTFuncionSignature(params, retType) {
            this.params = params;
            this.retType = retType;
        }
        ASTFuncionSignature.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_signiture"/>');
            span.append(genParameters(mod, this.params));
            span.append(":");
            span.append(this.retType.toHTML(mod));
            return span;
        };
        return ASTFuncionSignature;
    })();
    DTSDoc.ASTFuncionSignature = ASTFuncionSignature;    
    function genParameters(mod, params) {
        var span = $('<span class="ts_params"/>');
        span.append("(");
        for(var i = 0; i < params.length; i++) {
            if(i > 0) {
                span.append(", ");
            }
            span.append(params[i].toHTML(mod));
        }
        span.append(")");
        return span;
    }
    function genFunctionSigniture(mod, params, retType) {
        var span = $('<span class="ts_signiture"/>');
        span.append(genParameters(mod, params));
        span.append(":");
        span.append(retType.toHTML(mod));
        return span;
    }
    var ASTType = (function () {
        function ASTType() { }
        ASTType.prototype.toHTML = function (mod) {
            return undefined;
        };
        return ASTType;
    })();
    DTSDoc.ASTType = ASTType;    
    var ASTTypeName = (function (_super) {
        __extends(ASTTypeName, _super);
        function ASTTypeName(name) {
                _super.call(this);
            this.name = name;
        }
        ASTTypeName.prototype.toHTML = function (mod) {
            if(this.name != "string" && this.name != "number" && this.name != "bool" && this.name != "any" && this.name != "void" && this.name != "Object") {
                var a = $("<a/>");
                a.attr("href", "#" + mod.getFullName(this.name));
                return a.text(this.name);
            } else {
                return $('<span/>').append(this.name);
            }
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
        ASTArrayType.prototype.toHTML = function (mod) {
            return $("<span/>").append(this.type.toHTML(mod)).append("[]");
        };
        return ASTArrayType;
    })(ASTType);
    DTSDoc.ASTArrayType = ASTArrayType;    
    var ASTModulePrefix = (function (_super) {
        __extends(ASTModulePrefix, _super);
        function ASTModulePrefix(name, type) {
                _super.call(this);
            this.name = name;
            this.type = type;
        }
        ASTModulePrefix.prototype.toHTML = function (mod) {
            return $("<span/>").append(this.name).append(".").append(this.type.toHTML(mod));
        };
        return ASTModulePrefix;
    })(ASTType);
    DTSDoc.ASTModulePrefix = ASTModulePrefix;    
    var ASTSpecifingType = (function (_super) {
        __extends(ASTSpecifingType, _super);
        function ASTSpecifingType(members) {
                _super.call(this);
            this.members = members;
        }
        ASTSpecifingType.prototype.toHTML = function (mod) {
            var span = $("<span/>").append("{ ");
            this.members.forEach(function (m) {
                span.append(m.toHTML(mod));
                span.append("; ");
            });
            span.append("}");
            return span;
        };
        return ASTSpecifingType;
    })(ASTType);
    DTSDoc.ASTSpecifingType = ASTSpecifingType;    
    var ASTFunctionTypeRef = (function (_super) {
        __extends(ASTFunctionTypeRef, _super);
        function ASTFunctionTypeRef(params, retType) {
                _super.call(this);
            this.params = params;
            this.retType = retType;
        }
        ASTFunctionTypeRef.prototype.toHTML = function (mod) {
            return $("<span/>").append(genParameters(mod, this.params)).append("=>").append(this.retType.toHTML(mod));
        };
        return ASTFunctionTypeRef;
    })(ASTType);
    DTSDoc.ASTFunctionTypeRef = ASTFunctionTypeRef;    
    var ASTModuleMember = (function () {
        function ASTModuleMember() { }
        ASTModuleMember.prototype.getGlobal = function () {
            return this.parent ? this.parent.getGlobal() : this instanceof ASTModule ? this : null;
        };
        ASTModuleMember.prototype.toHTML = function () {
            return undefined;
        };
        return ASTModuleMember;
    })();
    DTSDoc.ASTModuleMember = ASTModuleMember;    
    var ASTClassMember = (function () {
        function ASTClassMember() { }
        ASTClassMember.prototype.toHTML = function () {
            return undefined;
        };
        return ASTClassMember;
    })();
    DTSDoc.ASTClassMember = ASTClassMember;    
    var ASTInterfaceMember = (function () {
        function ASTInterfaceMember() { }
        ASTInterfaceMember.prototype.toHTML = function (mod) {
            return undefined;
        };
        return ASTInterfaceMember;
    })();
    DTSDoc.ASTInterfaceMember = ASTInterfaceMember;    
    var ASTModuleType = (function (_super) {
        __extends(ASTModuleType, _super);
        function ASTModuleType(name) {
                _super.call(this);
            this.name = name;
        }
        return ASTModuleType;
    })(ASTModuleMember);
    DTSDoc.ASTModuleType = ASTModuleType;    
    var ASTConstructor = (function (_super) {
        __extends(ASTConstructor, _super);
        function ASTConstructor(docs, params) {
                _super.call(this);
            this.docs = docs;
            this.params = params;
        }
        ASTConstructor.prototype.toHTML = function () {
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append($('<a/>').attr("name", this.parent.name + "-constructor"));
            span.append("constructor");
            span.append(genParameters(this.parent.parent, this.params));
            return span;
        };
        return ASTConstructor;
    })(ASTClassMember);
    DTSDoc.ASTConstructor = ASTConstructor;    
    var ASTMethod = (function (_super) {
        __extends(ASTMethod, _super);
        function ASTMethod(docs, access, isStatic, name, sign) {
                _super.call(this);
            this.docs = docs;
            this.access = access;
            this.isStatic = isStatic;
            this.name = name;
            this.sign = sign;
        }
        ASTMethod.prototype.toHTML = function () {
            var span = $('<span class="ts_code ts_method"/>');
            span.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            span.append(this.isStatic ? "static " : "");
            span.append(this.name);
            span.append(this.sign.toHTML(this.parent.parent));
            return span;
        };
        return ASTMethod;
    })(ASTClassMember);
    DTSDoc.ASTMethod = ASTMethod;    
    var ASTField = (function (_super) {
        __extends(ASTField, _super);
        function ASTField(docs, access, isStatic, name, type) {
                _super.call(this);
            this.docs = docs;
            this.access = access;
            this.isStatic = isStatic;
            this.name = name;
            this.type = type;
        }
        ASTField.prototype.toString = function () {
            return this.name + ":" + this.type;
        };
        ASTField.prototype.toHTML = function () {
            var span = $('<span class="ts_code ts_field" />');
            span.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            span.append((this.isStatic ? "static " : "") + this.name + ":");
            span.append(this.type.toHTML(this.parent.parent));
            return span;
        };
        return ASTField;
    })(ASTClassMember);
    DTSDoc.ASTField = ASTField;    
    var ASTClass = (function (_super) {
        __extends(ASTClass, _super);
        function ASTClass(docs, name, superClass, members) {
                _super.call(this, name);
            this.docs = docs;
            this.superClass = superClass;
            this.members = members;
            this.derivedClasses = [];
        }
        ASTClass.prototype.toString = function () {
            var s = "class " + this.name + "{";
            this.members.forEach(function (m) {
                s += m.toString();
            });
            return s + "}";
        };
        ASTClass.prototype.getSuperClass = function () {
            if(this.superClass) {
                var sc = this.parent.findType(this.superClass.name);
                if(sc instanceof ASTClass) {
                    return sc;
                }
            }
            return null;
        };
        ASTClass.prototype.getFullName = function () {
            return this.parent.getFullName(this.name);
        };
        ASTClass.prototype.updateHierarchy = function () {
            var superClass = this.getSuperClass();
            if(superClass) {
                superClass.derivedClasses.push(this);
            }
        };
        ASTClass.prototype.toHierarchyHTML = function () {
            if(this.getSuperClass() || this.derivedClasses.length > 0) {
                var div = $('<div class="ts_hierarchey"/>');
                div.append($('<a/>').attr("href", '#' + this.getFullName()).append(this.name));
                if(this.derivedClasses.length > 0) {
                    div.append(this.derivedClasses.map(function (m) {
                        return m.toHierarchyHTML();
                    }));
                }
                return div;
            } else {
                return null;
            }
        };
        ASTClass.prototype.toHTML = function () {
            var p = $('<section class="ts_modulemember ts_class"/>');
            p.append($("<a/>").attr("name", this.getFullName()));
            p.append($('<h1 class="ts_modulemember_title ts_class_title" />').text("class " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            if(this.superClass) {
                content.append('<h3>Hierarchy</h3>');
                var hierarchy = $('<div/>');
                hierarchy.append(this.name);
                var superClass = this.getSuperClass();
                if(superClass) {
                    while(superClass) {
                        hierarchy.append(" ← ");
                        hierarchy.append($('<a/>').attr('href', "#" + superClass.getFullName()).append(superClass.name));
                        superClass = superClass.getSuperClass();
                    }
                } else {
                    hierarchy.append(" ← " + this.superClass);
                }
                content.append(hierarchy);
                content.append($('<hr/>'));
            }
            if(this.derivedClasses.length > 0) {
                content.append('<h3>Subclasses</h3>');
                var div = $('<div/>');
                for(var i = 0; i < this.derivedClasses.length; i++) {
                    if(i > 0) {
                        div.append(", ");
                    }
                    var c = this.derivedClasses[i];
                    div.append($('<a/>').attr('href', '#' + c.getFullName()).append(c.name));
                }
                content.append(div);
                content.append($('<hr/>'));
            }
            if(this.docs) {
                content.append('<h3>Description</h3>');
                content.append($('<div>').text(this.docs.text));
            }
            content.append('<h3>Members</h3>');
            this.members.forEach(function (m) {
                if(m.toHTML) {
                    var html = m.toHTML();
                    if(html) {
                        content.append($('<div/>').append(html));
                    }
                }
            });
            return p;
        };
        return ASTClass;
    })(ASTModuleType);
    DTSDoc.ASTClass = ASTClass;    
    var ASTIIndexer = (function (_super) {
        __extends(ASTIIndexer, _super);
        function ASTIIndexer(docs, name, indexType, retType) {
                _super.call(this);
            this.docs = docs;
            this.name = name;
            this.indexType = indexType;
            this.retType = retType;
        }
        ASTIIndexer.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("[" + this.name + ":");
            span.append(this.indexType.toHTML(mod));
            span.append("]:");
            span.append(this.retType.toHTML(mod));
            return span;
        };
        return ASTIIndexer;
    })(ASTInterfaceMember);
    DTSDoc.ASTIIndexer = ASTIIndexer;    
    var ASTIMethod = (function (_super) {
        __extends(ASTIMethod, _super);
        function ASTIMethod(docs, name, sign) {
                _super.call(this);
            this.docs = docs;
            this.name = name;
            this.sign = sign;
        }
        ASTIMethod.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_method"/>');
            span.append(this.name);
            span.append(this.sign.toHTML(mod));
            return span;
        };
        return ASTIMethod;
    })(ASTInterfaceMember);
    DTSDoc.ASTIMethod = ASTIMethod;    
    var ASTIConstructor = (function (_super) {
        __extends(ASTIConstructor, _super);
        function ASTIConstructor(docs, params, type) {
                _super.call(this);
            this.docs = docs;
            this.params = params;
            this.type = type;
        }
        ASTIConstructor.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("new");
            span.append(genParameters(mod, this.params));
            return span;
        };
        return ASTIConstructor;
    })(ASTInterfaceMember);
    DTSDoc.ASTIConstructor = ASTIConstructor;    
    var ASTIField = (function (_super) {
        __extends(ASTIField, _super);
        function ASTIField(docs, name, isOptional, type) {
                _super.call(this);
            this.docs = docs;
            this.name = name;
            this.isOptional = isOptional;
            this.type = type;
        }
        ASTIField.prototype.toHTML = function (mod) {
            return $('<span class="ts_code" />').append($("<span/>").text(this.name + (this.isOptional ? "?" : "") + ":").append(this.type.toHTML(mod)));
        };
        return ASTIField;
    })(ASTInterfaceMember);
    DTSDoc.ASTIField = ASTIField;    
    var ASTIFunction = (function (_super) {
        __extends(ASTIFunction, _super);
        function ASTIFunction(docs, params, retType) {
                _super.call(this);
            this.docs = docs;
            this.params = params;
            this.retType = retType;
        }
        ASTIFunction.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_method"/>');
            span.append(genFunctionSigniture(mod, this.params, this.retType));
            return span;
        };
        return ASTIFunction;
    })(ASTInterfaceMember);
    DTSDoc.ASTIFunction = ASTIFunction;    
    var ASTInterface = (function (_super) {
        __extends(ASTInterface, _super);
        function ASTInterface(docs, name, interfaces, type) {
                _super.call(this, name);
            this.docs = docs;
            this.interfaces = interfaces;
            this.type = type;
        }
        ASTInterface.prototype.getFullName = function () {
            return this.parent.getFullName(this.name);
        };
        ASTInterface.prototype.toHTML = function () {
            var _this = this;
            var section = $('<section class="ts_modulemember ts_interface"/>');
            section.append($("<a/>").attr("name", this.getFullName()));
            section.append($('<h1 class="ts_modulemember_title ts_interface_title"/>').text("interface " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
            this.type.members.forEach(function (m) {
                content.append($("<div/>").append(m.toHTML(_this.parent)));
            });
            return section;
        };
        return ASTInterface;
    })(ASTModuleType);
    DTSDoc.ASTInterface = ASTInterface;    
    var ASTFunction = (function (_super) {
        __extends(ASTFunction, _super);
        function ASTFunction(docs, name, sign) {
                _super.call(this);
            this.docs = docs;
            this.name = name;
            this.sign = sign;
        }
        ASTFunction.prototype.toHTML = function () {
            var p = $('<section class="ts_modulemember ts_function"/>');
            p.append($("<a/>").attr("name", "func_" + this.name));
            p.append($('<h1 class="ts_modulemember_title ts_function_title" />').text("function " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            var span = $('<span class="ts_code ts_method"/>').appendTo(content);
            span.append("function " + this.name);
            span.append(this.sign.toHTML(this.parent));
            return p;
        };
        return ASTFunction;
    })(ASTModuleMember);
    DTSDoc.ASTFunction = ASTFunction;    
    var ASTEnum = (function (_super) {
        __extends(ASTEnum, _super);
        function ASTEnum(docs, name, members) {
                _super.call(this, name);
            this.docs = docs;
            this.members = members;
        }
        ASTEnum.prototype.getFullName = function () {
            return this.parent.getFullName(this.name);
        };
        ASTEnum.prototype.toHTML = function () {
            var section = $('<section class="ts_modulemember ts_enum"/>');
            section.append($("<a/>").attr("name", this.getFullName()));
            section.append($('<h1 class="ts_modulemember_title ts_enum_title"/>').text("enum " + this.name));
            this.members.forEach(function (m) {
                section.append($("<div/>").text(m));
            });
            return section;
        };
        return ASTEnum;
    })(ASTModuleType);
    DTSDoc.ASTEnum = ASTEnum;    
    var ASTVar = (function (_super) {
        __extends(ASTVar, _super);
        function ASTVar(docs, name, type) {
                _super.call(this);
            this.docs = docs;
            this.name = name;
            this.type = type;
        }
        ASTVar.prototype.toString = function () {
            return this.name;
        };
        ASTVar.prototype.toHTML = function () {
            var section = $('<section class="ts_modulemember ts_var" />');
            section.append($('<h1 class="ts_modulemember_title ts_var_title" />').text("var " + this.name));
            var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
            content.append($('<span class="ts_code"/>').append('var ' + this.name).append(":").append(this.type.toHTML(this.parent)));
            return section;
        };
        return ASTVar;
    })(ASTModuleMember);
    DTSDoc.ASTVar = ASTVar;    
    var ASTModule = (function (_super) {
        __extends(ASTModule, _super);
        function ASTModule(docs, name, members) {
                _super.call(this);
            this.docs = docs;
            this.name = name;
            this.members = members;
        }
        ASTModule.prototype.findType = function (name) {
            var splitted = name.split('.');
            if(splitted.length == 1) {
                var targetType = splitted[0];
                for(var i = 0; i < this.members.length; i++) {
                    var member = this.members[i];
                    if(member instanceof ASTModuleType) {
                        var c = member;
                        if(c.name == targetType) {
                            return c;
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
                    if(member instanceof ASTModuleType) {
                        var c = member;
                        if(c.name == targetType) {
                            return c;
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
        ASTModule.prototype.getFullName = function (name) {
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
        ASTModule.prototype.toHierarchyHTML = function () {
            var div = $('<div/>');
            this.members.forEach(function (m) {
                if(m instanceof ASTModule) {
                    div.append((m).toHierarchyHTML());
                } else if(m instanceof ASTClass) {
                    var clazz = m;
                    if(clazz.derivedClasses.length > 0) {
                        div.append(clazz.toHierarchyHTML());
                    }
                }
            });
            return div;
        };
        ASTModule.prototype.toString = function () {
            var s = "module " + this.name + "{";
            this.members.forEach(function (m) {
                s += m.toString();
            });
            return s + "}";
        };
        ASTModule.prototype.toHTML = function () {
            var section = $('<section class="ts_modulemember ts_module"/>');
            section.append($('<h1 class="ts_modulemember_title ts_module_title"/>').text("module " + this.name));
            var content = $('<section />').appendTo(section);
            if(this.docs) {
                content.append($('<p class="ts_modulemember_description"/>').html(this.docs.text));
            }
            this.members.forEach(function (m) {
                content.append(m.toHTML());
            });
            return section;
        };
        return ASTModule;
    })(ASTModuleMember);
    DTSDoc.ASTModule = ASTModule;    
})(DTSDoc || (DTSDoc = {}));
var DTSDoc;
(function (DTSDoc) {
    var lineComment = regexp(/^\/\/(?!>)[^\n]*\n/);
    var blockComment = regexp(/^\/\*(.|\r|\n)*?\*\//m);
    var comment = or(lineComment, blockComment);
    var whitespace = regexp(/^[ \t\r\n]+/);
    var spaces = many(or(whitespace, comment));
    function lexme(p) {
        return seq(function (s) {
            var v = s(p);
            s(spaces);
            return v;
        });
    }
    var colon = lexme(string(":"));
    var semi = lexme(string(";"));
    var comma = lexme(string(","));
    var optExport = lexme(optional(string("export")));
    var reserved = function (s) {
        return lexme(string(s));
    };
    var documentCommentLine = seq(function (s) {
        s(string('//>'));
        var text = s(regexp(/^.*/));
        s(regexp(/^(\n|$)/));
        s(whitespace);
        return text;
    });
    var documentComment = optional(map(function (ls) {
        return ls.join('\n');
    }, many(documentCommentLine)));
    var reference = lexme(regexp(/^([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/));
    var identifier = lexme(regexp(/^[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/));
    var tsDeclare = optional(reserved("declare"));
    var pParameter = seq(function (s) {
        var isVarArg = s(optional(reserved("...")));
        var varName = s(identifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        var typeName = s(option(new DTSDoc.ASTTypeName("any"), seq(function (s) {
            s(colon);
            return s(pType);
        })));
        return typeName && new DTSDoc.ASTParameter(varName, opt, typeName);
    });
    var pParameters = seq(function (s) {
        s(reserved("("));
        var ps = s(sepBy(pParameter, comma));
        s(reserved(")"));
        return ps;
    });
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, reserved("private"))));
    var modStatic = option(false, map(function () {
        return true;
    }, reserved("static")));
    var pSpecifyingType = seq(function (s) {
        s(reserved("{"));
        var members = s(many(or(trying(pIConstructor), trying(pIMethod), pIField, pIIndexer, pIFunction)));
        s(reserved("}"));
        return new DTSDoc.ASTSpecifingType(members);
    });
    var pTypeName = lexme(seq(function (s) {
        var name = s(identifier);
        var type = new DTSDoc.ASTTypeName(name);
        s(many(seq(function (s) {
            s(reserved("."));
            s(identifier);
            s(ret(function () {
                type = new DTSDoc.ASTModulePrefix(name, type);
            }));
        })));
        return type;
    }));
    var pFunctionType = seq(function (s) {
        var params = s(pParameters);
        s(reserved("=>"));
        var retType = s(pType);
        return new DTSDoc.ASTFunctionTypeRef(params, retType);
    });
    var pType = seq(function (s) {
        var type = s(or(pSpecifyingType, pTypeName, pFunctionType));
        s(many(seq(function (s) {
            s(reserved("["));
            s(reserved("]"));
            s(ret(function () {
                type = new DTSDoc.ASTArrayType(type);
            }));
        })));
        return type;
    });
    var pMethod = seq(function (s) {
        var docs = s(documentComment);
        var access = s(pAccessibility);
        var isStatic = s(modStatic);
        var methodName = s(identifier);
        var params = s(pParameters);
        var retType = s(option(new DTSDoc.ASTTypeName("any"), seq(function (s) {
            s(colon);
            var retType = s(pType);
            return retType;
        })));
        s(semi);
        return retType && new DTSDoc.ASTMethod(docs && new DTSDoc.TSDocs(docs), access, isStatic, methodName, new DTSDoc.ASTFuncionSignature(params, retType));
    });
    var pField = seq(function (s) {
        var docs = s(documentComment);
        var access = s(pAccessibility);
        var isStatic = s(modStatic);
        var name = s(identifier);
        s(colon);
        var type = s(pType);
        s(semi);
        return new DTSDoc.ASTField(docs && new DTSDoc.TSDocs(docs), access, isStatic, name, type);
    });
    var pConstructor = seq(function (s) {
        var docs = s(documentComment);
        s(reserved("constructor"));
        var params = s(pParameters);
        s(semi);
        return new DTSDoc.ASTConstructor(docs && new DTSDoc.TSDocs(docs), params);
    });
    var pIIndexer = seq(function (s) {
        var docs = s(documentComment);
        s(reserved("["));
        var name = s(identifier);
        s(colon);
        var type = s(pType);
        s(reserved("]"));
        s(colon);
        var retType = s(pType);
        s(semi);
        return new DTSDoc.ASTIIndexer(docs && new DTSDoc.TSDocs(docs), name, type, retType);
    });
    DTSDoc.pClass = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("class"));
        var name = s(identifier);
        var superClasse = s(option(undefined, seq(function (s) {
            s(reserved("extends"));
            s(pTypeName);
        })));
        var interfaces = s(option([], seq(function (s) {
            s(reserved("implements"));
            s(sepBy1(pTypeName, comma));
        })));
        s(reserved("{"));
        var members = s(many(or(trying(pConstructor), trying(pMethod), trying(pField), pIIndexer)));
        s(reserved("}"));
        if(s.success()) {
            var clazz = new DTSDoc.ASTClass(docs && new DTSDoc.TSDocs(docs), name, superClasse, members);
            members.forEach(function (m) {
                m.parent = clazz;
            });
            return clazz;
        }
    });
    var pIField = seq(function (s) {
        var docs = s(documentComment);
        var name = s(identifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        s(colon);
        var type = s(pType);
        s(semi);
        return new DTSDoc.ASTIField(docs && new DTSDoc.TSDocs(docs), name, opt, type);
    });
    var pIConstructor = seq(function (s) {
        var docs = s(documentComment);
        s(reserved("new"));
        var params = s(pParameters);
        var type = s(option(new DTSDoc.ASTTypeName('any'), series(colon, pType)));
        s(semi);
        return new DTSDoc.ASTIConstructor(docs && new DTSDoc.TSDocs(docs), params, type);
    });
    var pIFunction = seq(function (s) {
        var docs = s(documentComment);
        var params = s(pParameters);
        s(colon);
        var type = s(pType);
        s(semi);
        return new DTSDoc.ASTIFunction(docs && new DTSDoc.TSDocs(docs), params, type);
    });
    var pIMethod = seq(function (s) {
        var docs = s(documentComment);
        var methodName = s(identifier);
        var opt = s(option(false, map(function () {
            return true;
        }, reserved("?"))));
        var params = s(pParameters);
        var retType = s(option(new DTSDoc.ASTTypeName("any"), seq(function (s) {
            s(colon);
            var retType = s(pType);
            return retType;
        })));
        s(semi);
        return retType && new DTSDoc.ASTIMethod(docs && new DTSDoc.TSDocs(docs), methodName, new DTSDoc.ASTFuncionSignature(params, retType));
    });
    DTSDoc.pInterface = seq(function (s) {
        var docs = s(documentComment);
        s(optExport);
        s(reserved("interface"));
        var name = s(identifier);
        var ifs = s(option([], seq(function (s) {
            s(reserved("extends"));
            s(sepBy1(pTypeName, comma));
        })));
        var type = s(pSpecifyingType);
        return new DTSDoc.ASTInterface(docs && new DTSDoc.TSDocs(docs), name, ifs, type);
    });
    DTSDoc.pEnum = seq(function (s) {
        var docs = s(documentComment);
        s(optExport);
        s(reserved("enum"));
        var name = s(identifier);
        s(reserved("{"));
        var members = s(or(trying(sepBy(identifier, comma)), endBy(identifier, comma)));
        s(optional(comma));
        s(reserved("}"));
        return new DTSDoc.ASTEnum(docs && new DTSDoc.TSDocs(docs), name, members);
    });
    DTSDoc.pFunction = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("function"));
        var name = s(identifier);
        var params = s(pParameters);
        var retType = s(option("any", seq(function (s) {
            s(colon);
            var retType = s(pType);
            return retType;
        })));
        s(semi);
        return retType && new DTSDoc.ASTFunction(docs && new DTSDoc.TSDocs(docs), name, new DTSDoc.ASTFuncionSignature(params, retType));
    });
    DTSDoc.pVar = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("var"));
        var name = s(identifier);
        s(colon);
        var typeName = s(pType);
        s(optional(semi));
        return typeName && new DTSDoc.ASTVar(docs && new DTSDoc.TSDocs(docs), name, typeName);
    });
    DTSDoc.pModule = seq(function (s) {
        var docs = s(documentComment);
        s(tsDeclare);
        s(optExport);
        s(reserved("module"));
        var name = s(reference);
        s(reserved("{"));
        var members = s(pModuleMembers);
        s(reserved("}"));
        if(s.success()) {
            var mod = new DTSDoc.ASTModule(docs && new DTSDoc.TSDocs(docs), name, members);
            members.forEach(function (m) {
                m.parent = mod;
            });
            return mod;
        }
    });
    var pModuleMembers = many(or(trying(DTSDoc.pVar), trying(DTSDoc.pModule), trying(DTSDoc.pClass), trying(DTSDoc.pFunction), trying(DTSDoc.pInterface), DTSDoc.pEnum));
    DTSDoc.program = seq(function (s) {
        s(spaces);
        var members = s(pModuleMembers);
        s(eof);
        if(s.success()) {
            var mod = new DTSDoc.ASTModule(undefined, "(global)", members);
            members.forEach(function (m) {
                m.parent = mod;
            });
            mod.updateHierarchy();
            return mod;
        }
    });
})(DTSDoc || (DTSDoc = {}));
var fileInput = $("#input_file");
var openButton = $("#button_open");
var genButton = $("#gen");
var textarea = $("#source");
var docs = $("#docs");
textarea.val("");
var documentContent;
var cssText;
function generateDocuments() {
    docs.children().remove();
    docs.append("<p>Parsing...</p>");
    setTimeout(function () {
        var sourceCode = textarea.val();
        var result = DTSDoc.program.parse(new Source(sourceCode, 0));
        if(result.success) {
            docs.append("<p>Parsing finished</p><p>Document generating...</p>");
            var global = result.value;
            var members = global.members;
            documentContent = $('<div/>');
            documentContent.append($('<h2>Contents</h2>'));
            documentContent.append($('<ul class="contents"><li><a href="#members">Members</a></li><li><a href="#hierarchy">Class Hierarchy</a></li></ul>'));
            documentContent.append('<a name="members" />');
            documentContent.append('<h2>Members</h2>');
            documentContent.append(members.map(function (m) {
                return m.toHTML();
            }));
            documentContent.append($('<hr/>'));
            documentContent.append('<a name="hierarchy" />');
            documentContent.append('<h2>Class Hierarchy</h2>');
            documentContent.append(global.toHierarchyHTML());
            documentContent.append($('<hr/>'));
            documentContent.append($('<footer>Generated by <a href="https://github.com/kontan/dtsdoc">DTSDoc</a></footer>'));
            var headerHTML = [
                '<html>', 
                '<head>', 
                '<meta charset="utf-8">', 
                '<style type="text/css">', 
                'h5{ text-align: center; }', 
                cssText, 
                '</style>', 
                '<link rel="STYLESHEET" href="style.css" type="text/css"></link>', 
                '</head>', 
                '<body>'
            ].join('');
            var footerHTML = '</body></html>';
            docs.children().remove();
            docs.append(documentContent);
            var _Blob = Blob;
            var blob = new _Blob([
                documentContent.html()
            ], {
                "type": "text/html"
            });
            var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            var downloadBlob = new _Blob([
                headerHTML + documentContent.html() + footerHTML
            ], {
                "type": "text/html"
            });
            requestFileSystem(window.TEMPORARY, blob.size, function (fileSystem) {
                fileSystem.root.getFile("docs.html", {
                    create: true
                }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.onwriteend = function (e) {
                            $('#downloadLink').attr('href', fileEntry.toURL());
                        };
                        fileWriter.onerror = function (e) {
                            throw e;
                        };
                        fileWriter.write(downloadBlob);
                    });
                }, function (error) {
                    throw error;
                });
            }, function (err) {
                throw err;
            });
        } else {
            var pos = result.source.getPosition();
            docs.append("<p>Parsing failed at line " + pos.line + ", column " + pos.column + ": \"" + result.source.source.slice(result.source.position, result.source.position + 128) + "\"</p>");
        }
    }, 1);
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
    fileInput.trigger('click');
});
$.ajax("style.css", {
    contentType: "text/plain",
    dataType: "text",
    success: function (data) {
        cssText = data;
    }
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
