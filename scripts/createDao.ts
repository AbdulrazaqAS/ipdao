import { ethers } from "hardhat";
import "dotenv/config";
import { IPDaoFactoryInterface } from "../typechain-types/contracts/IPDaoFactory";

async function main() {
  const initialOwner = "0x1bc88526BC2932E8Ad321FAc878C1161aa6d983A"; // Governor contract address
  const ipId = "0x93D2CacDe9D6Cc7AD873e4AF1F5825DD0f1B999d"; // Asset to be managed Ip id
  const licensingModule = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f"; // Licensing module address
  const pilTemplate = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316"; // PIL template address
  const revenueToken = "0x1514000000000000000000000000000000000000"; // WIP

  const daoFactory = await ethers.getContractAt(
    "IPDaoFactory",
    process.env.IP_DAO_FACTORY_ADDRESS!,
  );
  const tx = await daoFactory.createDao(
    ipId,
    licensingModule,
    pilTemplate,
    revenueToken,
    initialOwner,
  );

  const txReceipt = await tx.wait();
  const managerAddress = getManagerAddress(
    txReceipt!.logs,
    daoFactory.interface,
  );

  console.log("Manager address:", managerAddress);
}

function getManagerAddress(
  logs: any,
  daoInterface: IPDaoFactoryInterface,
): string | null {
  for (const log of logs) {
    const parsed = daoInterface.parseLog(log);
    if (parsed?.name === "DaoCreated") {
      return parsed.args.managerAddress;
    }
  }

  return null;
}

main().catch(console.error);
