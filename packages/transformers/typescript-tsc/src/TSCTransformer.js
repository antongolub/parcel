// @flow strict-local

import {Transformer} from '@parcel/plugin';
import localRequire from '@parcel/local-require';

type TypescriptCompilerOptions = {
  module?: mixed,
  jsx?: mixed,
  noEmit?: boolean,
  sourceMap?: boolean
};

type TypescriptTranspilerOptions = {
  compilerOptions: TypescriptCompilerOptions,
  fileName: string
};

export default new Transformer({
  async getConfig({asset}) {
    return asset.getConfig(['tsconfig.json']);
  },

  async transform({asset, config}) {
    asset.type = 'js';

    let typescript =
      config == null
        ? // $FlowFixMe
          require('typescript')
        : await localRequire('typescript', asset.filePath);

    let code = await asset.getCode();
    let transpiled = typescript.transpileModule(
      code,
      ({
        compilerOptions: {
          // React is the default. Users can override this by supplying their own tsconfig,
          // which many TypeScript users will already have for typechecking, etc.
          jsx: 'React',
          ...config?.compilerOptions,
          // Always emit output
          noEmit: false,
          // Don't compile ES `import`s -- scope hoisting prefers them and they will
          // otherwise compiled to CJS via babel in the js transformer
          module: typescript.ModuleKind.ESNext
        },
        fileName: asset.filePath // Should be relativePath?
      }: TypescriptTranspilerOptions)
    );

    return [
      {
        type: 'js',
        code: transpiled.outputText
      }
    ];
  }
});
