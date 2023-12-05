import { internalTask, extendConfig, task } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import { SolcBuild } from "hardhat/types/builtin-tasks/compile";
import { HardhatConfig, HardhatUserConfig, CompilerInput } from "hardhat/types";
import { assertHardhatInvariant } from "hardhat/internal/core/errors";
import path from "path";
import debug from "debug";
import fsExtra from "fs-extra";
import "./type-extensions";
import readline from "readline";
import download from "download";
import crypto from "crypto";

let ubuntu_version: string;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let compilerPath = userConfig.solidityx?.compilerPath;
    let newPath: string;

    if (compilerPath === undefined) {
      console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Info: ', 'SolidityX Path not specified. Using default path: ' + path.join(config.paths.root, DEFAULT_COMPILER_PATH));
      compilerPath = DEFAULT_COMPILER_PATH;
    }

    if (path.isAbsolute(compilerPath)) {
      newPath = compilerPath;
    } else {
      newPath = path.normalize(path.join(config.paths.root, compilerPath));
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

    // Is the path a directory?
    if (fsExtra.existsSync(resolvedPath) && fsExtra.statSync(resolvedPath).isDirectory()) {
      console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Path is a directory: ' + resolvedPath);
      process.exit(1)
    }

    try {
      fsExtra.accessSync(resolvedPath, fsExtra.constants.X_OK);
    } catch {
      // If the path doesn't exist, download the compiler
      if (!fsExtra.existsSync(resolvedPath)) {
        console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', '\nError: ', 'SolidityX compiler not found at path: ' + resolvedPath);

        const question = (query: string): Promise<string> => new Promise<string>((resolve) => rl.question(query, (answer: string) => resolve(answer.trim())));

        try {
          const answer = await question('Do you want to download the missing executable? (y/n): ');

          if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            await downloadCompiler(resolvedPath);
          } else {
            console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Double-check your SolidityX compiler path in the hardhat.config.js');
            process.exit(1);
          }
        } catch (error) {
          console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', error);
          process.exit(1);
        } finally {
          rl.close();
        }
      }

      // Is the path a file without permissions?
      else if (fsExtra.statSync(resolvedPath).isFile()) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Compiler does not have permission to execute.');
        console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Grant execute permission using: \'chmod +x ' + resolvedPath + '\'\n');
        process.exit(1)
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

const downloadCompiler = async (downloadPath: string) => {
  const os = process.platform;
  const solxLink = await getSolxLink(os);
  const checksum = await getChecksum(os);

  try {
    console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Info: ', 'Downloading to: ' + downloadPath);
    const data = await download(solxLink);

    const hash = crypto.createHash('sha256');
    const hashResult = hash.update(data).digest('hex');

    if (hashResult !== checksum) {
      console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Checksum mismatch');
      process.exit(1);
    }

    fsExtra.writeFileSync(downloadPath, data);
    fsExtra.chmodSync(downloadPath, 0o755);
    console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Info: ', 'Download successful!');
  } catch (error) {
    console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Failed to download SOLX');
    console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', error)
    process.exit(1);
  }
};

const askQuestion = (query: string): Promise<string> => {
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
  console.log("3: Other")
  console.log("Enter the number of your distribution:");

  const choice = await askQuestion('> ');

  switch (choice.trim().toLowerCase()) {
    case '1':
    case 'ubuntu18':
    case 'ubuntu 18':
      console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', " Ubuntu 18 download is not supported yet, please compile SolidityX from source");
      process.exit(1);
      ubuntu_version = 'ubuntu18'
      return 'ubuntu18';
    case '2':
    case 'ubuntu20':
    case 'ubuntu 20':
      ubuntu_version = 'ubuntu20'
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

const getChecksum = async (os: string) => {
  switch (os) {
    case 'darwin':
      return DARWIN_CHECKSUM;
    case 'linux':
      const linuxDistro = await getLinuxDistribution();
      if (linuxDistro === 'ubuntu18') {
        return UBUNTU_18_CHECKSUM;
      } else if (linuxDistro === 'ubuntu20') {
        return UBUNTU_20_CHECKSUM;
      }
      break;
    case 'win32':
      console.log('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', " Windows download is not supported yet, please compile SolidityX from source");
      process.exit(1);
      return WINDOWS_CHECKSUM;
    default:
      recommendManualCompile();
      process.exit(1);
  }
};

const getSolxLink = async (os: string): Promise<string> => {
  switch (os) {
    case 'darwin':
      return DARWIN_SOLX_LINK;
    case 'linux':
      const linuxDistro = await getLinuxDistribution();
      if (linuxDistro === 'ubuntu18') {
        return UBUNTU_18_LINK;
      } else if (linuxDistro === 'ubuntu20') {
        return UBUNTU_20_LINK;
      } else {
        console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Error: ', 'Unfortunetly, SolidityX does not support your operating system yet');
        process.exit();
      }
    case 'win32':
      return WINDOWS_SOLX_LINK;
    default:
      recommendManualCompile();
      process.exit(1);
  }
};

const recommendManualCompile = () => {
  console.error('\x1b[1m\x1b[31m%s\x1b[0m%s', 'Error:', ' Unsupported OS. Quai currently supports macOS and Ubuntu 20');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Compile SolidityX from source:');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m%s', 'Tip: ', 'Visit: https://github.com/dominant-strategies/SolidityX');
  process.exit(1);
}