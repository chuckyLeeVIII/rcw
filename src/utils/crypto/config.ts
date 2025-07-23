import { networks } from 'bitcoinjs-lib';

export const NETWORKS = {
  bitcoin: networks.bitcoin,
  testnet: networks.testnet
};

export const DERIVATION_PATHS = {
  bitcoin: "m/44'/0'/0'/0/0",
  ethereum: "m/44'/60'/0'/0/0"
};