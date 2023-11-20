// We load the plugin here.
import { HardhatUserConfig } from "hardhat/types";

import "../../../src/index";

const config: HardhatUserConfig = {
  solidity: "0.7.3",
  defaultNetwork: "hardhat",
  solidityx: {
    compilerPath:
      "/Users/ruialbuquerque/Projects/CRYPTO/QUAI/hardhat-quai-plugin/test/fixture-projects/hardhat-project/asd",
  },
};

export default config;
