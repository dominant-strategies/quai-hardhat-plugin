/* eslint-disable @typescript-eslint/no-explicit-any */
import "hardhat/types/runtime";
import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    solidityx: {
      [compiler_path: string]: string;
    };
  }
  interface HardhatConfig {
    solidityx: {
      [compiler_path: string]: string;
    };
  }
}
