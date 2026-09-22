import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SyncSenta contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy SyncSentaCredentials (ERC-721)
  console.log("\n1. Deploying SyncSentaCredentials...");
  const Credentials = await ethers.getContractFactory("SyncSentaCredentials");
  const credentials = await Credentials.deploy();
  await credentials.waitForDeployment();
  const credentialsAddress = await credentials.getAddress();
  console.log("   SyncSentaCredentials deployed to:", credentialsAddress);

  // Deploy SyncToken (ERC-20)
  console.log("\n2. Deploying SyncToken...");
  const Token = await ethers.getContractFactory("SyncToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   SyncToken deployed to:", tokenAddress);

  // Deploy ApprovalRegistry
  console.log("\n3. Deploying ApprovalRegistry...");
  const Registry = await ethers.getContractFactory("ApprovalRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   ApprovalRegistry deployed to:", registryAddress);

  // Deploy ContentRegistry
  console.log("\n4. Deploying ContentRegistry...");
  const Content = await ethers.getContractFactory("ContentRegistry");
  const content = await Content.deploy();
  await content.waitForDeployment();
  const contentAddress = await content.getAddress();
  console.log("   ContentRegistry deployed to:", contentAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SyncSentaCredentials: credentialsAddress,
      SyncToken: tokenAddress,
      ApprovalRegistry: registryAddress,
      ContentRegistry: contentAddress,
    },
  };

  const outputPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Deployment complete! Addresses saved to deployments.json");
  console.log("\nAdd these to your .env file:");
  console.log(`CREDENTIALS_CONTRACT_ADDRESS=${credentialsAddress}`);
  console.log(`TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
  console.log(`APPROVAL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`CONTENT_REGISTRY_ADDRESS=${contentAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
