# Lightning Network Demo Wallet

A simple, user-friendly Lightning Network wallet built with Next.js and FLNDR (Fast Lightning Network Devkit for Rookies). This demo wallet showcases essential Lightning Network functionality with a clean, modern interface.

![Lightning Wallet Demo](public/wallet-screenshot.png)

## Features

- ⚡ **Send Lightning Payments**: Paste invoice and send payments
- 🔍 **Decode Invoices**: Verify payment details before sending
- 🧾 **Create Invoices**: Generate invoices with customizable amounts and memos
- 📱 **QR Code Support**: Display invoices as QR codes for easy scanning
- 📊 **Transaction History**: View sent and received payments
- 🔄 **Real-time Updates**: Transaction list auto-updates when sending/receiving payments
- 🔎 **Transaction Filtering**: Filter transactions by type, status, and date
- 📝 **Detailed Transaction Views**: See full details of any transaction

## Tech Stack

- **Frontend**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS
- **Lightning Integration**: FLNDR (LND client wrapper)
- **State Management**: React hooks and context with event bus pattern

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Access to an LND node (local or remote)
- Macaroon and TLS cert for your LND node

### Setting Up Environment Variables

Create a `.env.local` file in the root directory with the following:

```
# LND Connection
NEXT_PUBLIC_LND_REST_API_URL=https://your-lnd-node:8080
NEXT_PUBLIC_LND_MACAROON=your-hex-encoded-macaroon

# Optional TLS cert if needed
# NEXT_PUBLIC_LND_TLS_CERT=your-tls-cert
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/voltage-demo-wallet.git
cd voltage-demo-wallet
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

### Sending Payments

1. Navigate to the "Send Lightning Payment" section
2. Paste a Lightning invoice in the input field
3. Optional: Click "Decode Invoice" to verify payment details before sending
4. Click "Send Payment" (or "Confirm & Send" if you decoded first)
5. View payment status and receipt after sending

### Receiving Payments

1. Navigate to the "Lightning Invoice" section
2. Enter the amount in sats that you want to receive
3. Optional: Add a memo for the payment
4. Click "Create Invoice"
5. Share the generated invoice or have the payer scan the QR code
6. Click "Check Payment" to verify if payment was received

### Transaction History

The transaction history automatically updates whenever you:
- Create a new invoice
- Receive a payment
- Send a payment

You can:
- Filter transactions by type (sent/received)
- Filter by status (settled, pending, etc.)
- Filter by time range (today, week, month)
- Click on any transaction to see detailed information

## How It Works

The wallet uses an event bus system to communicate between components:

```typescript
// Components emit events when actions occur
eventBus.emit('payment:sent', paymentResult);
eventBus.emit('invoice:created', newInvoice);

// The transaction history listens for these events
eventBus.on('payment:sent', handleTransactionEvent);
eventBus.on('invoice:created', handleTransactionEvent);
```

This ensures the transaction list always stays up to date without requiring page refreshes.

## License

[MIT](LICENSE)

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [FLNDR Documentation](https://github.com/AustinKelsay/FLNDR)
- [Lightning Network Documentation](https://lightning.network/)
