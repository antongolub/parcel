const Asset = require('../Asset');
const localRequire = require('../utils/localRequire');
const isAccessedVarChanged = require('../utils/isAccessedVarChanged');

class TypeScriptAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'js';
    this.cacheData.env = {};
  }

  shouldInvalidate(cacheData) {
    return isAccessedVarChanged(cacheData);
  }

  async generate() {
    // require typescript, installed locally in the app
    let typescript = await localRequire('typescript', this.name);
    let transpilerOptions = {
      compilerOptions: {
        module: this.options.scopeHoist
          ? typescript.ModuleKind.ESNext
          : typescript.ModuleKind.CommonJS,
        jsx: typescript.JsxEmit.Preserve,

        // it brings the generated output from TypeScript closer to that generated by Babel
        // see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html
        esModuleInterop: true
      },
      fileName: this.relativeName
    };

    const tsconfigPath = this.options.tsconfig || 'tsconfig.json';
    let tsconfig = await this.getConfig([tsconfigPath]);

    // Overwrite default if config is found
    if (tsconfig) {
      transpilerOptions.compilerOptions = Object.assign(
        transpilerOptions.compilerOptions,
        tsconfig.compilerOptions
      );
    }
    transpilerOptions.compilerOptions.noEmit = false;
    transpilerOptions.compilerOptions.sourceMap = this.options.sourceMaps;

    // Transpile Module using TypeScript and parse result as ast format through babylon
    let transpiled = typescript.transpileModule(
      this.contents,
      transpilerOptions
    );
    let sourceMap = transpiled.sourceMapText;

    if (sourceMap) {
      sourceMap = JSON.parse(sourceMap);
      sourceMap.sources = [this.relativeName];
      sourceMap.sourcesContent = [this.contents];

      // Remove the source map URL
      let content = transpiled.outputText;
      transpiled.outputText = content.substring(
        0,
        content.lastIndexOf('//# sourceMappingURL')
      );
    }

    return [
      {
        type: 'js',
        value: transpiled.outputText,
        map: sourceMap
      }
    ];
  }
}

module.exports = TypeScriptAsset;
