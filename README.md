# PyGUI Wallet

PyGUI Wallet is a multi-cryptocurrency wallet with a dark, futuristic interface built using React, TypeScript, and Tailwind CSS.

## Features

- Support for multiple cryptocurrencies (BTC, ETH, USDT, LTC, WBTC)
- Wallet recovery using various key formats
- Send transactions to multiple recipients
- Transaction history
- Dark mode interface
- RBF (Replace-By-Fee) and CPFP (Child-Pays-For-Parent) support

## Installation Instructions

Follow these steps to set up and run the PyGUI Wallet on your local machine:

1. **Prerequisites**

   Ensure you have Node.js installed (version 14 or higher). Download it from [nodejs.org](https://nodejs.org/).

2. **Clone the repository**

   ```
   git clone https://github.com/yourusername/pygui-wallet.git
   cd pygui-wallet
   ```

3. **Install dependencies**

   Run the following command to install all required dependencies:

   ```
   npm install
   ```

4. **Start the development server**

   Run the following command to start the Vite development server:

   ```
   npm run dev
   ```

   This will start the application on `http://localhost:3000`.

5. **Build for production**

   When you're ready to deploy the application, create a production build:

   ```
   npm run build
   ```

   This will generate optimized files in the `dist` directory.

## Usage Tutorial

1. **Launching the Application**
   - Open your web browser and navigate to `http://localhost:3000`.
   - You'll see the dark, futuristic interface of the PyGUI Wallet.

2. **Recovering a Wallet**
   - In the "Recover Wallet" section, you'll see input fields for different key formats.
   - Enter your recovery key in the appropriate field. Supported formats include:
     - WIF (Wallet Import Format)
     - Hex private key
     - Mnemonic phrase
     - Encrypted wallet file (.dat)
   - Click the "Recover Wallet" button.

3. **Viewing Balances**
   - Once your wallet is recovered, you'll see your balances for different cryptocurrencies (BTC, ETH, USDT, LTC, WBTC) in the top-right corner.

4. **Sending Coins**
   - In the "Send Coins" section, you'll find fields for recipient address and amount.
   - Enter the recipient's address and the amount you want to send.
   - Select the coin type from the dropdown menu.
   - Click "Add Transaction" to queue multiple transactions.
   - You'll see a list of queued transactions below.

5. **Sending to Multiple Recipients**
   - Repeat step 4 for each recipient you want to send to.
   - Each new transaction will be added to the queue.

6. **Sending All Queued Transactions**
   - Once you've added all desired transactions, click the "Send All" button.
   - Confirm the transaction in the popup dialog.

7. **Viewing Transaction History**
   - Scroll down to see your transaction history.
   - Each entry shows the recipient, amount, coin type, and timestamp.

8. **RBF (Replace-By-Fee) Transactions**
   - For unconfirmed transactions that support RBF:
     - Click on the transaction in the history.
     - You'll see an option to increase the fee.
     - Enter the new fee and click "Replace Transaction".

9. **CPFP (Child-Pays-For-Parent)**
   - For unconfirmed transactions:
     - Click on the transaction in the history.
     - If CPFP is possible, you'll see an option to create a child transaction.
     - Enter the amount for the child transaction (usually 2x the original fee).
     - Click "Create CPFP Transaction".

10. **Linking Wallets (Temporary Connection)**
    - In the settings menu, you'll find an option to "Link Wallets".
    - This allows you to temporarily connect multiple wallets for easier fund management during recovery.

11. **Downloading Transaction Data**
    - For any transaction, you can click a "Download Data" button.
    - This will save the transaction details in a file, which can be useful for record-keeping or debugging.

## Security Considerations

- Always keep your recovery key safe and never share it with anyone.
- This wallet is for educational purposes only. For handling real cryptocurrencies, use well-established and audited wallet solutions.
- The application doesn't store any private keys or sensitive information on the server. All operations are performed client-side.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).