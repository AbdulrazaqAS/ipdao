import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, Copy } from "lucide-react";
import type { AssetAPIMetadata, AssetLicenseTerms, AssetMetadata, LicenseTermsMetadata, NFTMetadata } from "../utils/utils";
import { fetchMetadata, getAssetAPIMetadata, getAssetLicenseTerms, getLicenseTerms } from "../scripts/asset";
import { useChainId } from "wagmi";
import AttachNewLicenseTermsForm from "./AttachNewLicenseTermsForm";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

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
    <div className="relative bg-background rounded-lg p-3 border border-surface">
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

// TODO: setShowNewLicenseForm should be set to false when its parent section is closed
export default function AssetPage({ assetMetadata, setSelectedAsset }: Props) {
  const [assetAPIMetadata, setAssetAPIMetadata] = useState<AssetAPIMetadata>();
  const [assetLicenses, setAssetLicenses] = useState<AssetLicenseTerms[]>([]);
  const [licensesTerms, setLicensesTerms] = useState<LicenseTermsMetadata[]>([]);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata>();
  const [showNewLicenseForm, setShowNewLicenseForm] = useState(false);

  const chain = useChainId();

  useEffect(() => {
    getAssetAPIMetadata(assetMetadata.id, chain).then((metadata) => {
      setAssetAPIMetadata(metadata);
      console.log("AssetAPIMetadata:", metadata);
    }).catch((error) => {
      console.error("Error fetching asset API metadata:", error);
    });

    getAssetLicenseTerms(assetMetadata.id, chain).then((terms) => {
      setAssetLicenses(terms);
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
    if (assetLicenses.length === 0) return;

    Promise.all(
      assetLicenses.map((license) => getLicenseTerms(Number(license.licenseTermsId), chain))
    ).then((termsArray) => {
      setLicensesTerms(termsArray);
      console.log("All License Terms:", termsArray);
    }).catch((error) => {
      console.error("Error fetching all license terms:", error);
    });
  }, [assetLicenses]);

  return (
    <div className="min-h-screen bg-background px-4 pb-10 text-text">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <label onClick={() => setSelectedAsset(undefined)}><ChevronLeft size={30} className="inline" /> Back</label>
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
              <div className="bg-surface p-4 rounded-lg">
                <p className="text-muted text-xs">Licenses</p>
                <p className="text-text font-medium break-words">{assetLicenses.length}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg">
                <p className="text-muted text-xs">Descendants</p>
                <p className="text-text font-medium break-words">{assetAPIMetadata?.descendantCount}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg">
                <p className="text-muted text-xs">Children</p>
                <p className="text-text font-medium break-words">{assetAPIMetadata?.childrenCount}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg">
                <p className="text-muted text-xs">Created At</p>
                <p className="text-text font-medium break-words">{new Date(Number(assetMetadata.createdAt)).toISOString()}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg">
                <p className="text-muted text-xs">Media Type</p>
                <p className="text-text font-medium break-words">{assetMetadata.mediaType}</p>
              </div>
              <div className="bg-surface p-4 rounded-lg">
                <p className="text-muted text-xs">Media Url</p>
                <p className="text-text font-medium break-words underline"><a href={assetMetadata.mediaUrl} target="_blank">Link</a></p>
              </div>
            </div>
          </div>
        </div>

        <Section title="Creators">
          <div className="space-y-2">
            {assetMetadata.creators.map((creator, index) => (
              <div key={index} className="bg-surface rounded-lg border-white border py-2 px-4">
                <p className="text-muted text-2xl font-semibold">{creator.name}</p>
                <p className="text-text font-medium break-words">{creator.address}</p>
                <p className="text-muted text-xs">Contribution: {creator.contributionPercent}%</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Licenses">
          <div className="flex flex-col">
            {licensesTerms.map((license, index) => (
              <Section key={index} title={`License Terms #${license.id}`}>
                <div className="bg-surface p-2 rounded-lg mb-2 border-white border">
                  <p className="text-muted text-xs">AssetLicenseComRevShare</p>
                  <p className="text-text font-medium break-words">{assetLicenses[index]?.licensingConfig.commercialRevShare}</p>
                </div>

                <div className="bg-surface p-4 rounded-lg mb-3 border-white border">
                  <p className="text-muted text-xs">AssetLicenseMintingFee</p>
                  <p className="text-text font-medium break-words">{assetLicenses[index]?.licensingConfig.mintingFee}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {license?.licenseTerms.map((trait, index) => (
                    <TraitCard key={index} trait={trait} />
                  ))}
                </div>
              </Section>
            ))}
          </div>

          {!showNewLicenseForm ? (
            <button
              onClick={() => setShowNewLicenseForm(true)}
              className="bg-primary text-white px-3 py-2 rounded hover:bg-primary/90 disabled:cursor-not-allowed"
            >
              Add new License
            </button>
          ) : (
            <AttachNewLicenseTermsForm assetId={assetMetadata.id} />
          )}
        </Section>

        <Section title="NFT Metadata">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="space-y-2 w-full">
              <div className="text-sm border-b border-surface py-1">
                <p className="text-muted">Name</p>
                <p>{nftMetadata?.name}</p>
              </div>
              <div className="text-sm py-1">
                <p className="text-muted">Description</p>
                <p>{nftMetadata?.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {nftMetadata?.attributes.map((attr, index) => (
                  <TraitCard key={index} trait={attr} />
                ))}
              </div>
            </div>
            <div className="w-full md:max-w-xs">
              <img
                src={nftMetadata?.image}
                alt="IP Asset Image"
                className="w-full object-cover"
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
