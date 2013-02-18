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
            pattern.lastIndex = s.position;
            var ms = pattern.exec(s.source);
            if(ms && ms.length > 0 && ms.index == s.position) {
                var m = ms[0];
                return s.success(m.length, m);
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
    var ASTDoctagSection = (function () {
        function ASTDoctagSection(tag, text) {
            this.tag = tag;
            this.text = text;
        }
        ASTDoctagSection.prototype.toHTML = function (mod) {
            if(this.tag == 'param') {
                var arr = /([_a-zA-Z]+)(.*)/.exec(this.text);
                var li = $('<dl class="ts_param"/>');
                li.append($('<dt class="ts_code ts_param_name"/>').text(arr[1]));
                li.append($('<dd class="ts_param_description"/>').text(arr[2]));
                return li;
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
        ASTDocs.prototype.toHTML = function (mod) {
            var section = $('<section class="ts_classmember_description"/>');
            if(this.text) {
                section.append($('<p/>').html(this.text));
            }
            var params = $('<div/>');
            this.sections.forEach(function (s) {
                params.append(s.toHTML(mod));
            });
            if(params.children().length > 0) {
                section.append($('<h5 class="ts_parameters"/>').text('Parameters'));
                section.append(params);
            }
            return section;
        };
        return ASTDocs;
    })();
    DTSDoc.ASTDocs = ASTDocs;    
    var ASTTypeAnnotation = (function () {
        function ASTTypeAnnotation(type) {
            this.type = type;
        }
        ASTTypeAnnotation.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_type_annotation"/>');
            span.append('<span class="ts_symbol ts_colon">:</span>');
            span.append(this.type.toHTML(mod));
            return span;
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
        ASTParameter.prototype.toHTML = function (mod) {
            var span = $("<span/>");
            span.append($("<span/>").text(this.name));
            if(this.optional) {
                span.append($('<span class="ts_symbol ts_optional">?</span>'));
            }
            span.append(this.type.toHTML(mod));
            return span;
        };
        return ASTParameter;
    })();
    DTSDoc.ASTParameter = ASTParameter;    
    var ASTParameters = (function () {
        function ASTParameters(params) {
            this.params = params;
        }
        ASTParameters.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_params"/>');
            span.append("(");
            for(var i = 0; i < this.params.length; i++) {
                if(i > 0) {
                    span.append(", ");
                }
                span.append(this.params[i].toHTML(mod));
            }
            span.append(")");
            return span;
        };
        return ASTParameters;
    })();
    DTSDoc.ASTParameters = ASTParameters;    
    var ASTFuncionSignature = (function () {
        function ASTFuncionSignature(params, retType) {
            this.params = params;
            this.retType = retType;
            if(!this.params.toHTML) {
                console.log("");
            }
        }
        ASTFuncionSignature.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_signiture"/>');
            span.append(this.params.toHTML(mod));
            span.append(this.retType.toHTML(mod));
            return span;
        };
        return ASTFuncionSignature;
    })();
    DTSDoc.ASTFuncionSignature = ASTFuncionSignature;    
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
        function ASTTypeName(names) {
                _super.call(this);
            this.names = names;
            this.name = names[names.length - 1];
        }
        ASTTypeName.prototype.toHTML = function (mod) {
            var span = $("<span/>");
            if(this.name == "any" || this.name == "void") {
                span.append($('<span class="ts_reserved"/>').append(this.name));
            } else if(typeNameLinks[this.name]) {
                span.append($("<a/>").attr("href", typeNameLinks[this.name]).text(this.name));
            } else {
                var member = mod.searchType(this);
                if(member) {
                    span.append($("<a/>").attr("href", "#" + member.getLinkString()).text(this.name));
                } else {
                    span.append(this.name);
                }
            }
            return span;
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
    var ASTSpecifingType = (function (_super) {
        __extends(ASTSpecifingType, _super);
        function ASTSpecifingType(members) {
                _super.call(this);
            this.members = members;
        }
        ASTSpecifingType.prototype.toHTML = function (mod) {
            var span = $('<span />');
            span.append($('<span class="ts_symbol ts_left_brace">{</span>'));
            this.members.forEach(function (m) {
                span.append(m.toHTML(mod));
                span.append($('<span class="ts_symbol ts_semi">;</span>'));
            });
            span.append($('<span class="ts_symbol ts_right_brace">}</span>'));
            return span;
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
        ASTFunctionType.prototype.toHTML = function (mod) {
            return $("<span/>").append(this.params.toHTML(mod)).append($('<span class="ts_symbol ts_arrow">=&gt;</span>')).append(this.retType.toHTML(mod));
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
        ASTConstructorTypeLiteral.prototype.toHTML = function (mod) {
            return $("<span/>").append($('<span class="ts_reserved">new</span>')).append(this.params.toHTML(mod)).append($('<span class="ts_symbol ts_arrow">=&gt;</span>')).append(this.retType.toHTML(mod));
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
        ASTModuleMember.prototype.toHTML = function () {
            return undefined;
        };
        ASTModuleMember.prototype.getFullName = function () {
            return this.parent.findFullName(this.name);
        };
        ASTModuleMember.prototype.getLinkString = function () {
            return encodeURIComponent(this.memberKind + ' ' + this.getFullName());
        };
        ASTModuleMember.prototype.createTitle = function () {
            var fullName = this.getFullName();
            var linkURL = this.getLinkString();
            var a = $('<a class="ts_modulemember_a"/>');
            a.attr("name", linkURL);
            a.attr("href", '#' + linkURL);
            a.text(this.memberKind + " " + this.name);
            return $('<h1 class="ts_modulemember_title ts_class_title" />').append(a);
        };
        return ASTModuleMember;
    })();
    DTSDoc.ASTModuleMember = ASTModuleMember;    
    var ASTClassMember = (function () {
        function ASTClassMember() { }
        ASTClassMember.prototype.toHTML = function () {
            var title = this.memberToHTML();
            var div = $('<div class="ts_class_member_container">').append(title);
            if(this.docs) {
                div.append(this.docs.toHTML(undefined));
            }
            return div;
        };
        ASTClassMember.prototype.memberToHTML = function () {
            return undefined;
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
        ASTConstructor.prototype.memberToHTML = function () {
            var title = $('<div class="ts_code ts_class_member_title ts_constructor"/>');
            title.append($('<a/>').attr("name", this.parent.name + "-constructor"));
            title.append($('<span class="ts_reserved ts_reserved_constructor">constructor</span>'));
            title.append(this.params.toHTML(this.parent.parent));
            return title;
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
        ASTMethod.prototype.memberToHTML = function () {
            var title = $('<div class="ts_code ts_class_member_title ts_method"/>');
            title.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            title.append($(this.isStatic ? '<span class="ts_reserved">static</span>' : ''));
            title.append(this.name);
            title.append(this.sign.toHTML(this.parent.parent));
            return title;
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
        ASTField.prototype.toString = function () {
            return this.name + ":" + this.type;
        };
        ASTField.prototype.memberToHTML = function () {
            var title = $('<div class="ts_code ts_class_member_title ts_field" />');
            title.append($('<a/>').attr("name", this.parent.name + "-" + this.name));
            title.append((this.isStatic ? "static " : "") + this.name);
            title.append(this.type.toHTML(this.parent.parent));
            return title;
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
        ASTClass.prototype.updateHierarchy = function () {
            var superClass = this.getSuperClass();
            if(superClass) {
                superClass.derivedClasses.push(this);
            }
        };
        ASTClass.prototype.toHierarchyHTML = function () {
            if(this.getSuperClass() || this.derivedClasses.length > 0) {
                var div = $('<div class="ts_hierarchey"/>');
                div.append($('<a/>').attr("href", '#' + this.getLinkString()).append(this.name));
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
            p.append(this.createTitle());
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            if(this.docs) {
                content.append($('<div class="ts_classcontent ts_classdescription">').html(this.docs.text));
                content.append('<hr/>');
            }
            if(this.superClass) {
                content.append('<h3>Hierarchy</h3>');
                var hierarchy = $('<div class="ts_classcontent ts_classhierarchy"/>');
                hierarchy.append(this.name);
                var superClass = this.getSuperClass();
                if(superClass) {
                    while(superClass) {
                        hierarchy.append(" ← ");
                        hierarchy.append($('<a/>').attr('href', "#" + superClass.getLinkString()).append(superClass.name));
                        superClass = superClass.getSuperClass();
                    }
                } else {
                    hierarchy.append(" ← " + this.superClass.name);
                }
                content.append(hierarchy);
                content.append($('<hr/>'));
            }
            if(this.interfaces.length > 0) {
                content.append('<h3>Implementing Interfaces</h3>');
                var div = $('<div class="ts_classcontent ts_implementations"/>');
                for(var i = 0; i < this.interfaces.length; i++) {
                    if(i > 0) {
                        div.append(", ");
                    }
                    var name = this.interfaces[i].name;
                    var sc = this.parent.findType(name);
                    if(sc instanceof ASTInterface) {
                        var ifs = sc;
                        div.append($('<a/>').attr('href', '#' + ifs.getLinkString()).append(name));
                    } else {
                        div.append(name);
                    }
                }
                content.append(div);
                content.append($('<hr/>'));
            }
            if(this.derivedClasses.length > 0) {
                content.append('<h3>Subclasses</h3>');
                var div = $('<div class="ts_classcontent ts_classsubclasses"/>');
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
            content.append('<h3>Members</h3>');
            this.members.forEach(function (m) {
                if(m.toHTML) {
                    var html = m.toHTML();
                    if(html) {
                        var classMemberDiv = $('<div class="ts_classcontent ts_classmember"/>');
                        classMemberDiv.append(html);
                        classMemberDiv.append($('<div class="ts_classmemberdescription" />').append(m.docs));
                        content.append(classMemberDiv);
                    }
                }
            });
            return p;
        };
        return ASTClass;
    })(ASTModuleMember);
    DTSDoc.ASTClass = ASTClass;    
    var ASTInterfaceMember = (function () {
        function ASTInterfaceMember() { }
        ASTInterfaceMember.prototype.toHTML = function (mod) {
            return undefined;
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
        ASTIIndexer.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_indexer"/>');
            span.append("[" + this.name);
            span.append(this.indexType.toHTML(mod));
            span.append("]");
            span.append(this.retType.toHTML(mod));
            return span;
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
        function ASTIConstructor(params, type) {
                _super.call(this);
            this.params = params;
            this.type = type;
        }
        ASTIConstructor.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_constructor"/>');
            span.append("new");
            span.append(this.params.toHTML(mod));
            span.append(this.type.toHTML(mod));
            return span;
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
        ASTIField.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code" />');
            span.append(this.name + (this.isOptional ? "?" : ""));
            span.append(this.type.toHTML(mod));
            return span;
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
        ASTIFunction.prototype.toHTML = function (mod) {
            var span = $('<span class="ts_code ts_method ts_signiture"/>');
            span.append(this.params.toHTML(mod));
            span.append(this.retType.toHTML(mod));
            return span;
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
        ASTInterface.prototype.toHTML = function () {
            var _this = this;
            var section = $('<section class="ts_modulemember ts_interface"/>');
            section.append(this.createTitle());
            var content = $('<section class="ts_modulemember_content"/>');
            if(this.docs) {
                content.append('<h3>Description</h3>');
                content.append($('<div class="ts_classcontent ts_classdescription">').html(this.docs.text));
            }
            if(this.type.members.length > 0) {
                content.append('<h3>Members</h3>');
                this.type.members.forEach(function (m) {
                    content.append($('<div class="ts_classcontent ts_classmember ts_class_member_title"/>').append(m.toHTML(_this.parent)));
                    if(m.docs) {
                        content.append(m.docs.toHTML(_this.parent));
                    }
                });
            }
            if(content.children().length > 0) {
                section.append(content);
            }
            return section;
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
        ASTFunction.prototype.toHTML = function () {
            var p = $('<section class="ts_modulemember ts_function"/>');
            p.append(this.createTitle());
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            var span = $('<span class="ts_code ts_method"/>').appendTo(content);
            span.append("function " + this.name);
            span.append(this.sign.toHTML(this.parent));
            if(this.docs) {
                p.append($('<p class="ts_classmember_description"/>').html(this.docs.text));
                p.append(this.docs.toHTML(undefined));
            }
            return p;
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
        ASTCallable.prototype.toHTML = function () {
            var p = $('<section class="ts_modulemember ts_function"/>');
            p.append(this.createTitle());
            var content = $('<section class="ts_modulemember_content"/>').appendTo(p);
            var span = $('<span class="ts_code ts_method"/>').appendTo(content);
            span.append("function");
            span.append(this.sign.toHTML(this.parent));
            return p;
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
        ASTEnum.prototype.toHTML = function () {
            var section = $('<section class="ts_modulemember ts_enum"/>');
            section.append(this.createTitle());
            if(this.members.length > 0) {
                section.append($('<h3>Members</h3>'));
                this.members.forEach(function (m) {
                    var outer = $('<div class="ts_classcontent ts_classmember" />');
                    var content = $('<div class="ts_code ts_class_member_title ts_method"/>').text(m).appendTo(outer);
                    section.append(outer);
                });
            }
            return section;
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
        ASTVar.prototype.toHTML = function () {
            var section = $('<section class="ts_modulemember ts_var" />');
            section.append(this.createTitle());
            var content = $('<section class="ts_modulemember_content"/>').appendTo(section);
            content.append($('<span class="ts_code"/>').append($('<span class="ts_reserved ts_reserved_var">var</span>')).append(this.name).append(this.type.toHTML(this.parent)));
            if(this.docs) {
                section.append($('<p class="ts_classmember_description"/>').html(this.docs.text));
                section.append(this.docs.toHTML(undefined));
            }
            return section;
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
            section.append(this.createTitle());
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
    var ASTProgram = (function () {
        function ASTProgram(global) {
            this.global = global;
        }
        return ASTProgram;
    })();
    DTSDoc.ASTProgram = ASTProgram;    
})(DTSDoc || (DTSDoc = {}));
var DTSDoc;
(function (DTSDoc) {
    var lineComment = regexp(/\/\/[^\n]*(\n|$)/g);
    var blockComment = regexp(/\/\*(?!\*)(.|\r|\n)*?\*\//gm);
    var comment = or(lineComment, blockComment);
    var whitespace = regexp(/[ \t\r\n]+/gm);
    var spaces = many(or(whitespace, comment));
    function lexme(p) {
        return seq(function (s) {
            var v = s(p);
            s(spaces);
            return v;
        });
    }
    DTSDoc.reserved = function (s) {
        return lexme(string(s));
    };
    var keyword = function (s) {
        return lexme(regexp(new RegExp(s + '(?!(\\w|_))', 'g')));
    };
    var colon = DTSDoc.reserved(":");
    var semi = DTSDoc.reserved(";");
    var comma = DTSDoc.reserved(",");
    var pExport = optional(DTSDoc.reserved("export"));
    var pDeclare = optional(DTSDoc.reserved("declare"));
    var pStatic = option(false, map(function () {
        return true;
    }, keyword("static")));
    var pIdentifierPath = lexme(regexp(/([_$a-zA-Z][_$a-zA-Z0-9]*)(\.([_$a-zA-Z][_$a-zA-Z0-9]*))*/g));
    var pIdentifier = lexme(regexp(/[_$a-zA-Z][_$a-zA-Z0-9]*(?![_$a-zA-Z0-9])/g));
    var pStringRiteral = lexme(regexp(/(\"[^\"]+\"|\'[^\']+\')/g));
    var pAccessibility = option(DTSDoc.Accessibility.Public, or(map(function () {
        return DTSDoc.Accessibility.Public;
    }, DTSDoc.reserved("public")), map(function () {
        return DTSDoc.Accessibility.Private;
    }, DTSDoc.reserved("private"))));
    var rDocumentComment = /\/\*\*((\*(?!\/)|[^*])*)\*\//gm;
    var rTags = /\@([a-z]+)\s+(([^@]|\@(?![a-z]))*)/gm;
    var pDocumentComment = option(undefined, lexme(seq(function (s) {
        var text = s(regexp(rDocumentComment));
        s(whitespace);
        if(s.success()) {
            rDocumentComment.lastIndex = 0;
            var innerText = rDocumentComment.exec(text)[1].split('*').join(' ');
            var pDescription = /([^@]|\@(?![a-z]))*/gm;
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
    DTSDoc.pProgram = seq(function (s) {
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
})(DTSDoc || (DTSDoc = {}));
var typeNameLinks = {
    "string": "lib.d.ts.html#String",
    "bool": "lib.d.ts.html#Boolean",
    "number": "lib.d.ts.html#Number",
    "PropertyDescriptor": "lib.d.ts.html#PropertyDescriptor",
    "PropertyDescriptorMap": "lib.d.ts.html#PropertyDescriptorMap",
    "Object": "lib.d.ts.html#Object",
    "Function": "lib.d.ts.html#Function",
    "IArguments": "lib.d.ts.html#IArguments",
    "String": "lib.d.ts.html#String",
    "Boolean": "lib.d.ts.html#Boolean",
    "Number": "lib.d.ts.html#Number",
    "Math": "lib.d.ts.html#Math",
    "Date": "lib.d.ts.html#Date",
    "RegExpExecArray": "lib.d.ts.html#RegExpExecArray",
    "RegExp": "lib.d.ts.html#RegExp",
    "Error": "lib.d.ts.html#Error",
    "EvalError": "lib.d.ts.html#EvalError",
    "RangeError": "lib.d.ts.html#RangeError",
    "ReferenceError": "lib.d.ts.html#ReferenceError",
    "SyntaxError": "lib.d.ts.html#SyntaxError",
    "TypeError": "lib.d.ts.html#TypeError",
    "URIError": "lib.d.ts.html#URIError",
    "JSON": "lib.d.ts.html#JSON",
    "Array": "lib.d.ts.html#Array",
    "ArrayBuffer": "lib.d.ts.html#ArrayBuffer",
    "ArrayBufferView": "lib.d.ts.html#ArrayBufferView",
    "Int8Array": "lib.d.ts.html#Int8Array",
    "Uint8Array": "lib.d.ts.html#Uint8Array",
    "Int16Array": "lib.d.ts.html#Int16Array",
    "Uint16Array": "lib.d.ts.html#Uint16Array",
    "Int32Array": "lib.d.ts.html#Int32Array",
    "Uint32Array": "lib.d.ts.html#Uint32Array",
    "Float32Array": "lib.d.ts.html#Float32Array",
    "Float64Array": "lib.d.ts.html#Float64Array",
    "DataView": "lib.d.ts.html#DataView",
    "NavigatorID": "lib.d.ts.html#NavigatorID",
    "HTMLTableElement": "lib.d.ts.html#HTMLTableElement",
    "TreeWalker": "lib.d.ts.html#TreeWalker",
    "GetSVGDocument": "lib.d.ts.html#GetSVGDocument",
    "HTMLHtmlElementDOML2Deprecated": "lib.d.ts.html#HTMLHtmlElementDOML2Deprecated",
    "SVGPathSegCurvetoQuadraticRel": "lib.d.ts.html#SVGPathSegCurvetoQuadraticRel",
    "Performance": "lib.d.ts.html#Performance",
    "SVGSVGElementEventHandlers": "lib.d.ts.html#SVGSVGElementEventHandlers",
    "MSDataBindingTableExtensions": "lib.d.ts.html#MSDataBindingTableExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLParagraphElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLParagraphElement",
    "CompositionEvent": "lib.d.ts.html#CompositionEvent",
    "SVGMarkerElement": "lib.d.ts.html#SVGMarkerElement",
    "WindowTimers": "lib.d.ts.html#WindowTimers",
    "CSSStyleDeclaration": "lib.d.ts.html#CSSStyleDeclaration",
    "SVGGElement": "lib.d.ts.html#SVGGElement",
    "MSStyleCSSProperties": "lib.d.ts.html#MSStyleCSSProperties",
    "MSCSSStyleSheetExtensions": "lib.d.ts.html#MSCSSStyleSheetExtensions",
    "Navigator": "lib.d.ts.html#Navigator",
    "SVGPathSegCurvetoCubicSmoothAbs": "lib.d.ts.html#SVGPathSegCurvetoCubicSmoothAbs",
    "MSBorderColorStyle_HTMLFrameSetElement": "lib.d.ts.html#MSBorderColorStyle_HTMLFrameSetElement",
    "SVGZoomEvent": "lib.d.ts.html#SVGZoomEvent",
    "NodeSelector": "lib.d.ts.html#NodeSelector",
    "HTMLTableDataCellElement": "lib.d.ts.html#HTMLTableDataCellElement",
    "MSHTMLDirectoryElementExtensions": "lib.d.ts.html#MSHTMLDirectoryElementExtensions",
    "HTMLBaseElement": "lib.d.ts.html#HTMLBaseElement",
    "ClientRect": "lib.d.ts.html#ClientRect",
    "PositionErrorCallback": "lib.d.ts.html#PositionErrorCallback",
    "DOMImplementation": "lib.d.ts.html#DOMImplementation",
    "DOML2DeprecatedWidthStyle_HTMLBlockElement": "lib.d.ts.html#DOML2DeprecatedWidthStyle_HTMLBlockElement",
    "SVGUnitTypes": "lib.d.ts.html#SVGUnitTypes",
    "DocumentRange": "lib.d.ts.html#DocumentRange",
    "MSHTMLDocumentExtensions": "lib.d.ts.html#MSHTMLDocumentExtensions",
    "CSS2Properties": "lib.d.ts.html#CSS2Properties",
    "MSImageResourceExtensions_HTMLInputElement": "lib.d.ts.html#MSImageResourceExtensions_HTMLInputElement",
    "MSHTMLEmbedElementExtensions": "lib.d.ts.html#MSHTMLEmbedElementExtensions",
    "MSHTMLModElementExtensions": "lib.d.ts.html#MSHTMLModElementExtensions",
    "Element": "lib.d.ts.html#Element",
    "SVGDocument": "lib.d.ts.html#SVGDocument",
    "HTMLNextIdElement": "lib.d.ts.html#HTMLNextIdElement",
    "SVGPathSegMovetoRel": "lib.d.ts.html#SVGPathSegMovetoRel",
    "SVGLineElement": "lib.d.ts.html#SVGLineElement",
    "HTMLParagraphElement": "lib.d.ts.html#HTMLParagraphElement",
    "MSHTMLTextAreaElementExtensions": "lib.d.ts.html#MSHTMLTextAreaElementExtensions",
    "ErrorFunction": "lib.d.ts.html#ErrorFunction",
    "HTMLAreasCollection": "lib.d.ts.html#HTMLAreasCollection",
    "SVGDescElement": "lib.d.ts.html#SVGDescElement",
    "Node": "lib.d.ts.html#Node",
    "MSHTMLLegendElementExtensions": "lib.d.ts.html#MSHTMLLegendElementExtensions",
    "MSCSSStyleDeclarationExtensions": "lib.d.ts.html#MSCSSStyleDeclarationExtensions",
    "SVGPathSegCurvetoQuadraticSmoothRel": "lib.d.ts.html#SVGPathSegCurvetoQuadraticSmoothRel",
    "DOML2DeprecatedAlignmentStyle_HTMLTableRowElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLTableRowElement",
    "DOML2DeprecatedBorderStyle_HTMLObjectElement": "lib.d.ts.html#DOML2DeprecatedBorderStyle_HTMLObjectElement",
    "MSHTMLSpanElementExtensions": "lib.d.ts.html#MSHTMLSpanElementExtensions",
    "MSHTMLObjectElementExtensions": "lib.d.ts.html#MSHTMLObjectElementExtensions",
    "DOML2DeprecatedListSpaceReduction": "lib.d.ts.html#DOML2DeprecatedListSpaceReduction",
    "CSS3Properties": "lib.d.ts.html#CSS3Properties",
    "MSScriptHost": "lib.d.ts.html#MSScriptHost",
    "SVGClipPathElement": "lib.d.ts.html#SVGClipPathElement",
    "MouseEvent": "lib.d.ts.html#MouseEvent",
    "DOML2DeprecatedAlignmentStyle_HTMLTableElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLTableElement",
    "RangeException": "lib.d.ts.html#RangeException",
    "DOML2DeprecatedAlignmentStyle_HTMLHRElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLHRElement",
    "SVGTextPositioningElement": "lib.d.ts.html#SVGTextPositioningElement",
    "HTMLAppletElement": "lib.d.ts.html#HTMLAppletElement",
    "MSHTMLFieldSetElementExtensions": "lib.d.ts.html#MSHTMLFieldSetElementExtensions",
    "DocumentEvent": "lib.d.ts.html#DocumentEvent",
    "MSHTMLUnknownElementExtensions": "lib.d.ts.html#MSHTMLUnknownElementExtensions",
    "TextMetrics": "lib.d.ts.html#TextMetrics",
    "DOML2DeprecatedWordWrapSuppression_HTMLBodyElement": "lib.d.ts.html#DOML2DeprecatedWordWrapSuppression_HTMLBodyElement",
    "HTMLOListElement": "lib.d.ts.html#HTMLOListElement",
    "MSHTMLTableCaptionElementExtensions": "lib.d.ts.html#MSHTMLTableCaptionElementExtensions",
    "SVGAnimatedString": "lib.d.ts.html#SVGAnimatedString",
    "SVGPathSegLinetoVerticalRel": "lib.d.ts.html#SVGPathSegLinetoVerticalRel",
    "CDATASection": "lib.d.ts.html#CDATASection",
    "StyleMedia": "lib.d.ts.html#StyleMedia",
    "TextRange": "lib.d.ts.html#TextRange",
    "HTMLSelectElement": "lib.d.ts.html#HTMLSelectElement",
    "CSSStyleSheet": "lib.d.ts.html#CSSStyleSheet",
    "HTMLBlockElement": "lib.d.ts.html#HTMLBlockElement",
    "SVGTests": "lib.d.ts.html#SVGTests",
    "MSSelection": "lib.d.ts.html#MSSelection",
    "MSHTMLDListElementExtensions": "lib.d.ts.html#MSHTMLDListElementExtensions",
    "HTMLMetaElement": "lib.d.ts.html#HTMLMetaElement",
    "Selection": "lib.d.ts.html#Selection",
    "SVGAnimatedAngle": "lib.d.ts.html#SVGAnimatedAngle",
    "SVGPatternElement": "lib.d.ts.html#SVGPatternElement",
    "SVGScriptElement": "lib.d.ts.html#SVGScriptElement",
    "HTMLDDElement": "lib.d.ts.html#HTMLDDElement",
    "NodeIterator": "lib.d.ts.html#NodeIterator",
    "CSSStyleRule": "lib.d.ts.html#CSSStyleRule",
    "MSDataBindingRecordSetReadonlyExtensions": "lib.d.ts.html#MSDataBindingRecordSetReadonlyExtensions",
    "HTMLLinkElement": "lib.d.ts.html#HTMLLinkElement",
    "SVGViewElement": "lib.d.ts.html#SVGViewElement",
    "MSHTMLAppletElementExtensions": "lib.d.ts.html#MSHTMLAppletElementExtensions",
    "SVGLocatable": "lib.d.ts.html#SVGLocatable",
    "HTMLFontElement": "lib.d.ts.html#HTMLFontElement",
    "MSHTMLTableElementExtensions": "lib.d.ts.html#MSHTMLTableElementExtensions",
    "SVGTitleElement": "lib.d.ts.html#SVGTitleElement",
    "ControlRangeCollection": "lib.d.ts.html#ControlRangeCollection",
    "DOML2DeprecatedAlignmentStyle_HTMLImageElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLImageElement",
    "MSHTMLFrameElementExtensions": "lib.d.ts.html#MSHTMLFrameElementExtensions",
    "MSNamespaceInfo": "lib.d.ts.html#MSNamespaceInfo",
    "WindowSessionStorage": "lib.d.ts.html#WindowSessionStorage",
    "SVGAnimatedTransformList": "lib.d.ts.html#SVGAnimatedTransformList",
    "HTMLTableCaptionElement": "lib.d.ts.html#HTMLTableCaptionElement",
    "HTMLOptionElement": "lib.d.ts.html#HTMLOptionElement",
    "HTMLMapElement": "lib.d.ts.html#HTMLMapElement",
    "HTMLMenuElement": "lib.d.ts.html#HTMLMenuElement",
    "MouseWheelEvent": "lib.d.ts.html#MouseWheelEvent",
    "SVGFitToViewBox": "lib.d.ts.html#SVGFitToViewBox",
    "MSHTMLAnchorElementExtensions": "lib.d.ts.html#MSHTMLAnchorElementExtensions",
    "SVGPointList": "lib.d.ts.html#SVGPointList",
    "MSElementCSSInlineStyleExtensions": "lib.d.ts.html#MSElementCSSInlineStyleExtensions",
    "SVGAnimatedLengthList": "lib.d.ts.html#SVGAnimatedLengthList",
    "MSHTMLTableDataCellElementExtensions": "lib.d.ts.html#MSHTMLTableDataCellElementExtensions",
    "Window": "lib.d.ts.html#Window",
    "SVGAnimatedPreserveAspectRatio": "lib.d.ts.html#SVGAnimatedPreserveAspectRatio",
    "MSSiteModeEvent": "lib.d.ts.html#MSSiteModeEvent",
    "MSCSSStyleRuleExtensions": "lib.d.ts.html#MSCSSStyleRuleExtensions",
    "StyleSheetPageList": "lib.d.ts.html#StyleSheetPageList",
    "HTMLCollection": "lib.d.ts.html#HTMLCollection",
    "MSCSSProperties": "lib.d.ts.html#MSCSSProperties",
    "HTMLImageElement": "lib.d.ts.html#HTMLImageElement",
    "HTMLAreaElement": "lib.d.ts.html#HTMLAreaElement",
    "EventTarget": "lib.d.ts.html#EventTarget",
    "SVGAngle": "lib.d.ts.html#SVGAngle",
    "HTMLButtonElement": "lib.d.ts.html#HTMLButtonElement",
    "MSHTMLLabelElementExtensions": "lib.d.ts.html#MSHTMLLabelElementExtensions",
    "HTMLSourceElement": "lib.d.ts.html#HTMLSourceElement",
    "CanvasGradient": "lib.d.ts.html#CanvasGradient",
    "KeyboardEvent": "lib.d.ts.html#KeyboardEvent",
    "Document": "lib.d.ts.html#Document",
    "MessageEvent": "lib.d.ts.html#MessageEvent",
    "SVGElement": "lib.d.ts.html#SVGElement",
    "HTMLScriptElement": "lib.d.ts.html#HTMLScriptElement",
    "MSHTMLBodyElementExtensions": "lib.d.ts.html#MSHTMLBodyElementExtensions",
    "HTMLTableRowElement": "lib.d.ts.html#HTMLTableRowElement",
    "MSCommentExtensions": "lib.d.ts.html#MSCommentExtensions",
    "DOML2DeprecatedMarginStyle_HTMLMarqueeElement": "lib.d.ts.html#DOML2DeprecatedMarginStyle_HTMLMarqueeElement",
    "MSCSSRuleList": "lib.d.ts.html#MSCSSRuleList",
    "CanvasRenderingContext2D": "lib.d.ts.html#CanvasRenderingContext2D",
    "SVGPathSegLinetoHorizontalAbs": "lib.d.ts.html#SVGPathSegLinetoHorizontalAbs",
    "DOML2DeprecatedAlignmentStyle_HTMLObjectElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLObjectElement",
    "DOML2DeprecatedBorderStyle_MSHTMLIFrameElementExtensions": "lib.d.ts.html#DOML2DeprecatedBorderStyle_MSHTMLIFrameElementExtensions",
    "MSHTMLElementRangeExtensions": "lib.d.ts.html#MSHTMLElementRangeExtensions",
    "SVGPathSegArcAbs": "lib.d.ts.html#SVGPathSegArcAbs",
    "MSScreenExtensions": "lib.d.ts.html#MSScreenExtensions",
    "HTMLHtmlElement": "lib.d.ts.html#HTMLHtmlElement",
    "MSBorderColorStyle": "lib.d.ts.html#MSBorderColorStyle",
    "SVGTransformList": "lib.d.ts.html#SVGTransformList",
    "SVGPathSegClosePath": "lib.d.ts.html#SVGPathSegClosePath",
    "DOML2DeprecatedMarginStyle_MSHTMLIFrameElementExtensions": "lib.d.ts.html#DOML2DeprecatedMarginStyle_MSHTMLIFrameElementExtensions",
    "HTMLFrameElement": "lib.d.ts.html#HTMLFrameElement",
    "SVGAnimatedLength": "lib.d.ts.html#SVGAnimatedLength",
    "CSSMediaRule": "lib.d.ts.html#CSSMediaRule",
    "HTMLQuoteElement": "lib.d.ts.html#HTMLQuoteElement",
    "SVGDefsElement": "lib.d.ts.html#SVGDefsElement",
    "SVGAnimatedPoints": "lib.d.ts.html#SVGAnimatedPoints",
    "WindowModal": "lib.d.ts.html#WindowModal",
    "MSHTMLButtonElementExtensions": "lib.d.ts.html#MSHTMLButtonElementExtensions",
    "XMLHttpRequest": "lib.d.ts.html#XMLHttpRequest",
    "HTMLTableHeaderCellElement": "lib.d.ts.html#HTMLTableHeaderCellElement",
    "HTMLDListElement": "lib.d.ts.html#HTMLDListElement",
    "MSDataBindingExtensions": "lib.d.ts.html#MSDataBindingExtensions",
    "SVGEllipseElement": "lib.d.ts.html#SVGEllipseElement",
    "SVGPathSegLinetoHorizontalRel": "lib.d.ts.html#SVGPathSegLinetoHorizontalRel",
    "SVGAElement": "lib.d.ts.html#SVGAElement",
    "MSHTMLMetaElementExtensions": "lib.d.ts.html#MSHTMLMetaElementExtensions",
    "SVGStylable": "lib.d.ts.html#SVGStylable",
    "MSHTMLTableCellElementExtensions": "lib.d.ts.html#MSHTMLTableCellElementExtensions",
    "HTMLFrameSetElement": "lib.d.ts.html#HTMLFrameSetElement",
    "SVGTransformable": "lib.d.ts.html#SVGTransformable",
    "Screen": "lib.d.ts.html#Screen",
    "NavigatorGeolocation": "lib.d.ts.html#NavigatorGeolocation",
    "Coordinates": "lib.d.ts.html#Coordinates",
    "DOML2DeprecatedAlignmentStyle_HTMLTableColElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLTableColElement",
    "EventListener": "lib.d.ts.html#EventListener",
    "SVGLangSpace": "lib.d.ts.html#SVGLangSpace",
    "DataTransfer": "lib.d.ts.html#DataTransfer",
    "FocusEvent": "lib.d.ts.html#FocusEvent",
    "Range": "lib.d.ts.html#Range",
    "MSHTMLPreElementExtensions": "lib.d.ts.html#MSHTMLPreElementExtensions",
    "SVGPoint": "lib.d.ts.html#SVGPoint",
    "MSPluginsCollection": "lib.d.ts.html#MSPluginsCollection",
    "MSHTMLFontElementExtensions": "lib.d.ts.html#MSHTMLFontElementExtensions",
    "SVGAnimatedNumberList": "lib.d.ts.html#SVGAnimatedNumberList",
    "SVGSVGElement": "lib.d.ts.html#SVGSVGElement",
    "HTMLLabelElement": "lib.d.ts.html#HTMLLabelElement",
    "MSResourceMetadata": "lib.d.ts.html#MSResourceMetadata",
    "MSHTMLQuoteElementExtensions": "lib.d.ts.html#MSHTMLQuoteElementExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLIFrameElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLIFrameElement",
    "HTMLLegendElement": "lib.d.ts.html#HTMLLegendElement",
    "HTMLDirectoryElement": "lib.d.ts.html#HTMLDirectoryElement",
    "NavigatorAbilities": "lib.d.ts.html#NavigatorAbilities",
    "MSHTMLImageElementExtensions": "lib.d.ts.html#MSHTMLImageElementExtensions",
    "SVGAnimatedInteger": "lib.d.ts.html#SVGAnimatedInteger",
    "SVGTextElement": "lib.d.ts.html#SVGTextElement",
    "SVGTSpanElement": "lib.d.ts.html#SVGTSpanElement",
    "HTMLLIElement": "lib.d.ts.html#HTMLLIElement",
    "SVGPathSegLinetoVerticalAbs": "lib.d.ts.html#SVGPathSegLinetoVerticalAbs",
    "ViewCSS": "lib.d.ts.html#ViewCSS",
    "MSAttrExtensions": "lib.d.ts.html#MSAttrExtensions",
    "MSStorageExtensions": "lib.d.ts.html#MSStorageExtensions",
    "SVGStyleElement": "lib.d.ts.html#SVGStyleElement",
    "MSCurrentStyleCSSProperties": "lib.d.ts.html#MSCurrentStyleCSSProperties",
    "MSLinkStyleExtensions": "lib.d.ts.html#MSLinkStyleExtensions",
    "MSHTMLCollectionExtensions": "lib.d.ts.html#MSHTMLCollectionExtensions",
    "DOML2DeprecatedWordWrapSuppression_HTMLDivElement": "lib.d.ts.html#DOML2DeprecatedWordWrapSuppression_HTMLDivElement",
    "DocumentTraversal": "lib.d.ts.html#DocumentTraversal",
    "Storage": "lib.d.ts.html#Storage",
    "HTMLTableHeaderCellScope": "lib.d.ts.html#HTMLTableHeaderCellScope",
    "HTMLIFrameElement": "lib.d.ts.html#HTMLIFrameElement",
    "MSNavigatorAbilities": "lib.d.ts.html#MSNavigatorAbilities",
    "TextRangeCollection": "lib.d.ts.html#TextRangeCollection",
    "HTMLBodyElement": "lib.d.ts.html#HTMLBodyElement",
    "DocumentType": "lib.d.ts.html#DocumentType",
    "MSHTMLInputElementExtensions": "lib.d.ts.html#MSHTMLInputElementExtensions",
    "DOML2DeprecatedAlignmentStyle_HTMLLegendElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLLegendElement",
    "SVGRadialGradientElement": "lib.d.ts.html#SVGRadialGradientElement",
    "MutationEvent": "lib.d.ts.html#MutationEvent",
    "DragEvent": "lib.d.ts.html#DragEvent",
    "DOML2DeprecatedWidthStyle_HTMLTableCellElement": "lib.d.ts.html#DOML2DeprecatedWidthStyle_HTMLTableCellElement",
    "HTMLTableSectionElement": "lib.d.ts.html#HTMLTableSectionElement",
    "DOML2DeprecatedListNumberingAndBulletStyle": "lib.d.ts.html#DOML2DeprecatedListNumberingAndBulletStyle",
    "HTMLInputElement": "lib.d.ts.html#HTMLInputElement",
    "HTMLAnchorElement": "lib.d.ts.html#HTMLAnchorElement",
    "SVGImageElement": "lib.d.ts.html#SVGImageElement",
    "MSElementExtensions": "lib.d.ts.html#MSElementExtensions",
    "HTMLParamElement": "lib.d.ts.html#HTMLParamElement",
    "MSHTMLDocumentViewExtensions": "lib.d.ts.html#MSHTMLDocumentViewExtensions",
    "SVGAnimatedNumber": "lib.d.ts.html#SVGAnimatedNumber",
    "PerformanceTiming": "lib.d.ts.html#PerformanceTiming",
    "DOML2DeprecatedAlignmentStyle_HTMLInputElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLInputElement",
    "HTMLPreElement": "lib.d.ts.html#HTMLPreElement",
    "EventException": "lib.d.ts.html#EventException",
    "MSBorderColorHighlightStyle_HTMLTableCellElement": "lib.d.ts.html#MSBorderColorHighlightStyle_HTMLTableCellElement",
    "DOMHTMLImplementation": "lib.d.ts.html#DOMHTMLImplementation",
    "NavigatorOnLine": "lib.d.ts.html#NavigatorOnLine",
    "SVGElementEventHandlers": "lib.d.ts.html#SVGElementEventHandlers",
    "WindowLocalStorage": "lib.d.ts.html#WindowLocalStorage",
    "SVGMetadataElement": "lib.d.ts.html#SVGMetadataElement",
    "SVGPathSegArcRel": "lib.d.ts.html#SVGPathSegArcRel",
    "SVGPathSegMovetoAbs": "lib.d.ts.html#SVGPathSegMovetoAbs",
    "SVGStringList": "lib.d.ts.html#SVGStringList",
    "XDomainRequest": "lib.d.ts.html#XDomainRequest",
    "DOML2DeprecatedBackgroundColorStyle": "lib.d.ts.html#DOML2DeprecatedBackgroundColorStyle",
    "ElementTraversal": "lib.d.ts.html#ElementTraversal",
    "SVGLength": "lib.d.ts.html#SVGLength",
    "SVGPolygonElement": "lib.d.ts.html#SVGPolygonElement",
    "HTMLPhraseElement": "lib.d.ts.html#HTMLPhraseElement",
    "MSHTMLAreaElementExtensions": "lib.d.ts.html#MSHTMLAreaElementExtensions",
    "SVGPathSegCurvetoCubicRel": "lib.d.ts.html#SVGPathSegCurvetoCubicRel",
    "MSEventObj": "lib.d.ts.html#MSEventObj",
    "SVGTextContentElement": "lib.d.ts.html#SVGTextContentElement",
    "DOML2DeprecatedColorProperty": "lib.d.ts.html#DOML2DeprecatedColorProperty",
    "MSHTMLLIElementExtensions": "lib.d.ts.html#MSHTMLLIElementExtensions",
    "HTMLCanvasElement": "lib.d.ts.html#HTMLCanvasElement",
    "HTMLTitleElement": "lib.d.ts.html#HTMLTitleElement",
    "Location": "lib.d.ts.html#Location",
    "HTMLStyleElement": "lib.d.ts.html#HTMLStyleElement",
    "MSHTMLOptGroupElementExtensions": "lib.d.ts.html#MSHTMLOptGroupElementExtensions",
    "MSBorderColorHighlightStyle": "lib.d.ts.html#MSBorderColorHighlightStyle",
    "DOML2DeprecatedSizeProperty_HTMLBaseFontElement": "lib.d.ts.html#DOML2DeprecatedSizeProperty_HTMLBaseFontElement",
    "SVGTransform": "lib.d.ts.html#SVGTransform",
    "MSCSSFilter": "lib.d.ts.html#MSCSSFilter",
    "UIEvent": "lib.d.ts.html#UIEvent",
    "ViewCSS_SVGSVGElement": "lib.d.ts.html#ViewCSS_SVGSVGElement",
    "SVGURIReference": "lib.d.ts.html#SVGURIReference",
    "SVGPathSeg": "lib.d.ts.html#SVGPathSeg",
    "WheelEvent": "lib.d.ts.html#WheelEvent",
    "DOML2DeprecatedAlignmentStyle_HTMLDivElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLDivElement",
    "MSEventAttachmentTarget": "lib.d.ts.html#MSEventAttachmentTarget",
    "SVGNumber": "lib.d.ts.html#SVGNumber",
    "SVGPathElement": "lib.d.ts.html#SVGPathElement",
    "MSCompatibleInfo": "lib.d.ts.html#MSCompatibleInfo",
    "MSHTMLDocumentEventExtensions": "lib.d.ts.html#MSHTMLDocumentEventExtensions",
    "Text": "lib.d.ts.html#Text",
    "SVGAnimatedRect": "lib.d.ts.html#SVGAnimatedRect",
    "CSSNamespaceRule": "lib.d.ts.html#CSSNamespaceRule",
    "HTMLUnknownElement": "lib.d.ts.html#HTMLUnknownElement",
    "SVGPathSegList": "lib.d.ts.html#SVGPathSegList",
    "HTMLAudioElement": "lib.d.ts.html#HTMLAudioElement",
    "MSImageResourceExtensions": "lib.d.ts.html#MSImageResourceExtensions",
    "MSBorderColorHighlightStyle_HTMLTableRowElement": "lib.d.ts.html#MSBorderColorHighlightStyle_HTMLTableRowElement",
    "PositionError": "lib.d.ts.html#PositionError",
    "BrowserPublic": "lib.d.ts.html#BrowserPublic",
    "HTMLTableCellElement": "lib.d.ts.html#HTMLTableCellElement",
    "MSNamespaceInfoCollection": "lib.d.ts.html#MSNamespaceInfoCollection",
    "SVGElementInstance": "lib.d.ts.html#SVGElementInstance",
    "MSHTMLUListElementExtensions": "lib.d.ts.html#MSHTMLUListElementExtensions",
    "SVGCircleElement": "lib.d.ts.html#SVGCircleElement",
    "HTMLBaseFontElement": "lib.d.ts.html#HTMLBaseFontElement",
    "CustomEvent": "lib.d.ts.html#CustomEvent",
    "CSSImportRule": "lib.d.ts.html#CSSImportRule",
    "StyleSheetList": "lib.d.ts.html#StyleSheetList",
    "HTMLTextAreaElement": "lib.d.ts.html#HTMLTextAreaElement",
    "MSHTMLFormElementExtensions": "lib.d.ts.html#MSHTMLFormElementExtensions",
    "DOML2DeprecatedMarginStyle": "lib.d.ts.html#DOML2DeprecatedMarginStyle",
    "Geolocation": "lib.d.ts.html#Geolocation",
    "MSWindowModeless": "lib.d.ts.html#MSWindowModeless",
    "HTMLMarqueeElement": "lib.d.ts.html#HTMLMarqueeElement",
    "SVGRect": "lib.d.ts.html#SVGRect",
    "MSNodeExtensions": "lib.d.ts.html#MSNodeExtensions",
    "KeyboardEventExtensions": "lib.d.ts.html#KeyboardEventExtensions",
    "History": "lib.d.ts.html#History",
    "DocumentStyle": "lib.d.ts.html#DocumentStyle",
    "SVGPathSegCurvetoCubicAbs": "lib.d.ts.html#SVGPathSegCurvetoCubicAbs",
    "TimeRanges": "lib.d.ts.html#TimeRanges",
    "SVGPathSegCurvetoQuadraticAbs": "lib.d.ts.html#SVGPathSegCurvetoQuadraticAbs",
    "MSHTMLSelectElementExtensions": "lib.d.ts.html#MSHTMLSelectElementExtensions",
    "CSSRule": "lib.d.ts.html#CSSRule",
    "SVGPathSegLinetoAbs": "lib.d.ts.html#SVGPathSegLinetoAbs",
    "MSMouseEventExtensions": "lib.d.ts.html#MSMouseEventExtensions",
    "HTMLModElement": "lib.d.ts.html#HTMLModElement",
    "DOML2DeprecatedWordWrapSuppression": "lib.d.ts.html#DOML2DeprecatedWordWrapSuppression",
    "BeforeUnloadEvent": "lib.d.ts.html#BeforeUnloadEvent",
    "MSPopupWindow": "lib.d.ts.html#MSPopupWindow",
    "SVGMatrix": "lib.d.ts.html#SVGMatrix",
    "SVGUseElement": "lib.d.ts.html#SVGUseElement",
    "Event": "lib.d.ts.html#Event",
    "ImageData": "lib.d.ts.html#ImageData",
    "MSHTMLElementExtensions": "lib.d.ts.html#MSHTMLElementExtensions",
    "HTMLTableColElement": "lib.d.ts.html#HTMLTableColElement",
    "HTMLDocument": "lib.d.ts.html#HTMLDocument",
    "SVGException": "lib.d.ts.html#SVGException",
    "DOML2DeprecatedTableCellHeight": "lib.d.ts.html#DOML2DeprecatedTableCellHeight",
    "HTMLTableAlignment": "lib.d.ts.html#HTMLTableAlignment",
    "SVGAnimatedEnumeration": "lib.d.ts.html#SVGAnimatedEnumeration",
    "SVGLinearGradientElement": "lib.d.ts.html#SVGLinearGradientElement",
    "DOML2DeprecatedSizeProperty": "lib.d.ts.html#DOML2DeprecatedSizeProperty",
    "MSHTMLHeadingElementExtensions": "lib.d.ts.html#MSHTMLHeadingElementExtensions",
    "MSBorderColorStyle_HTMLTableCellElement": "lib.d.ts.html#MSBorderColorStyle_HTMLTableCellElement",
    "DOML2DeprecatedWidthStyle_HTMLHRElement": "lib.d.ts.html#DOML2DeprecatedWidthStyle_HTMLHRElement",
    "HTMLUListElement": "lib.d.ts.html#HTMLUListElement",
    "SVGRectElement": "lib.d.ts.html#SVGRectElement",
    "DOML2DeprecatedBorderStyle": "lib.d.ts.html#DOML2DeprecatedBorderStyle",
    "HTMLDivElement": "lib.d.ts.html#HTMLDivElement",
    "NavigatorDoNotTrack": "lib.d.ts.html#NavigatorDoNotTrack",
    "SVG1_1Properties": "lib.d.ts.html#SVG1_1Properties",
    "NamedNodeMap": "lib.d.ts.html#NamedNodeMap",
    "MediaList": "lib.d.ts.html#MediaList",
    "SVGPathSegCurvetoQuadraticSmoothAbs": "lib.d.ts.html#SVGPathSegCurvetoQuadraticSmoothAbs",
    "SVGLengthList": "lib.d.ts.html#SVGLengthList",
    "SVGPathSegCurvetoCubicSmoothRel": "lib.d.ts.html#SVGPathSegCurvetoCubicSmoothRel",
    "MSWindowExtensions": "lib.d.ts.html#MSWindowExtensions",
    "ProcessingInstruction": "lib.d.ts.html#ProcessingInstruction",
    "MSBehaviorUrnsCollection": "lib.d.ts.html#MSBehaviorUrnsCollection",
    "CSSFontFaceRule": "lib.d.ts.html#CSSFontFaceRule",
    "DOML2DeprecatedBackgroundStyle": "lib.d.ts.html#DOML2DeprecatedBackgroundStyle",
    "TextEvent": "lib.d.ts.html#TextEvent",
    "MSHTMLHRElementExtensions": "lib.d.ts.html#MSHTMLHRElementExtensions",
    "AbstractView": "lib.d.ts.html#AbstractView",
    "DocumentFragment": "lib.d.ts.html#DocumentFragment",
    "DOML2DeprecatedAlignmentStyle_HTMLFieldSetElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLFieldSetElement",
    "SVGPolylineElement": "lib.d.ts.html#SVGPolylineElement",
    "DOML2DeprecatedWidthStyle": "lib.d.ts.html#DOML2DeprecatedWidthStyle",
    "DOML2DeprecatedAlignmentStyle_HTMLHeadingElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLHeadingElement",
    "SVGAnimatedPathData": "lib.d.ts.html#SVGAnimatedPathData",
    "Position": "lib.d.ts.html#Position",
    "BookmarkCollection": "lib.d.ts.html#BookmarkCollection",
    "CSSPageRule": "lib.d.ts.html#CSSPageRule",
    "WindowPerformance": "lib.d.ts.html#WindowPerformance",
    "HTMLBRElement": "lib.d.ts.html#HTMLBRElement",
    "MSHTMLDivElementExtensions": "lib.d.ts.html#MSHTMLDivElementExtensions",
    "DOML2DeprecatedBorderStyle_HTMLInputElement": "lib.d.ts.html#DOML2DeprecatedBorderStyle_HTMLInputElement",
    "HTMLSpanElement": "lib.d.ts.html#HTMLSpanElement",
    "HTMLHRElementDOML2Deprecated": "lib.d.ts.html#HTMLHRElementDOML2Deprecated",
    "HTMLHeadElement": "lib.d.ts.html#HTMLHeadElement",
    "NodeFilterCallback": "lib.d.ts.html#NodeFilterCallback",
    "HTMLHeadingElement": "lib.d.ts.html#HTMLHeadingElement",
    "HTMLFormElement": "lib.d.ts.html#HTMLFormElement",
    "SVGZoomAndPan": "lib.d.ts.html#SVGZoomAndPan",
    "MSEventExtensions": "lib.d.ts.html#MSEventExtensions",
    "HTMLMediaElement": "lib.d.ts.html#HTMLMediaElement",
    "ElementCSSInlineStyle": "lib.d.ts.html#ElementCSSInlineStyle",
    "DOMParser": "lib.d.ts.html#DOMParser",
    "MSMimeTypesCollection": "lib.d.ts.html#MSMimeTypesCollection",
    "StyleSheet": "lib.d.ts.html#StyleSheet",
    "DOML2DeprecatedBorderStyle_HTMLTableElement": "lib.d.ts.html#DOML2DeprecatedBorderStyle_HTMLTableElement",
    "DOML2DeprecatedWidthStyle_HTMLAppletElement": "lib.d.ts.html#DOML2DeprecatedWidthStyle_HTMLAppletElement",
    "SVGTextPathElement": "lib.d.ts.html#SVGTextPathElement",
    "NodeList": "lib.d.ts.html#NodeList",
    "HTMLDTElement": "lib.d.ts.html#HTMLDTElement",
    "XMLSerializer": "lib.d.ts.html#XMLSerializer",
    "StyleSheetPage": "lib.d.ts.html#StyleSheetPage",
    "DOML2DeprecatedWordWrapSuppression_HTMLDDElement": "lib.d.ts.html#DOML2DeprecatedWordWrapSuppression_HTMLDDElement",
    "MSHTMLTableRowElementExtensions": "lib.d.ts.html#MSHTMLTableRowElementExtensions",
    "SVGGradientElement": "lib.d.ts.html#SVGGradientElement",
    "DOML2DeprecatedTextFlowControl_HTMLBRElement": "lib.d.ts.html#DOML2DeprecatedTextFlowControl_HTMLBRElement",
    "MSHTMLParagraphElementExtensions": "lib.d.ts.html#MSHTMLParagraphElementExtensions",
    "NodeFilter": "lib.d.ts.html#NodeFilter",
    "MSBorderColorStyle_HTMLFrameElement": "lib.d.ts.html#MSBorderColorStyle_HTMLFrameElement",
    "MSHTMLOListElementExtensions": "lib.d.ts.html#MSHTMLOListElementExtensions",
    "DOML2DeprecatedWordWrapSuppression_HTMLDTElement": "lib.d.ts.html#DOML2DeprecatedWordWrapSuppression_HTMLDTElement",
    "ScreenView": "lib.d.ts.html#ScreenView",
    "DOML2DeprecatedMarginStyle_HTMLObjectElement": "lib.d.ts.html#DOML2DeprecatedMarginStyle_HTMLObjectElement",
    "DOML2DeprecatedMarginStyle_HTMLInputElement": "lib.d.ts.html#DOML2DeprecatedMarginStyle_HTMLInputElement",
    "MSHTMLTableSectionElementExtensions": "lib.d.ts.html#MSHTMLTableSectionElementExtensions",
    "HTMLFieldSetElement": "lib.d.ts.html#HTMLFieldSetElement",
    "MediaError": "lib.d.ts.html#MediaError",
    "SVGNumberList": "lib.d.ts.html#SVGNumberList",
    "HTMLBGSoundElement": "lib.d.ts.html#HTMLBGSoundElement",
    "HTMLElement": "lib.d.ts.html#HTMLElement",
    "Comment": "lib.d.ts.html#Comment",
    "CanvasPattern": "lib.d.ts.html#CanvasPattern",
    "HTMLHRElement": "lib.d.ts.html#HTMLHRElement",
    "MSHTMLFrameSetElementExtensions": "lib.d.ts.html#MSHTMLFrameSetElementExtensions",
    "DOML2DeprecatedTextFlowControl_HTMLBlockElement": "lib.d.ts.html#DOML2DeprecatedTextFlowControl_HTMLBlockElement",
    "PositionOptions": "lib.d.ts.html#PositionOptions",
    "HTMLObjectElement": "lib.d.ts.html#HTMLObjectElement",
    "MSHTMLMenuElementExtensions": "lib.d.ts.html#MSHTMLMenuElementExtensions",
    "DocumentView": "lib.d.ts.html#DocumentView",
    "StorageEvent": "lib.d.ts.html#StorageEvent",
    "HTMLEmbedElement": "lib.d.ts.html#HTMLEmbedElement",
    "CharacterData": "lib.d.ts.html#CharacterData",
    "DOML2DeprecatedAlignmentStyle_HTMLTableSectionElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLTableSectionElement",
    "HTMLOptGroupElement": "lib.d.ts.html#HTMLOptGroupElement",
    "HTMLIsIndexElement": "lib.d.ts.html#HTMLIsIndexElement",
    "SVGPathSegLinetoRel": "lib.d.ts.html#SVGPathSegLinetoRel",
    "MSHTMLDocumentSelection": "lib.d.ts.html#MSHTMLDocumentSelection",
    "DOMException": "lib.d.ts.html#DOMException",
    "MSCompatibleInfoCollection": "lib.d.ts.html#MSCompatibleInfoCollection",
    "MSHTMLIsIndexElementExtensions": "lib.d.ts.html#MSHTMLIsIndexElementExtensions",
    "SVGAnimatedBoolean": "lib.d.ts.html#SVGAnimatedBoolean",
    "SVGSwitchElement": "lib.d.ts.html#SVGSwitchElement",
    "MSHTMLIFrameElementExtensions": "lib.d.ts.html#MSHTMLIFrameElementExtensions",
    "SVGPreserveAspectRatio": "lib.d.ts.html#SVGPreserveAspectRatio",
    "Attr": "lib.d.ts.html#Attr",
    "MSBorderColorStyle_HTMLTableRowElement": "lib.d.ts.html#MSBorderColorStyle_HTMLTableRowElement",
    "DOML2DeprecatedAlignmentStyle_HTMLTableCaptionElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLTableCaptionElement",
    "PerformanceNavigation": "lib.d.ts.html#PerformanceNavigation",
    "HTMLBodyElementDOML2Deprecated": "lib.d.ts.html#HTMLBodyElementDOML2Deprecated",
    "SVGStopElement": "lib.d.ts.html#SVGStopElement",
    "PositionCallback": "lib.d.ts.html#PositionCallback",
    "SVGSymbolElement": "lib.d.ts.html#SVGSymbolElement",
    "SVGElementInstanceList": "lib.d.ts.html#SVGElementInstanceList",
    "MSDataBindingRecordSetExtensions": "lib.d.ts.html#MSDataBindingRecordSetExtensions",
    "CSSRuleList": "lib.d.ts.html#CSSRuleList",
    "MSHTMLTableColElementExtensions": "lib.d.ts.html#MSHTMLTableColElementExtensions",
    "LinkStyle": "lib.d.ts.html#LinkStyle",
    "MSHTMLMarqueeElementExtensions": "lib.d.ts.html#MSHTMLMarqueeElementExtensions",
    "HTMLVideoElement": "lib.d.ts.html#HTMLVideoElement",
    "MSXMLHttpRequestExtensions": "lib.d.ts.html#MSXMLHttpRequestExtensions",
    "ClientRectList": "lib.d.ts.html#ClientRectList",
    "DOML2DeprecatedAlignmentStyle_HTMLTableCellElement": "lib.d.ts.html#DOML2DeprecatedAlignmentStyle_HTMLTableCellElement",
    "SVGMaskElement": "lib.d.ts.html#SVGMaskElement",
    "MSGestureEvent": "lib.d.ts.html#MSGestureEvent",
    "ErrorEvent": "lib.d.ts.html#ErrorEvent",
    "SVGFilterElement": "lib.d.ts.html#SVGFilterElement",
    "TrackEvent": "lib.d.ts.html#TrackEvent",
    "SVGFEMergeNodeElement": "lib.d.ts.html#SVGFEMergeNodeElement",
    "SVGFEFloodElement": "lib.d.ts.html#SVGFEFloodElement",
    "MSCSSScrollTranslationProperties": "lib.d.ts.html#MSCSSScrollTranslationProperties",
    "MSGesture": "lib.d.ts.html#MSGesture",
    "TextTrackCue": "lib.d.ts.html#TextTrackCue",
    "MSStreamReader": "lib.d.ts.html#MSStreamReader",
    "CSSFlexibleBoxProperties": "lib.d.ts.html#CSSFlexibleBoxProperties",
    "DOMTokenList": "lib.d.ts.html#DOMTokenList",
    "SVGFEFuncAElement": "lib.d.ts.html#SVGFEFuncAElement",
    "SVGFETileElement": "lib.d.ts.html#SVGFETileElement",
    "SVGFEBlendElement": "lib.d.ts.html#SVGFEBlendElement",
    "MessageChannel": "lib.d.ts.html#MessageChannel",
    "SVGFEMergeElement": "lib.d.ts.html#SVGFEMergeElement",
    "TransitionEvent": "lib.d.ts.html#TransitionEvent",
    "MediaQueryList": "lib.d.ts.html#MediaQueryList",
    "DOMError": "lib.d.ts.html#DOMError",
    "SVGFEPointLightElement": "lib.d.ts.html#SVGFEPointLightElement",
    "CSSFontsProperties": "lib.d.ts.html#CSSFontsProperties",
    "CloseEvent": "lib.d.ts.html#CloseEvent",
    "WebSocket": "lib.d.ts.html#WebSocket",
    "ProgressEvent": "lib.d.ts.html#ProgressEvent",
    "IDBObjectStore": "lib.d.ts.html#IDBObjectStore",
    "ObjectURLOptions": "lib.d.ts.html#ObjectURLOptions",
    "SVGFEGaussianBlurElement": "lib.d.ts.html#SVGFEGaussianBlurElement",
    "MSCSSSelectionBoundaryProperties": "lib.d.ts.html#MSCSSSelectionBoundaryProperties",
    "SVGFilterPrimitiveStandardAttributes": "lib.d.ts.html#SVGFilterPrimitiveStandardAttributes",
    "IDBVersionChangeEvent": "lib.d.ts.html#IDBVersionChangeEvent",
    "IDBIndex": "lib.d.ts.html#IDBIndex",
    "FileList": "lib.d.ts.html#FileList",
    "IDBCursor": "lib.d.ts.html#IDBCursor",
    "CSSAnimationsProperties": "lib.d.ts.html#CSSAnimationsProperties",
    "SVGFESpecularLightingElement": "lib.d.ts.html#SVGFESpecularLightingElement",
    "File": "lib.d.ts.html#File",
    "URL": "lib.d.ts.html#URL",
    "IDBCursorWithValue": "lib.d.ts.html#IDBCursorWithValue",
    "XMLHttpRequestEventTarget": "lib.d.ts.html#XMLHttpRequestEventTarget",
    "IDBEnvironment": "lib.d.ts.html#IDBEnvironment",
    "AudioTrackList": "lib.d.ts.html#AudioTrackList",
    "MSBaseReader": "lib.d.ts.html#MSBaseReader",
    "MSProtocol": "lib.d.ts.html#MSProtocol",
    "SVGFEMorphologyElement": "lib.d.ts.html#SVGFEMorphologyElement",
    "CSSTransitionsProperties": "lib.d.ts.html#CSSTransitionsProperties",
    "SVGFEFuncRElement": "lib.d.ts.html#SVGFEFuncRElement",
    "WindowTimersExtension": "lib.d.ts.html#WindowTimersExtension",
    "SVGFEDisplacementMapElement": "lib.d.ts.html#SVGFEDisplacementMapElement",
    "MSCSSContentZoomProperties": "lib.d.ts.html#MSCSSContentZoomProperties",
    "AnimationEvent": "lib.d.ts.html#AnimationEvent",
    "SVGComponentTransferFunctionElement": "lib.d.ts.html#SVGComponentTransferFunctionElement",
    "MSRangeCollection": "lib.d.ts.html#MSRangeCollection",
    "MSCSSPositionedFloatsProperties": "lib.d.ts.html#MSCSSPositionedFloatsProperties",
    "SVGFEDistantLightElement": "lib.d.ts.html#SVGFEDistantLightElement",
    "MSCSSRegionProperties": "lib.d.ts.html#MSCSSRegionProperties",
    "SVGFEFuncBElement": "lib.d.ts.html#SVGFEFuncBElement",
    "IDBKeyRange": "lib.d.ts.html#IDBKeyRange",
    "WindowConsole": "lib.d.ts.html#WindowConsole",
    "IDBTransaction": "lib.d.ts.html#IDBTransaction",
    "AudioTrack": "lib.d.ts.html#AudioTrack",
    "SVGFEConvolveMatrixElement": "lib.d.ts.html#SVGFEConvolveMatrixElement",
    "TextTrackCueList": "lib.d.ts.html#TextTrackCueList",
    "CSSKeyframesRule": "lib.d.ts.html#CSSKeyframesRule",
    "MSCSSTouchManipulationProperties": "lib.d.ts.html#MSCSSTouchManipulationProperties",
    "SVGFETurbulenceElement": "lib.d.ts.html#SVGFETurbulenceElement",
    "TextTrackList": "lib.d.ts.html#TextTrackList",
    "WindowAnimationTiming": "lib.d.ts.html#WindowAnimationTiming",
    "SVGFEFuncGElement": "lib.d.ts.html#SVGFEFuncGElement",
    "SVGFEColorMatrixElement": "lib.d.ts.html#SVGFEColorMatrixElement",
    "Console": "lib.d.ts.html#Console",
    "SVGFESpotLightElement": "lib.d.ts.html#SVGFESpotLightElement",
    "DocumentVisibility": "lib.d.ts.html#DocumentVisibility",
    "WindowBase64": "lib.d.ts.html#WindowBase64",
    "IDBDatabase": "lib.d.ts.html#IDBDatabase",
    "MSProtocolsCollection": "lib.d.ts.html#MSProtocolsCollection",
    "DOMStringList": "lib.d.ts.html#DOMStringList",
    "CSSMultiColumnProperties": "lib.d.ts.html#CSSMultiColumnProperties",
    "IDBOpenDBRequest": "lib.d.ts.html#IDBOpenDBRequest",
    "HTMLProgressElement": "lib.d.ts.html#HTMLProgressElement",
    "SVGFEOffsetElement": "lib.d.ts.html#SVGFEOffsetElement",
    "MSUnsafeFunctionCallback": "lib.d.ts.html#MSUnsafeFunctionCallback",
    "TextTrack": "lib.d.ts.html#TextTrack",
    "MediaQueryListListener": "lib.d.ts.html#MediaQueryListListener",
    "IDBRequest": "lib.d.ts.html#IDBRequest",
    "MessagePort": "lib.d.ts.html#MessagePort",
    "FileReader": "lib.d.ts.html#FileReader",
    "Blob": "lib.d.ts.html#Blob",
    "ApplicationCache": "lib.d.ts.html#ApplicationCache",
    "MSHTMLVideoElementExtensions": "lib.d.ts.html#MSHTMLVideoElementExtensions",
    "FrameRequestCallback": "lib.d.ts.html#FrameRequestCallback",
    "CSS3DTransformsProperties": "lib.d.ts.html#CSS3DTransformsProperties",
    "PopStateEvent": "lib.d.ts.html#PopStateEvent",
    "CSSKeyframeRule": "lib.d.ts.html#CSSKeyframeRule",
    "CSSGridProperties": "lib.d.ts.html#CSSGridProperties",
    "MSFileSaver": "lib.d.ts.html#MSFileSaver",
    "MSStream": "lib.d.ts.html#MSStream",
    "MSBlobBuilder": "lib.d.ts.html#MSBlobBuilder",
    "MSRangeExtensions": "lib.d.ts.html#MSRangeExtensions",
    "DOMSettableTokenList": "lib.d.ts.html#DOMSettableTokenList",
    "IDBFactory": "lib.d.ts.html#IDBFactory",
    "MSPointerEvent": "lib.d.ts.html#MSPointerEvent",
    "CSSTextProperties": "lib.d.ts.html#CSSTextProperties",
    "CSS2DTransformsProperties": "lib.d.ts.html#CSS2DTransformsProperties",
    "MSCSSHighContrastProperties": "lib.d.ts.html#MSCSSHighContrastProperties",
    "MSManipulationEvent": "lib.d.ts.html#MSManipulationEvent",
    "FormData": "lib.d.ts.html#FormData",
    "MSHTMLMediaElementExtensions": "lib.d.ts.html#MSHTMLMediaElementExtensions",
    "SVGFEImageElement": "lib.d.ts.html#SVGFEImageElement",
    "HTMLDataListElement": "lib.d.ts.html#HTMLDataListElement",
    "AbstractWorker": "lib.d.ts.html#AbstractWorker",
    "SVGFECompositeElement": "lib.d.ts.html#SVGFECompositeElement",
    "ValidityState": "lib.d.ts.html#ValidityState",
    "HTMLTrackElement": "lib.d.ts.html#HTMLTrackElement",
    "MSApp": "lib.d.ts.html#MSApp",
    "SVGFEDiffuseLightingElement": "lib.d.ts.html#SVGFEDiffuseLightingElement",
    "SVGFEComponentTransferElement": "lib.d.ts.html#SVGFEComponentTransferElement",
    "MSCSSMatrix": "lib.d.ts.html#MSCSSMatrix",
    "Worker": "lib.d.ts.html#Worker",
    "MSMediaErrorExtensions": "lib.d.ts.html#MSMediaErrorExtensions",
    "ITextWriter": "lib.d.ts.html#ITextWriter"
};
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
        var result = DTSDoc.pProgram.parse(new Source(sourceCode, 0));
        if(result.success) {
            docs.append("<p>Parsing finished</p><p>Document generating...</p>");
            var program = result.value;
            var global = program.global;
            var members = global.members;
            documentContent = $('<div/>');
            if(program.docs) {
                documentContent.append($('<p>').html(program.docs.text));
            }
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
            var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            var downloadBlob = new _Blob([
                headerHTML + documentContent.html() + footerHTML
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
        } else {
            var pos = result.source.getPosition();
            var line = pos.line;
            var column = pos.column;
            var source = result.source.source.slice(result.source.position, result.source.position + 128);
            var err = result.errorMesssage;
            docs.append("<p>Parsing failed at line " + line + ", column " + column + ": \"" + source + "\", " + err + "</p>");
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
    fileInput.val(undefined);
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
function generateTypeList(path, global) {
    var list = {
    };
    function generateTypeListFromModule(m) {
        list[m.name] = path + "#" + m.name;
        m.members.forEach(function (m) {
            if(m instanceof DTSDoc.ASTInterface) {
                list[m.name] = path + "#" + m.name;
            } else if(m instanceof DTSDoc.ASTClass) {
                list[m.name] = path + "#" + m.name;
            } else if(m instanceof DTSDoc.ASTEnum) {
                list[m.name] = path + "#" + m.name;
            } else if(m instanceof DTSDoc.ASTModule) {
                generateTypeListFromModule(m);
            }
        });
    }
    generateTypeListFromModule(global);
    return JSON.stringify(list);
}
loadSourceFile("sample.d.ts");
