import { internalTask, extendConfig, task } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_RUN_SOLC, TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import { SolcBuild } from "hardhat/types/builtin-tasks/compile";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig, CompilerInput } from "hardhat/types";
import { assertHardhatInvariant } from "hardhat/internal/core/errors";
import path from "path";
import debug from "debug";
import fsExtra from "fs-extra";
import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const compilerPath = userConfig.solidityx?.compilerPath;
    let newPath: string;
    if (compilerPath === undefined) {
      throw new HardhatPluginError("SolidityX compiler path not found in hardhat.config.js");
    }
    if (path.isAbsolute(compilerPath)) {
      newPath = compilerPath;
    } else {
      newPath = path.normalize(path.join(config.paths.root, compilerPath));
    }

    // Check if the customCompilerPath exists
    if (!fsExtra.existsSync(newPath)) {
      console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Path not found: ' + newPath);
      process.exit()
    }

    // Check if the customCompilerPath is a file
    if (!fsExtra.statSync(newPath).isFile()) {
      console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Path is not an executable file: ' + newPath);
      process.exit()
    }

    config.solidityx = {
      compilerPath: newPath,
    };
  }
);

const log = debug("hardhat:core:tasks:compile");

internalTask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
  async (
    { quiet, solcVersion }: { quiet: boolean; solcVersion: string },
    hre,
    runSuper
  ): Promise<SolcBuild> => {
    const customCompilerPath = hre.config.solidityx.compilerPath;
    const resolvedPath = path.resolve(customCompilerPath);

    try {
      fsExtra.accessSync(resolvedPath, fsExtra.constants.X_OK);
    } catch {
      console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', '\nError: ', 'Executable not found or lacks permission.');
      console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'If the file exists, grant execute permission using: \'chmod +x ' + resolvedPath +'\'\n');
      process.exit()
    }

    const compiler = {
      version: 'Solx',
      longVersion: 'Solidity X',
      compilerPath: resolvedPath,
      isSolcJs: false
    };

    if (compiler !== undefined) {
      return compiler;
    }

    log(
      "Native solc binary doesn't work, using solcjs instead. Try running npx hardhat clean --global"
    );

    const wasmCompiler = {
      version: 'Solx',
      longVersion: 'Solidity X',
      compilerPath: resolvedPath,
      isSolcJs: true
    };

    assertHardhatInvariant(
      wasmCompiler !== undefined,
      `WASM build of solc ${solcVersion} isn't working`
    );

    return wasmCompiler;
  }
);