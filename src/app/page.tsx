import { AuthGate } from "./auth-gate";

export default function Home() {
  return (
    <main className="shell">
      <h1>Tech Lead Trainer</h1>
      <p className="lead" data-testid="home-intro">
        Your daily practice starts here.
      </p>
      <AuthGate />
    </main>
  );
}
