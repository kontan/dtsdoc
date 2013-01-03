/// <reference path="jquery.d.ts" />
module DTSDoc {
    enum Accessibility {
        Public,
        Private,
    }
    class TSTypeRef {
        public toHTML(): JQuery;
    }
    class TSNameRef extends TSTypeRef {
        public name: string;
        constructor (name: string);
        public toHTML(): JQuery;
    }
    class TSArrayRef extends TSTypeRef {
        public type: TSTypeRef;
        constructor (type: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSModuleRef extends TSTypeRef {
        public name: string;
        public type: TSTypeRef;
        constructor (name: string, type: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSSpecifing extends TSTypeRef {
        public members: TSClassMember[];
        constructor (members: TSClassMember[]);
        public toHTML(): JQuery;
    }
    class TSFunctionTypeRef extends TSTypeRef {
        public params: TSParameter[];
        public retType: TSTypeRef;
        constructor (params: TSParameter[], retType: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSDocs {
        public text: string;
        constructor (text: string);
    }
    class TSClassMember {
        public toHTML(): JQuery;
    }
    class TSModuleMember {
        public toHTML(): JQuery;
    }
    class TSParameter {
        public name: string;
        public optional: bool;
        public type: TSTypeRef;
        constructor (name: string, optional: bool, type: TSTypeRef);
        public toString(): string;
        public toHTML(): JQuery;
    }
    class TSFunction extends TSClassMember {
        public docs: TSDocs;
        public name: string;
        public params: TSParameter[];
        public ret: string;
        constructor (docs: TSDocs, name: string, params: TSParameter[], ret: string);
        public toString(): string;
        public toHTML(): JQuery;
    }
    class TSConstructor extends TSClassMember {
        public docs: TSDocs;
        public params: TSParameter[];
        constructor (docs: TSDocs, params: TSParameter[]);
        public toHTML(): JQuery;
    }
    class TSMethod extends TSClassMember {
        public docs: TSDocs;
        public access: Accessibility;
        public isStatic: bool;
        public name: string;
        public params: TSParameter[];
        public ret: TSTypeRef;
        constructor (docs: TSDocs, access: Accessibility, isStatic: bool, name: string, params: TSParameter[], ret: TSTypeRef);
        public toString(): string;
        public toHTML(): JQuery;
    }
    class TSField extends TSClassMember {
        public docs: TSDocs;
        public access: Accessibility;
        public isStatic: bool;
        public name: string;
        public type: TSTypeRef;
        constructor (docs: TSDocs, access: Accessibility, isStatic: bool, name: string, type: TSTypeRef);
        public toString(): string;
        public toHTML(): JQuery;
    }
    class TSClass extends TSModuleMember {
        public docs: TSDocs;
        public name: string;
        public members: TSClassMember[];
        constructor (docs: TSDocs, name: string, members: TSClassMember[]);
        public toString(): string;
        public toHTML(): JQuery;
    }
    class TSInterfaceMember {
        public toHTML(): JQuery;
    }
    class TSIndexer extends TSInterfaceMember {
        public docs: TSDocs;
        public name: string;
        public indexType: TSTypeRef;
        public retType: TSTypeRef;
        constructor (docs: TSDocs, name: string, indexType: TSTypeRef, retType: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSIMethod extends TSInterfaceMember {
        public docs: TSDocs;
        public access: Accessibility;
        public name: string;
        public params: TSParameter[];
        public retType: TSTypeRef;
        constructor (docs: TSDocs, access: Accessibility, name: string, params: TSParameter[], retType: TSTypeRef);
    }
    class TSInterface extends TSModuleMember {
        public docs: TSDocs;
        public name: string;
        public members: TSInterfaceMember[];
        constructor (docs: TSDocs, name: string, members: TSInterfaceMember[]);
        public toHTML(): JQuery;
    }
    class TSIConstructor extends TSInterfaceMember {
        public docs: TSDocs;
        public params: TSParameter[];
        public type: TSTypeRef;
        constructor (docs: TSDocs, params: TSParameter[], type: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSIField extends TSClassMember {
        public docs: TSDocs;
        public name: string;
        public isOptional: bool;
        public type: TSTypeRef;
        constructor (docs: TSDocs, name: string, isOptional: bool, type: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSIFunction extends TSClassMember {
        public docs: TSDocs;
        public params: TSParameter[];
        public retType: TSTypeRef;
        constructor (docs: TSDocs, params: TSParameter[], retType: TSTypeRef);
        public toHTML(): JQuery;
    }
    class TSEnum extends TSModuleMember {
        public docs: TSDocs;
        public name: string;
        public members: string[];
        constructor (docs: TSDocs, name: string, members: string[]);
        public toHTML(): JQuery;
    }
    class TSVar extends TSModuleMember {
        public docs: TSDocs;
        public name: string;
        public type: TSTypeRef;
        constructor (docs: TSDocs, name: string, type: TSTypeRef);
        public toString(): string;
        public toHTML(): JQuery;
    }
    class TSModule {
        public docs: TSDocs;
        public name: string;
        public members: TSModuleMember[];
        constructor (docs: TSDocs, name: string, members: TSModuleMember[]);
        public toString(): string;
        public toHTML(): JQuery;
    }
}
