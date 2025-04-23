import LightningReceive from "../app/components/LightningReceive";
import LightningSend from "../app/components/LightningSend";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Lightning Wallet</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <LightningReceive />
          </div>
          <div>
            <LightningSend />
          </div>
        </div>
      </div>
    </main>
  );
} 