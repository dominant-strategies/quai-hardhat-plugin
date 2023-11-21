"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const task_names_1 = require("hardhat/builtin-tasks/task-names");
const plugins_1 = require("hardhat/plugins");
const errors_1 = require("hardhat/internal/core/errors");
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const fs_extra_1 = __importDefault(require("fs-extra"));
require("./type-extensions");
(0, config_1.extendConfig)((config, userConfig) => {
    const compilerPath = userConfig.solidityx?.compilerPath;
    let newPath;
    if (compilerPath === undefined) {
        throw new plugins_1.HardhatPluginError("SolidityX compiler path not found in hardhat.config.js");
    }
    if (path_1.default.isAbsolute(compilerPath)) {
        newPath = compilerPath;
    }
    else {
        newPath = path_1.default.normalize(path_1.default.join(config.paths.root, compilerPath));
    }
    // Check if the customCompilerPath exists
    if (!fs_extra_1.default.existsSync(newPath)) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Path not found: ' + newPath);
        process.exit();
    }
    // Check if the customCompilerPath is a file
    if (!fs_extra_1.default.statSync(newPath).isFile()) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Path is not an executable file: ' + newPath);
        process.exit();
    }
    config.solidityx = {
        compilerPath: newPath,
    };
});
const log = (0, debug_1.default)("hardhat:core:tasks:compile");
(0, config_1.internalTask)(task_names_1.TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ quiet, solcVersion }, hre, runSuper) => {
    const customCompilerPath = hre.config.solidityx.compilerPath;
    const resolvedPath = path_1.default.resolve(customCompilerPath);
    try {
        fs_extra_1.default.accessSync(resolvedPath, fs_extra_1.default.constants.X_OK);
    }
    catch {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', '\nError: ', 'Executable not found or lacks permission.');
        console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'If the file exists, grant execute permission using: \'chmod +x ' + resolvedPath + '\'\n');
        process.exit();
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
    log("Native solc binary doesn't work, using solcjs instead. Try running npx hardhat clean --global");
    const wasmCompiler = {
        version: 'Solx',
        longVersion: 'Solidity X',
        compilerPath: resolvedPath,
        isSolcJs: true
    };
    (0, errors_1.assertHardhatInvariant)(wasmCompiler !== undefined, `WASM build of solc ${solcVersion} isn't working`);
    return wasmCompiler;
});
//# sourceMappingURL=index.js.map