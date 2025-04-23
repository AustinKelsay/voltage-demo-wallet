import LightningReceive from "./components/LightningReceive";
import LightningSend from "./components/LightningSend";
import TransactionHistory from "./components/TransactionHistory/index";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 lg:p-24">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-8">Lightning Wallet</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <LightningReceive />
          </div>
          <div>
            <LightningSend />
          </div>
        </div>
        
        <div className="mb-12">
          <TransactionHistory pageSize={5} />
        </div>
      </div>
    </main>
  );
} 