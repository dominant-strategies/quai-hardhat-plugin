import { internalTask, extendConfig } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_RUN_SOLC } from "hardhat/builtin-tasks/task-names";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig, CompilerInput } from "hardhat/types";
import path from "path";
import fsExtra from "fs-extra";
import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const compilerPath = userConfig.solidityx?.compiler_path;
    let newPath: string;
    if (compilerPath === undefined) {
      throw new HardhatPluginError("SolidityX compiler path should be setted");
    }
    if (path.isAbsolute(compilerPath)) {
      newPath = compilerPath;
    } else {
      newPath = path.normalize(path.join(config.paths.root, compilerPath));
    }
    if (!fsExtra.existsSync(newPath)) {
      throw new HardhatPluginError("SolidityX compiler not found in path");
    }
    config.solidityx = {
      compiler_path: newPath,
    };
  }
);

internalTask(TASK_COMPILE_SOLIDITY_RUN_SOLC).setAction(
  async (
    { input, solcPath }: { input: CompilerInput; solcPath: string },
    hre,
    runSuper
  ): Promise<string> => {
    solcPath = hre.config.solidityx.compiler_path;
    fsExtra.chmodSync(solcPath, "0755");
    return runSuper({ input, solcPath });
  }
);
