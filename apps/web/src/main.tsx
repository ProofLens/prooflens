import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const TEST_KID = "https://registry.example.test/v1/keys/golden";
const TEST_DIGEST = "4093a532cd54a50e68c64bb8dae578f587c6687ca98c06765dde3f35849525f4";

interface Health {
  ok: boolean;
  service: string;
  environment: string;
  version: string;
}

interface Identity {
  kid: string;
  status: string;
  identity: { displayName: string };
}

function App(): React.JSX.Element {
  const [health, setHealth] = useState<Health | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [healthResponse, identityResponse] = await Promise.all([
          fetch("/api/health", { cache: "no-store" }),
          fetch(`/api/v1/identities?kid=${encodeURIComponent(TEST_KID)}`, { cache: "no-cache" })
        ]);
        if (!healthResponse.ok || !identityResponse.ok) throw new Error("Registry lookup failed");
        setHealth(await healthResponse.json() as Health);
        setIdentity(await identityResponse.json() as Identity);
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Registry unavailable");
      }
    };
    void load();
  }, []);

  return (
    <main>
      <p className="eyebrow">Portable provenance, independently evaluated</p>
      <h1>ProofLens registry</h1>
      <p className="lede">
        Creator identity trust and C2PA validity remain separate evidence. This public Phase 6 service is read-only.
      </p>
      <section aria-labelledby="registry-heading">
        <h2 id="registry-heading">Live registry status</h2>
        {error === null ? (
          <dl aria-live="polite">
            <div><dt>Service</dt><dd>{health?.ok === true ? "Available" : "Checking…"}</dd></div>
            <div><dt>Environment</dt><dd>{health?.environment ?? "Checking…"}</dd></div>
            <div><dt>Reviewed test identity</dt><dd>{identity?.identity.displayName ?? "Checking…"}</dd></div>
            <div><dt>Identity state</dt><dd>{identity?.status ?? "Checking…"}</dd></div>
          </dl>
        ) : <p role="alert">Registry unavailable: {error}</p>}
      </section>
      <nav aria-label="Public registry endpoints">
        <a href={`/api/v1/identities?kid=${encodeURIComponent(TEST_KID)}`}>Identity record</a>
        <a href={`/api/v1/manifests/${TEST_DIGEST}`}>Detached test manifest</a>
        <a href="/api/health">Health and version</a>
      </nav>
    </main>
  );
}

const root = document.getElementById("root");
if (root === null) throw new Error("ProofLens root element is missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);
