/* eslint-disable @typescript-eslint/no-explicit-any */
import "hardhat/types/runtime";
import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    solidityx: {
      [compilerPath: string]: string;
    };
  }
  interface HardhatConfig {
    solidityx: {
      [compilerPath: string]: string;
    };
  }
}
