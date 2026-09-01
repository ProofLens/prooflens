import { canonicalize, parseEnvelope, type ProofLensEnvelope } from "@prooflens/claim";
import type { HtmlDiscovery } from "./types.js";

function html(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function unhtml(value: string): string {
  return value.replaceAll("&quot;", '"').replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
}

function attr(source: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`, "u").exec(source);
  return match?.[1] === undefined ? undefined : unhtml(match[1]);
}

export function renderProofFigure(
  imageUrl: string,
  alt: string,
  envelope: ProofLensEnvelope,
  options: { legacyManifestUrl?: string } = {}
): string {
  const { claim } = envelope;
  const legacy = options.legacyManifestUrl === undefined
    ? ""
    : ` data-manifest-url="${html(options.legacyManifestUrl)}"`;
  const locator = claim.locators.claim === undefined ? "" : ` data-prooflens-claim="${html(claim.locators.claim)}"`;
  const json = canonicalize(envelope).replaceAll("<", "\\u003c");
  return `<figure data-prooflens-id="${html(claim.claimId)}"${locator}${legacy}>
  <img src="${html(imageUrl)}" alt="${html(alt)}">
  <figcaption data-prooflens-credit="${html(claim.creator.creditLine)}" data-prooflens-caption="${html(claim.creator.caption)}">${html(claim.creator.creditLine)}</figcaption>
  <script type="application/prooflens+json">${json}</script>
</figure>`;
}

export function discoverHtmlProvenance(htmlSource: string): HtmlDiscovery {
  const figure = /<figure\b[^>]*>[\s\S]*?<\/figure>/u.exec(htmlSource)?.[0];
  if (figure === undefined) return { captionMatches: false, creditMatches: false };
  const script = /<script type="application\/prooflens\+json">([\s\S]*?)<\/script>/u.exec(figure)?.[1];
  const caption = /<figcaption\b([^>]*)>([\s\S]*?)<\/figcaption>/u.exec(figure);
  const envelope = script === undefined ? undefined : parseEnvelope(JSON.parse(script) as unknown);
  const expectedCredit = envelope?.claim.creator.creditLine;
  const expectedCaption = envelope?.claim.creator.caption;
  const creditMatches = expectedCredit !== undefined
    && attr(caption?.[1] ?? "", "data-prooflens-credit") === expectedCredit
    && (caption?.[2] ?? "").trim() === expectedCredit;
  const captionMatches = expectedCaption !== undefined
    && attr(caption?.[1] ?? "", "data-prooflens-caption") === expectedCaption;
  const discovery: HtmlDiscovery = { captionMatches, creditMatches };
  if (envelope !== undefined) discovery.envelope = envelope;
  const claimLocator = attr(figure, "data-prooflens-claim");
  if (claimLocator !== undefined) discovery.claimLocator = claimLocator;
  const legacyManifestUrl = attr(figure, "data-manifest-url");
  if (legacyManifestUrl !== undefined) discovery.legacyManifestUrl = legacyManifestUrl;
  return discovery;
}
