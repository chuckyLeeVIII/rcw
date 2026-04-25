import { ethers } from 'ethers';

export interface WithdrawalResult {
  txHash: string;
  sentAmount: string;
  sourceAddress: string;
  destinationAddress: string;
}

function normalizePrivateKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith('0x')) return trimmed;
  return `0x${trimmed}`;
}

export async function withdrawNativeToAddress(params: {
  privateKey: string;
  toAddress: string;
  gasPriceGwei?: string;
}): Promise<WithdrawalResult> {
  const { privateKey, toAddress, gasPriceGwei } = params;
  if (!window.ethereum) {
    throw new Error('No injected wallet/provider found.');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const destination = ethers.utils.getAddress(toAddress);
  const wallet = new ethers.Wallet(normalizePrivateKey(privateKey), provider);

  const [balanceWei, feeData] = await Promise.all([
    wallet.getBalance(),
    provider.getFeeData(),
  ]);

  const gasLimit = ethers.BigNumber.from(21000);
  const gasPrice = gasPriceGwei
    ? ethers.utils.parseUnits(gasPriceGwei, 'gwei')
    : (feeData.gasPrice || ethers.utils.parseUnits('21', 'gwei'));

  const gasCost = gasPrice.mul(gasLimit);
  if (balanceWei.lte(gasCost)) {
    throw new Error('Insufficient balance in recovered wallet after gas cost.');
  }

  const value = balanceWei.sub(gasCost);
  const tx = await wallet.sendTransaction({
    to: destination,
    value,
    gasLimit,
    gasPrice,
  });
  await tx.wait();

  return {
    txHash: tx.hash,
    sentAmount: ethers.utils.formatEther(value),
    sourceAddress: wallet.address,
    destinationAddress: destination,
  };
}
