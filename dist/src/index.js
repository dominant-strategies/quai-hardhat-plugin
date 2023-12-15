"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const task_names_1 = require("hardhat/builtin-tasks/task-names");
const errors_1 = require("hardhat/internal/core/errors");
const constants_1 = require("./constants");
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const fs_extra_1 = __importDefault(require("fs-extra"));
require("./type-extensions");
const readline_1 = __importDefault(require("readline"));
const download_1 = __importDefault(require("download"));
const crypto_1 = __importDefault(require("crypto"));
let ubuntu_version;
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
(0, config_1.extendConfig)((config, userConfig) => {
    let compilerPath = userConfig.solidityx?.compilerPath;
    let newPath;
    if (compilerPath === undefined) {
        console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Info: ', 'SolidityX Path not specified. Using default path: ' + path_1.default.join(config.paths.root, constants_1.DEFAULT_COMPILER_PATH));
        compilerPath = constants_1.DEFAULT_COMPILER_PATH;
    }
    if (path_1.default.isAbsolute(compilerPath)) {
        newPath = compilerPath;
    }
    else {
        newPath = path_1.default.normalize(path_1.default.join(config.paths.root, compilerPath));
    }
    config.solidityx = {
        compilerPath: newPath,
    };
});
const log = (0, debug_1.default)("hardhat:core:tasks:compile");
(0, config_1.internalTask)(task_names_1.TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ quiet, solcVersion }, hre, runSuper) => {
    const customCompilerPath = hre.config.solidityx.compilerPath;
    const resolvedPath = path_1.default.resolve(customCompilerPath);
    // Is the path a directory?
    if (fs_extra_1.default.existsSync(resolvedPath) && fs_extra_1.default.statSync(resolvedPath).isDirectory()) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Path is a directory: ' + resolvedPath);
        process.exit(1);
    }
    try {
        fs_extra_1.default.accessSync(resolvedPath, fs_extra_1.default.constants.X_OK);
    }
    catch {
        // If the path doesn't exist, download the compiler
        if (!fs_extra_1.default.existsSync(resolvedPath)) {
            console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', '\nError: ', 'SolidityX compiler not found at path: ' + resolvedPath);
            const question = (query) => new Promise((resolve) => rl.question(query, (answer) => resolve(answer.trim())));
            try {
                const answer = await question('Do you want to download the missing executable? (y/n): ');
                if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                    await downloadCompiler(resolvedPath);
                }
                else {
                    console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Double-check your SolidityX compiler path in the hardhat.config.js');
                    process.exit(1);
                }
            }
            catch (error) {
                console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', error);
                process.exit(1);
            }
            finally {
                rl.close();
            }
        }
        // Is the path a file without permissions?
        else if (fs_extra_1.default.statSync(resolvedPath).isFile()) {
            console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Compiler does not have permission to execute.');
            console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Grant execute permission using: \'chmod +x ' + resolvedPath + '\'\n');
            process.exit(1);
        }
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
const downloadCompiler = async (downloadPath) => {
    const os = process.platform;
    const solxLink = await getSolxLink(os);
    const checksum = await getChecksum(os);
    try {
        console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Info: ', 'Downloading to: ' + downloadPath);
        const data = await (0, download_1.default)(solxLink);
        const hash = crypto_1.default.createHash('sha256');
        const hashResult = hash.update(data).digest('hex');
        if (hashResult !== checksum) {
            console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Checksum mismatch');
            process.exit(1);
        }
        fs_extra_1.default.writeFileSync(downloadPath, data);
        fs_extra_1.default.chmodSync(downloadPath, 0o755);
        console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Info: ', 'Download successful!');
    }
    catch (error) {
        console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Failed to download SOLX');
        console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', error);
        process.exit(1);
    }
};
const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
    }));
};
const getLinuxDistribution = async () => {
    if (ubuntu_version !== undefined) {
        return ubuntu_version;
    }
    console.log("Select your Linux distribution:");
    console.log("1: Ubuntu 18");
    console.log("2: Ubuntu 20");
    console.log("3: Other");
    console.log("Enter the number of your distribution:");
    const choice = await askQuestion('> ');
    switch (choice.trim().toLowerCase()) {
        case '1':
        case 'ubuntu18':
        case 'ubuntu 18':
            recommendManualCompile();
            process.exit(1);
            ubuntu_version = 'ubuntu18';
            return 'ubuntu18';
        case '2':
        case 'ubuntu20':
        case 'ubuntu 20':
            ubuntu_version = 'ubuntu20';
            return 'ubuntu20';
        case '3':
        case 'other':
            recommendManualCompile();
            process.exit(1);
        default:
            console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Invalid selection');
            process.exit(1);
    }
};
const getChecksum = async (os) => {
    switch (os) {
        case 'darwin':
            return constants_1.DARWIN_CHECKSUM;
        case 'linux':
            const linuxDistro = await getLinuxDistribution();
            if (linuxDistro === 'ubuntu18') {
                return constants_1.UBUNTU_18_CHECKSUM;
            }
            else if (linuxDistro === 'ubuntu20') {
                return constants_1.UBUNTU_20_CHECKSUM;
            }
            break;
        case 'win32':
            console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', " Windows download is not supported yet, please compile SolidityX from source");
            process.exit();
            return constants_1.WINDOWS_CHECKSUM;
        default:
            recommendManualCompile();
            process.exit();
    }
};
const getSolxLink = async (os) => {
    switch (os) {
        case 'darwin':
            return constants_1.DARWIN_SOLX_LINK;
        case 'linux':
            const linuxDistro = await getLinuxDistribution();
            if (linuxDistro === 'ubuntu18') {
                return constants_1.UBUNTU_18_LINK;
            }
            else if (linuxDistro === 'ubuntu20') {
                return constants_1.UBUNTU_20_LINK;
            }
            else {
                recommendManualCompile();
                process.exit();
            }
        case 'win32':
            recommendManualCompile();
            process.exit();
            return constants_1.WINDOWS_SOLX_LINK;
        default:
            recommendManualCompile();
            process.exit();
    }
};
const recommendManualCompile = () => {
    console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Unsupported OS. Quai currently supports macOS and Ubuntu 20');
    console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Compile SolidityX from source:');
    console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Visit: https://github.com/dominant-strategies/SolidityX');
};
//# sourceMappingURL=index.js.map