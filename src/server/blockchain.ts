import { ethers } from "ethers";

const CONTRACT_ABI = [
  "function mint(address to, string memory uri) public returns (uint256)",
  "function mintBatch(address to, string[] memory uris) public returns (uint256[] memory)",
  "function listForSale(uint256 tokenId, uint256 price) public",
  "function cancelListing(uint256 tokenId) public",
  "function buy(uint256 tokenId) public payable",
  "function getListing(uint256 tokenId) public view returns (address seller, uint256 price, bool active)",
  "function getNextTokenId() public view returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId) public",
  "event SkinMinted(uint256 indexed tokenId, address indexed to, string tokenURI)",
  "event SkinListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event SkinSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)",
  "event ListingCancelled(uint256 indexed tokenId, address indexed seller)",
];

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

function getRpcUrl(): string {
  return process.env.RPC_URL || "http://127.0.0.1:8545";
}

function getContractAddress(): string {
  return getEnvOrThrow("CONTRACT_ADDRESS");
}

let _provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (_provider) return _provider;
  _provider = new ethers.JsonRpcProvider(getRpcUrl());
  return _provider;
}

export function getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  const address = getContractAddress();
  return new ethers.Contract(address, CONTRACT_ABI, signerOrProvider || getProvider());
}

async function assertContractDeployed(address: string) {
  const provider = getProvider();
  const code = await provider.getCode(address);
  if (!code || code === "0x") {
    throw new Error(
      `CONTRACT_ADDRESS (${address}) não tem bytecode nessa rede (RPC_URL=${getRpcUrl()}). ` +
        `Você provavelmente reiniciou o Hardhat node e precisa rodar o deploy novamente e atualizar o .env.`,
    );
  }
}

export function getAdminSigner(): ethers.Wallet {
  const privateKey = getEnvOrThrow("ADMIN_PRIVATE_KEY");
  // NonceManager evita NONCE_EXPIRED/nonce too low quando enviamos várias transações sequenciais.
  // Mantemos singleton para o mesmo processo (seed/Next).
  if (!(globalThis as any).__skinsnft_adminSigner) {
    const wallet = new ethers.Wallet(privateKey, getProvider());
    (globalThis as any).__skinsnft_adminSigner = new ethers.NonceManager(wallet);
  }
  return (globalThis as any).__skinsnft_adminSigner;
}

export async function getUserSigner(privateKey: string): Promise<ethers.Wallet> {
  return new ethers.Wallet(privateKey, getProvider());
}

export async function mintSkin(toAddress: string, metadataUri: string): Promise<{ tokenId: bigint; txHash: string }> {
  const signer = getAdminSigner();
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract(signer);
  
  const tx = await contract.mint(toAddress, metadataUri);
  const receipt = await tx.wait();
  
  const event = receipt.logs.find((log: ethers.Log) => {
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
      return parsed?.name === "SkinMinted";
    } catch {
      return false;
    }
  });

  if (!event) throw new Error("Mint event not found");
  
  const parsed = contract.interface.parseLog({ topics: event.topics as string[], data: event.data });
  const tokenId = parsed?.args[0] as bigint;

  return { tokenId, txHash: receipt.hash };
}

export async function mintBatchSkins(
  toAddress: string, 
  metadataUris: string[]
): Promise<{ tokenIds: bigint[]; txHash: string }> {
  const signer = getAdminSigner();
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract(signer);
  
  // Get the next token ID before minting
  const nextTokenIdBefore = await contract.getNextTokenId();
  
  const tx = await contract.mintBatch(toAddress, metadataUris);
  
  // Wait for the transaction and get the return value
  const receipt = await tx.wait();
  
  // Calculate token IDs from the range
  const nextTokenIdAfter = await contract.getNextTokenId();
  const count = Number(nextTokenIdAfter - nextTokenIdBefore);
  
  if (count === 0) {
    throw new Error("No tokens were minted. Check contract and transaction.");
  }
  
  // Generate token IDs based on the range
  const tokenIds: bigint[] = [];
  for (let i = 0; i < count; i++) {
    tokenIds.push(nextTokenIdBefore + BigInt(i));
  }

  console.log(`Successfully minted ${count} tokens (IDs: ${tokenIds.map(id => id.toString()).join(", ")})`);

  return { tokenIds, txHash: receipt.hash };
}

export async function listSkinForSale(
  userPrivateKey: string,
  tokenId: number,
  priceWei: bigint
): Promise<{ txHash: string }> {
  const signer = await getUserSigner(userPrivateKey);
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract(signer);
  
  const tx = await contract.listForSale(tokenId, priceWei);
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash };
}

export async function cancelSkinListing(
  userPrivateKey: string,
  tokenId: number
): Promise<{ txHash: string }> {
  const signer = await getUserSigner(userPrivateKey);
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract(signer);
  
  const tx = await contract.cancelListing(tokenId);
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash };
}

export async function buySkin(
  userPrivateKey: string,
  tokenId: number,
  priceWei: bigint
): Promise<{ txHash: string }> {
  const signer = await getUserSigner(userPrivateKey);
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract(signer);
  
  const tx = await contract.buy(tokenId, { value: priceWei });
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash };
}

export async function getListingOnChain(tokenId: number): Promise<{
  seller: string;
  price: bigint;
  active: boolean;
} | null> {
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract();
  
  try {
    const [seller, price, active] = await contract.getListing(tokenId);
    if (!active) return null;
    return { seller, price, active };
  } catch {
    return null;
  }
}

export async function getOwnerOf(tokenId: number): Promise<string | null> {
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract();
  
  try {
    return await contract.ownerOf(tokenId);
  } catch {
    return null;
  }
}

export async function getTokenURI(tokenId: number): Promise<string | null> {
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract();
  
  try {
    return await contract.tokenURI(tokenId);
  } catch {
    return null;
  }
}

export async function getNextTokenId(): Promise<bigint> {
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract();
  return await contract.getNextTokenId();
}

export async function getBalance(address: string): Promise<bigint> {
  const provider = getProvider();
  return await provider.getBalance(address);
}

export async function transferSkin(
  fromPrivateKey: string,
  toAddress: string,
  tokenId: number
): Promise<{ txHash: string }> {
  const signer = await getUserSigner(fromPrivateKey);
  const fromAddress = await signer.getAddress();
  const address = getContractAddress();
  await assertContractDeployed(address);
  const contract = getContract(signer);
  
  const tx = await contract.transferFrom(fromAddress, toAddress, tokenId);
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash };
}

export function weiToEth(wei: bigint): string {
  return ethers.formatEther(wei);
}

export function ethToWei(eth: string): bigint {
  return ethers.parseEther(eth);
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function createWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}


