import { useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { generateCreatorKey, signClaim } from "@prooflens/identity";
import { ProofLensFigure } from "../../src/ProofLensFigure.js";
import { ProofLensStatus } from "../../src/ProofLensStatus.js";
import { useProofLensVerification } from "../../src/useProofLensVerification.js";
import type { RegistryLookup } from "@prooflens/verifier";

interface Fixture {
  envelope: { claim: Parameters<typeof signClaim>[0] };
  conflictingEnvelope: unknown;
  record: unknown;
  now: string;
  kid: string;
  corsOrigin: string;
}

const fixture = (globalThis as unknown as { __PROOFLENS_FIXTURE: Fixture }).__PROOFLENS_FIXTURE;
const scenario = (globalThis as unknown as { __PROOFLENS_SCENARIO: string }).__PROOFLENS_SCENARIO;
const now = new Date(fixture.now);

function unavailableLookup(): RegistryLookup {
  return async () => ({ status: "unavailable", reason: "Registry is unavailable" });
}

function OfflineDemo(): ReactElement {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const verification = useProofLensVerification({
    image,
    enabled,
    online: false,
    detachedEnvelope: fixture.envelope,
    registryLookup: unavailableLookup(),
    verifyC2pa: async () => ({
      present: false,
      signatureValid: false,
      ecosystemTrust: "untrusted",
      developmentCredential: false,
      state: "absent",
      reasons: ["C2PA was not evaluated in this environment"],
      validationStatus: []
    }),
    now
  });
  return (
    <figure>
      <img ref={setImage} src="/assets/right.jpg" alt="offline" data-prooflens-envelope-url="/assets/envelope.json" />
      <figcaption>
        Photo: Phase Four Creator
        <button type="button" id="start-verify" onClick={() => setEnabled(true)}>Verify offline</button>
        <ProofLensStatus
          status={verification.status}
          {...(verification.report === undefined ? {} : { report: verification.report })}
          {...(verification.error === undefined ? {} : { error: verification.error })}
        />
      </figcaption>
    </figure>
  );
}

function ConflictDemo(): ReactElement {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const verification = useProofLensVerification({
    image,
    detachedEnvelope: fixture.envelope,
    registryRecord: fixture.record,
    verifyC2pa: async () => ({
      present: false,
      signatureValid: false,
      ecosystemTrust: "untrusted",
      developmentCredential: false,
      state: "absent",
      reasons: ["C2PA was not evaluated in this environment"],
      validationStatus: []
    }),
    now
  });
  return (
    <figure data-prooflens-id="conflict">
      <img ref={setImage} src="/assets/right.jpg" alt="conflict" data-prooflens-envelope-url="/assets/envelope.json" />
      <figcaption>
        Photo: Phase Four Creator
        <ProofLensStatus
          status={verification.status}
          {...(verification.report === undefined ? {} : { report: verification.report })}
          {...(verification.error === undefined ? {} : { error: verification.error })}
        />
      </figcaption>
      <script type="application/prooflens+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fixture.conflictingEnvelope) }} />
    </figure>
  );
}

function BrowserSignDemo(): ReactElement {
  const [message, setMessage] = useState("Create a browser-only ProofLens identity key");
  return (
    <div>
      <p id="sign-status">{message}</p>
      <button
        type="button"
        id="browser-sign"
        onClick={() => {
          void (async () => {
            const keyPair = await generateCreatorKey();
            if (keyPair.privateKey.extractable) {
              setMessage("FAILED extractable");
              return;
            }
            await signClaim(fixture.envelope.claim, keyPair.privateKey);
            setMessage("Signed with ProofLens creator identity; C2PA signing is not available in the browser");
          })();
        }}
      >
        Sign in browser
      </button>
    </div>
  );
}

function App(): ReactElement {
  const absentC2pa = async () => ({
    present: false,
    signatureValid: false,
    ecosystemTrust: "untrusted" as const,
    developmentCredential: false,
    state: "absent" as const,
    reasons: ["C2PA was not evaluated in this environment"],
    validationStatus: []
  });
  const common = {
    alt: scenario,
    credit: "Photo: Phase Four Creator",
    now,
    detachedEnvelope: fixture.envelope,
    verifyC2pa: absentC2pa
  };
  if (scenario === "offline") return <OfflineDemo />;
  if (scenario === "browser-sign") return <BrowserSignDemo />;
  if (scenario === "conflict") return <ConflictDemo />;
  if (scenario === "unavailable-registry") {
    return (
      <ProofLensFigure
        {...common}
        src="/assets/right.jpg"
        envelopeUrl="/assets/envelope.json"
        registryLookup={unavailableLookup()}
      />
    );
  }
  if (scenario === "cors") {
    return (
      <ProofLensFigure
        {...common}
        src={`${fixture.corsOrigin}/blocked.jpg`}
        crossOrigin="anonymous"
        envelopeUrl="/assets/envelope.json"
        registryRecord={fixture.record}
      />
    );
  }
  if (scenario === "current-src") {
    return (
      <ProofLensFigure
        {...common}
        src="/assets/wrong.png"
        srcSet="/assets/right.jpg 1x"
        envelopeUrl="/assets/envelope.json"
        registryRecord={fixture.record}
      />
    );
  }
  return (
    <ProofLensFigure
      {...common}
      src="/assets/right.jpg"
      envelopeUrl="/assets/envelope.json"
      registryRecord={fixture.record}
    />
  );
}

const root = document.createElement("div");
document.body.append(root);
createRoot(root).render(<App />);
