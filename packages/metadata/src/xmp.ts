import { canonicalize, parseCanonicalJson, type ProofLensClaim } from "@prooflens/claim";
import {
  PROOFLENS_XMP_NAMESPACE,
  parseCompactEmbeddedClaim,
  toCompactEmbeddedClaim,
  type CompactEmbeddedClaim,
  type DescriptiveMetadata
} from "./types.js";

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function unxml(value: string): string {
  return value
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function property(prefix: string, name: string, value: string | undefined): string {
  return value === undefined ? "" : `<${prefix}:${name}>${xml(value)}</${prefix}:${name}>`;
}

function readTag(packet: string, prefix: string, name: string): string | undefined {
  const match = new RegExp(`<${prefix}:${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${prefix}:${name}>`, "u").exec(packet);
  return match?.[1] === undefined ? undefined : unxml(match[1]);
}

function readSeqFirst(packet: string, name: string): string | undefined {
  const match = new RegExp(`<dc:${name}>\\s*<rdf:Seq>\\s*<rdf:li(?:\\s[^>]*)?>([\\s\\S]*?)</rdf:li>`, "u").exec(packet);
  return match?.[1] === undefined ? undefined : unxml(match[1]);
}

function readAltDefault(packet: string, name: string): string | undefined {
  const match = new RegExp(`<dc:${name}>\\s*<rdf:Alt>\\s*<rdf:li(?:\\s[^>]*)?>([\\s\\S]*?)</rdf:li>`, "u").exec(packet);
  return match?.[1] === undefined ? undefined : unxml(match[1]);
}

export function buildProofLensDescription(claim: CompactEmbeddedClaim): string {
  return `<rdf:Description rdf:about="" xmlns:prooflens="${PROOFLENS_XMP_NAMESPACE}">
${property("prooflens", "ClaimId", claim.claimId)}
${property("prooflens", "CreatorKid", claim.creatorKid)}
${property("prooflens", "CompactClaim", canonicalize(claim))}
${property("prooflens", "ClaimLocator", claim.locators.claim)}
${property("prooflens", "C2PALocator", claim.locators.c2pa)}
${property("prooflens", "RightsLocator", claim.locators.rights)}
</rdf:Description>`;
}

export function buildDescriptiveDescription(descriptive: DescriptiveMetadata): string {
  const rights = descriptive.rightsStatement === undefined
    ? ""
    : ` xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"`;
  return `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"${rights}>
<dc:creator><rdf:Seq><rdf:li>${xml(descriptive.creator ?? "")}</rdf:li></rdf:Seq></dc:creator>
<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xml(descriptive.description ?? "")}</rdf:li></rdf:Alt></dc:description>
<photoshop:Credit>${xml(descriptive.credit ?? "")}</photoshop:Credit>
${descriptive.rightsStatement === undefined ? "" : `<xmpRights:WebStatement>${xml(descriptive.rightsStatement)}</xmpRights:WebStatement>`}
</rdf:Description>`;
}

export function wrapXmpPacket(descriptions: string): string {
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
${descriptions}
</rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;
}

export function buildXmpPacket(claim: ProofLensClaim): string {
  const compact = toCompactEmbeddedClaim(claim);
  return wrapXmpPacket(`${buildDescriptiveDescription({
    creator: claim.creator.displayName,
    credit: claim.creator.creditLine,
    description: claim.creator.caption,
    ...(claim.locators.rights === undefined ? {} : { rightsStatement: claim.locators.rights })
  })}${buildProofLensDescription(compact)}`);
}

export function stripProofLensDescription(packet: string): string {
  return packet.replace(/\s*<rdf:Description\b(?=[^>]*xmlns:prooflens=)[\s\S]*?<\/rdf:Description>/gu, "");
}

function stripManagedDescriptiveDescription(packet: string): string {
  return packet.replace(/\s*<rdf:Description\b(?=[^>]*xmlns:photoshop=)(?![^>]*xmlns:prooflens=)[\s\S]*?<\/rdf:Description>/gu, "");
}

export function mergeXmpPacket(existing: string | undefined, claim: ProofLensClaim): string {
  const compact = toCompactEmbeddedClaim(claim);
  const proof = buildProofLensDescription(compact);
  const descriptive = buildDescriptiveDescription({
    creator: claim.creator.displayName,
    credit: claim.creator.creditLine,
    description: claim.creator.caption,
    ...(claim.locators.rights === undefined ? {} : { rightsStatement: claim.locators.rights })
  });
  if (existing === undefined) return wrapXmpPacket(`${descriptive}${proof}`);
  if (!existing.includes("</rdf:RDF>")) throw new Error("Malformed XMP packet");
  const cleaned = stripProofLensDescription(stripManagedDescriptiveDescription(existing));
  return cleaned.replace("</rdf:RDF>", `${descriptive}${proof}</rdf:RDF>`);
}

export function readCompactClaimFromXmp(packet: string): CompactEmbeddedClaim | undefined {
  const raw = readTag(packet, "prooflens", "CompactClaim");
  if (raw === undefined) return undefined;
  return parseCompactEmbeddedClaim(parseCanonicalJson(raw));
}

export function readDescriptiveMetadataFromXmp(packet: string): DescriptiveMetadata {
  const descriptive: DescriptiveMetadata = {};
  const creator = readSeqFirst(packet, "creator");
  const description = readAltDefault(packet, "description");
  const credit = readTag(packet, "photoshop", "Credit");
  const rights = readTag(packet, "xmpRights", "WebStatement");
  if (creator !== undefined) descriptive.creator = creator;
  if (description !== undefined) descriptive.description = description;
  if (credit !== undefined) descriptive.credit = credit;
  if (rights !== undefined) descriptive.rightsStatement = rights;
  return descriptive;
}

export function xmpContainsFinalFileDigest(packet: string, sha256: string): boolean {
  const proof = /<rdf:Description\b(?=[^>]*xmlns:prooflens=)[\s\S]*?<\/rdf:Description>/u.exec(packet)?.[0] ?? "";
  return proof.includes(sha256);
}
