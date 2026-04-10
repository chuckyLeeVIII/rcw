# PyGUI Wallet - Multi-Chain Recovery Wallet

PyGUI Wallet is a comprehensive multi-cryptocurrency wallet with advanced recovery, cross-chain tracking, and master ledger capabilities. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Wallet

- **Multi-Cryptocurrency Support**: BTC, BTC Testnet, LTC, DOGE, DASH, ETH, ETC, BCH
- **Wallet Recovery**: Seed phrases (BIP39), private keys, WIF, wallet.dat files
- **Multiple Derivation Paths**: BIP44, BIP49, BIP84, BIP86
- **Send Transactions**: Multi-recipient support with RBF and CPFP
- **Transaction History**: Complete tracking with confirmation status

### 🆕 Master Ledger System

- **Central Tracking**: All wallets, keys, and addresses tracked in one master ledger
- **Status Monitoring**: Active, empty, and dead key detection
- **Cross-Chain Summary**: Aggregated view across all networks
- **Recovery Score**: 0-100 score indicating recovery completeness
- **Persistent Storage**: IndexedDB backup for all ledger data

### 🆕 Unconfirmed & Unspent (UTXO) Tracking

- **Confirmed/Unconfirmed Balances**: Separate tracking for both states
- **UTXO Management**: Full UTXO tracking with transaction details
- **Transaction State Monitoring**: Track pending, confirmed, and failed transactions
- **Real-time Updates**: Balance checker refreshes all states

### 🆕 Cross-Chain Calculations

- **Cross-Chain Wallet Grouping**: Link addresses from same seed across multiple chains
- **Aggregate Balance Views**: See total value across all networks
- **Recovery Reports**: Detailed breakdown of recovery status per network
- **Stale/Dead Address Detection**: Automatically identify unused addresses
- **Smart Recommendations**: AI-generated suggestions for improving recovery

### 🆕 Ownership & Tax Management

- **Ownership Tracking**: Assign owners to recovered wallets
- **Ownership Verification**: Cryptographic proof of wallet control
- **Tax Deposit Tracking**: Record tax payments with transaction hashes
- **Developer Tax System**: Configurable tax rate on claimed wallets

### Recovery Pool

- **Multi-Source Recovery**: Scan seeds, keys, and wallet.dat files simultaneously
- **IndexedDB Persistence**: All data saved locally for session recovery
- **Pool Export/Import**: Full backup and restore capabilities
- **Bulk Operations**: Delete, claim, and manage multiple wallets at once

### Interface

- **Dark Futuristic UI**: Modern, clean design with Tailwind CSS
- **Responsive Layout**: Works on desktop and mobile
- **Advanced Filtering**: Search, filter by network, tags, claimed status
- **Sorting**: Sort by balance, network, date, amount

## 📦 Installation

### Prerequisites

- Node.js 16+ (recommended: Node.js 18+)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

The app will be available at `http://localhost:5173`

## 📖 Usage Guide

### 1. Recover Wallet from Seed

1. Navigate to **Recovery Pool** page
2. Enter your BIP39 mnemonic phrase
3. Click **Recover from Seed**
4. System will:
   - Derive addresses across all supported networks
   - Check balances on each address
   - Track confirmed and unconfirmed balances
   - Update master ledger automatically

### 2. Recover from Private Key

1. Enter private key (hex, WIF, or mnemonic format)
2. Click **Recover from Private Key**
3. System scans all networks for balances

### 3. Recover from wallet.dat

1. Click **Recover from .dat File**
2. Select your Bitcoin Core wallet.dat file
3. System extracts and scans:
   - WIF keys
   - Hex private keys
   - Mnemonic phrases
   - Raw key data

### 4. View Master Ledger

1. Navigate to **Master Ledger** section
2. View:
   - Total entries (wallets/addresses)
   - Active keys with balances
   - Empty keys (no balance, no activity)
   - Dead keys (never had activity)
   - Cross-chain summary
   - Recovery score

### 5. Clean Dead/Empty Keys

```javascript
// In RecoveryPoolContext
cleanDeadEmptyKeys({
  removeEmpty: true,    // Remove zero-balance addresses
  removeDead: true,     // Remove never-used addresses
  minBalance: 0         // Minimum balance threshold
})
```

### 6. Cross-Chain Analysis

1. Click **Refresh Cross-Chain Calculations**
2. View:
   - Wallets grouped by seed fingerprint
   - Total confirmed/unconfirmed per group
   - Networks active for each seed
   - UTXO aggregation
   - Recovery recommendations

