
declare module "express" {
    // tsc のバグっぽい気がする
    // export function (): Express;
}

interface StorageChange {
    newValue?: any;
    oldValue?: any;
}

interface WebGLRenderingContext {}


interface IAngularStatic {
    module(
        /** name of your module you want to create */
        name: string,
        /** name of modules yours depends on */
        requires?: string[],
        configFunction?: Function): IModule;
}


module THREE {
    /**
     * Object for keeping track of time.
     *
     * @see <a href="https://github.com/mrdoob/three.js/blob/master/src/core/Clock.js">src/core/Clock.js</a>
     */
    export class Clock {
        /**
         * @param autoStart Automatically start the clock.
         */
        constructor(autoStart?: bool);

        /**
         * If set, starts the clock automatically when the first update is called.
         */
        autoStart: bool;
    }


        /**
     * CubeGeometry is the quadrilateral primitive geometry class. It is typically used for creating a cube or irregular quadrilateral of the dimensions provided within the (optional) 'width', 'height', & 'depth' constructor arguments.
     */
    export class CubeGeometry extends Geometry {
        /**
         * @param width Width of the sides on the X axis.
         * @param height Height of the sides on the Y axis.
         * @param depth Depth of the sides on the Z axis.
         * @param widthSegments Number of segmented faces along the width of the sides.
         * @param heightSegments Number of segmented faces along the height of the sides.
         * @param depthSegments Number of segmented faces along the depth of the sides.
         */
        constructor(width: number, height: number, depth: number, widthSegments?: number, heightSegments?: number, depthSegments?: number);
    }

    export var REVISION: string;

    // GL STATE CONSTANTS

    /**
     * {@link THREE.CullFaceNone}, {@link THREE.CullFaceBack}, {@link THREE.CullFaceFront}, {@link THREE.CullFaceFrontBack}
     * @see {@link THREE.WebGLRenderer.setFaceCulling}
     */
    export enum CullFace { }
    export var CullFaceNone: CullFace;
    export var CullFaceBack: CullFace;
    export var CullFaceFront: CullFace;
    export var CullFaceFrontBack: CullFace;

    export class Vector3 implements Vector {

        constructor(x?: number, y?: number, z?: number);

        x: number;

        y: number;

        z: number;

        /**
         * Sets value of this vector.
         */
        set (x: number, y: number, z: number): Vector3;

        /**
         * Sets x value of this vector.
         */
        setX(x: number): Vector3;

        /**
         * Sets y value of this vector.
         */
        setY(y: number): Vector3;
    }

        export class WebGLRenderer2 implements Renderer {
        constructor(parameters?: WebGLRendererParameters);
        domElement: HTMLCanvasElement;
        context: WebGLRenderingContext;
        autoClear: bool;
        autoClearColor: bool;
        autoClearDepth: bool;
        autoClearStencil: bool;
        sortObjects: bool;
        autoUpdateObjects: bool;
        autoUpdateScene: bool;
        gammaInput: bool;
        gammaOutput: bool;
        physicallyBasedShading: bool;
        shadowMapEnabled: bool;
        shadowMapAutoUpdate: bool;
        shadowMapType: ShadowMapType;
        shadowMapSoft: bool;
        shadowMapCullFace: CullFace;
        shadowMapDebug: bool;
        shadowMapCascade: bool;
        maxMorphTargets: number;
        maxMorphNormals: number;
        autoScaleCubemaps: bool;
        renderPluginsPre: RendererPlugin[];
        renderPluginsPost: RendererPlugin[];
        devicePixelRatio: number;
        info: {
            memory: {
                programs: number;
                geometries: number;
                textures: number;
            };
            render: {
                calls: number;
                vertices: number;
                faces: number;
                points: number;
            };
        };
    }
}

//declare var Ember: