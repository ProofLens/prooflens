import { useState, type ImgHTMLAttributes, type ReactElement } from "react";
import { ProofLensStatus } from "./ProofLensStatus.js";
import { useProofLensVerification, type UseProofLensVerificationInput } from "./useProofLensVerification.js";

export interface ProofLensFigureProps extends Omit<UseProofLensVerificationInput, "imgRef" | "image"> {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  credit?: string;
  envelopeUrl?: string;
  manifestUrl?: string;
  crossOrigin?: "anonymous" | "use-credentials";
}

export function ProofLensFigure(props: ProofLensFigureProps): ReactElement {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const verification = useProofLensVerification({
    image,
    ...(props.enabled === undefined ? {} : { enabled: props.enabled }),
    ...(props.registryLookup === undefined ? {} : { registryLookup: props.registryLookup }),
    ...(props.verifyC2pa === undefined ? {} : { verifyC2pa: props.verifyC2pa }),
    ...(props.registryRecord === undefined ? {} : { registryRecord: props.registryRecord }),
    ...(props.detachedEnvelope === undefined ? {} : { detachedEnvelope: props.detachedEnvelope }),
    ...(props.legacyManifest === undefined ? {} : { legacyManifest: props.legacyManifest }),
    ...(props.now === undefined ? {} : { now: props.now }),
    ...(props.online === undefined ? {} : { online: props.online })
  });
  const imgProps: ImgHTMLAttributes<HTMLImageElement> & Record<string, string> = {
    src: props.src,
    alt: props.alt
  };
  if (props.srcSet !== undefined) imgProps.srcSet = props.srcSet;
  if (props.sizes !== undefined) imgProps.sizes = props.sizes;
  if (props.envelopeUrl !== undefined) imgProps["data-prooflens-envelope-url"] = props.envelopeUrl;
  if (props.manifestUrl !== undefined) imgProps["data-manifest-url"] = props.manifestUrl;
  if (props.crossOrigin !== undefined) imgProps.crossOrigin = props.crossOrigin;
  const statusProps = {
    status: verification.status,
    ...(verification.report === undefined ? {} : { report: verification.report }),
    ...(verification.error === undefined ? {} : { error: verification.error })
  };
  return (
    <figure data-prooflens-id="react-figure">
      <img ref={setImage} {...imgProps} />
      <figcaption>
        {props.credit}
        <ProofLensStatus {...statusProps} />
      </figcaption>
    </figure>
  );
}