### 7. Track Unconfirmed Balances

All wallets now show:

- `balance` - Confirmed balance
- `unconfirmedBalance` - Pending transactions
- `utxoCount` - Number of UTXOs
- `lastChecked` - Last balance check timestamp

### 8. Ownership & Tax

```javascript
// Set wallet owner
setWalletOwner(walletId, 'owner-identifier')

// Record tax deposit
recordTaxDeposit(walletId, txHash, amount)

// Verify ownership
const isOwner = await verifyOwnership(walletId)
```

## 🔧 Architecture

### Core Components

```
src/
├── context/
│   ├── RecoveryPoolContext.tsx    # Main recovery pool + master ledger
│   ├── WalletContext.tsx          # Wallet state management
│   ├── KeyManagementContext.tsx   # Key generation/import/export
│   └── MarketplaceContext.tsx     # Marketplace features
├── utils/
│   ├── masterLedger.ts            # Master ledger implementation
│   ├── crossChainCalculator.ts    # Cross-chain calculations
│   ├── balanceChecker.ts          # Multi-network balance checking
│   ├── recoveryEngine.ts          # Seed/key derivation engine
│   ├── electrumx.ts               # ElectrumX WebSocket client
│   └── datFileParser.ts           # wallet.dat file parser
├── types/
│   ├── recoveryPool.ts            # Core type definitions
│   ├── keyManagement.ts           # Key management types
│   └── nft.ts                     # NFT types
└── pages/
    ├── RecoveryPoolPage.tsx       # Main recovery interface
    ├── WalletPage.tsx             # Wallet overview
    ├── SendPage.tsx               # Send transactions
    ├── HistoryPage.tsx            # Transaction history
    └── KeyManagementPage.tsx      # Key management
```

### Master Ledger Flow

```
Recovery Source (Seed/Key/.dat)
        ↓
Recovery Engine (Derive Addresses)
        ↓
Balance Checker (Check Confirmed + Unconfirmed)
        ↓
Master Ledger (Track All State)
        ↓
Cross-Chain Calculator (Group & Analyze)
        ↓
UI Display (Ledger + Reports)
```

## 🔐 Security

- **Client-Side Only**: All operations happen in browser
- **No Server Storage**: Private keys never leave your device
- **IndexedDB Persistence**: Encrypted local storage
- **Seed Encryption**: Pool seed can be encrypted with passphrase
- **Educational Purpose**: Use audited solutions for production funds

## 🌐 Supported Networks

| Network | Symbol | Type | Derivation |
|---------|--------|------|------------|
| Bitcoin | BTC | UTXO | BIP44/49/84/86 |
| Bitcoin Testnet | tBTC | UTXO | BIP44/49/84/86 |
| Litecoin | LTC | UTXO | BIP44/49/84 |
| Dogecoin | DOGE | UTXO | BIP44 |
| Dash | DASH | UTXO | BIP44 |
| Ethereum | ETH | Account | BIP44 |
| Ethereum Classic | ETC | Account | BIP44 |
| Bitcoin Cash | BCH | UTXO | BIP44 |

## 📊 API Endpoints

Balance checking uses rotating APIs for reliability:

- **BTC**: Blockstream, Mempool.space, BlockCypher
- **ETH**: Etherscan, Cloudflare ETH RPC, Ankr
- **LTC/DOGE/DASH**: BlockCypher, Blockchair
- **ElectrumX**: Direct Bitcoin node access via WebSocket

## 🛠️ Development

### Adding New Networks

1. Update `SUPPORTED_NETWORKS` in `src/types/recoveryPool.ts`
2. Add network config in `src/utils/crossChainCalculator.ts`
3. Add balance endpoints in `src/utils/balanceChecker.ts`

### Extending Master Ledger

The master ledger in `src/utils/masterLedger.ts` provides:

- `updateMasterLedger()` - Refresh from current state
- `cleanDeadEmptyKeys()` - Remove unused addresses
- `generateRecoveryReport()` - Full analysis report
- `calculateCrossChainTotals()` - Aggregate balances

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

Pull requests welcome. Please ensure all TypeScript checks pass before submitting.

## ⚠️ Disclaimer

This software is provided as-is for educational and recovery purposes. Always verify transactions and balances independently before making any financial decisions. The developers are not responsible for any loss of funds.
