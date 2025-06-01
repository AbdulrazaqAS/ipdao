import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, Copy } from "lucide-react";
import type { AssetAPIMetadata, AssetLicenseTerms, AssetMetadata, LicenseTerms, NFTMetadata } from "../utils/utils";
import { fetchMetadata, getAssetAPIMetadata, getAssetLicenseTerms, getLicenseTerms } from "../scripts/asset";
import { useChainId } from "wagmi";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl bg-surface p-4 mb-4 transition-all">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {open ? (
          <ChevronUp className="text-muted" />
        ) : (
          <ChevronDown className="text-muted" />
        )}
      </div>
      {open && <div className="mt-3 text-text text-sm">{children}</div>}
    </div>
  );
};

function TraitCard({ trait }: { trait: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(trait.value?.toString() || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative bg-background rounded-lg p-3 shadow border border-surface">
      <p className="text-xs text-muted">{trait?.trait_type ?? trait.key}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text break-all font-medium w-[calc(100%-2rem)]">
          {trait.value?.toString()}
        </p>
        <button onClick={handleCopy} className="text-muted hover:text-primary">
          <Copy size={16} />
        </button>
      </div>
      {trait.max_value !== undefined && (
        <div className="mt-1 text-xs text-muted">Max: {trait.max_value}</div>
      )}
      {copied && (
        <span className="absolute top-1 right-2 text-accent text-xs">Copied</span>
      )}
    </div>
  );
}

interface Props {
  assetMetadata: AssetMetadata;
  setSelectedAsset: Function;
}

export default function AssetPage({ assetMetadata, setSelectedAsset }: Props) {
  const [assetAPIMetadata, setAssetAPIMetadata] = useState<AssetAPIMetadata>();
  const [assetLicenseTerms, setAssetLicenseTerms] = useState<AssetLicenseTerms[]>([]);
  const [licenseTerms, setLicenseTerms] = useState<LicenseTerms>();
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata>();

  const chain = useChainId();

  useEffect(() => {
    getAssetAPIMetadata(assetMetadata.id, chain).then((metadata) => {
      setAssetAPIMetadata(metadata);
    }).catch((error) => {
      console.error("Error fetching asset API metadata:", error);
    });

    getAssetLicenseTerms(assetMetadata.id, chain).then((terms) => {
      setAssetLicenseTerms(terms);
      console.log("Asset License Terms:", terms);
    }).catch((error) => {
      console.error("Error fetching asset license terms:", error);
    });

    fetchMetadata(assetMetadata.nftTokenURI).then((metadata) => {
      setNftMetadata(metadata);
      console.log("NFT Metadata:", metadata);
    }).catch((error) => {
      console.error("Error fetching NFT metadata:", error);
    });
  }, []);

  useEffect(() => {
    if (assetLicenseTerms.length === 0) return;
    getLicenseTerms(Number(assetLicenseTerms[0].licenseTermsId), chain).then((terms) => {
      setLicenseTerms(terms);
      console.log("License Terms:", terms);
    }).catch((error) => {
      console.error("Error fetching license terms:", error);
    });
  }, [assetLicenseTerms]);

  return (
    <div className="min-h-screen bg-background px-4 pb-10 text-text">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <label onClick={() => setSelectedAsset(undefined)}><ChevronLeft size={30} className="inline"/> Back</label>
          <h1 className="text-3xl font-bold text-primary">{assetMetadata.title}</h1>
          <p className="text-md text-muted break-all mt-1">{assetMetadata.id}</p>
        </div>

        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <div className="w-full md:max-w-lg">
            <img
              src={assetMetadata.image}
              alt="IP Asset Image"
              className="w-full object-cover"
            />
          </div>

          <div className="h-full w-full">
            <Section title="Description">
              {assetMetadata.description || "No description available."}
            </Section>

            {/* Metadata Grid */}
            <div className="h-full w-full grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-4 mb-8">
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">Licenses</p>
                <p className="text-text font-medium break-words">{assetLicenseTerms.length}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">Descendants</p>
                <p className="text-text font-medium break-words">{assetAPIMetadata?.descendantCount}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">Children</p>
                <p className="text-text font-medium break-words">{assetAPIMetadata?.childrenCount}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">Created At</p>
                <p className="text-text font-medium break-words">{new Date(Number(assetMetadata.createdAt)).toISOString()}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">Media Type</p>
                <p className="text-text font-medium break-words">{assetMetadata.mediaType}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">Media Url</p>
                <p className="text-text font-medium break-words"><a href={assetMetadata.mediaUrl} target="_blank">Link</a></p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">AssetLicenseComRevShare</p>
                <p className="text-text font-medium break-words">{assetLicenseTerms[0]?.licensingConfig.commercialRevShare}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg shadow">
                <p className="text-muted text-xs">AssetLicenseMintingFee</p>
                <p className="text-text font-medium break-words">{assetLicenseTerms[0]?.licensingConfig.mintingFee}</p>
              </div>
            </div>
          </div>
        </div>

        <Section title="Ownership">
          The current owner of the IP NFT is <span className="font-medium">0x4321...dead</span>. Ownership grants the right to license and enforce rights on-chain.
        </Section>

        <Section title="Licensing">
          <div className="space-y-2">
            <div className="flex justify-between text-sm border-b border-surface py-1">
              <span className="text-muted">Licensee</span>
              <span>0xbeef...cafe</span>
            </div>
            <div className="flex justify-between text-sm border-b border-surface py-1">
              <span className="text-muted">License Type</span>
              <span>Remix + Commercial</span>
            </div>
            <div className="flex justify-between text-sm border-b border-surface py-1">
              <span className="text-muted">Valid Until</span>
              <span>Jul 10, 2025</span>
            </div>
          </div>
        </Section>

        <Section title="License Traits">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {licenseTerms?.licenseTerms.map((trait, index) => (
              <TraitCard key={index} trait={trait} />
            ))}
          </div>
        </Section>

        <Section title="NFT Metadata">
          <div className="space-y-2">
            <div className="flex justify-between text-sm border-b border-surface py-1">
              <span className="text-muted">Name</span>
              <span>{nftMetadata?.name}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-surface py-1">
              <span className="text-muted">Description</span>
              <span>{nftMetadata?.description}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-surface py-1">
              <span className="text-muted">Image</span>
              <span><a href={nftMetadata?.image} target="_blank">Link</a></span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {nftMetadata?.attributes.map((attr, index) => (
                <TraitCard key={index} trait={attr} />
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
