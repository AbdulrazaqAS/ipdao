// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ICoreMetadataViewModule } from "@storyprotocol/core/interfaces/modules/metadata/ICoreMetadataViewModule.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ISPGNFT } from "@storyprotocol/periphery/interfaces/ISPGNFT.sol";
import { IRegistrationWorkflows } from "@storyprotocol/periphery/interfaces/workflows/IRegistrationWorkflows.sol";
import { IDerivativeWorkflows } from "@storyprotocol/periphery/interfaces/workflows/IDerivativeWorkflows.sol";
import { WorkflowStructs } from "@storyprotocol/periphery/lib/WorkflowStructs.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IIPAccount} from "@storyprotocol/core/interfaces/IIPAccount.sol";
import {IRoyaltyModule} from "@storyprotocol/core/interfaces/modules/royalty/IRoyaltyModule.sol";

contract IPAManager is Ownable, ERC721Holder {
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    ICoreMetadataViewModule public immutable CORE_METADATA_VIEW_MODULE;
    IRegistrationWorkflows public immutable REGISTRATION_WORKFLOWS;
    IDerivativeWorkflows public immutable DERIVATIVE_WORKFLOWS;
    IRoyaltyModule public immutable ROYALTY_MODULE;
    ISPGNFT public immutable SPG_NFT;

    address[] public assets;
    uint256 public daoRevenueTokens;  // Revenue tokens to be given to DAO for each ipa

    event AssetAdded(address indexed assetId);
    event AssetTransferred(address indexed assetId, address collection, address to, uint256 tokenId);
    event TermsAttached(address indexed assetId, uint256 licenseTermsId);
    event NFTReceived(address indexed collection, address from, uint256 tokenId);
    event DerivativeAssetCreated(address indexed childIpId, uint256 childTokenId, address[] parentIpIds, uint256[] licenseTermsIds);
    event LicenseTokensMinted(address indexed licensorIpId, uint256 licenseTermsId, uint256 amount, address receiver);
    event RoyaltyTokensTransferred(address indexed ipId, address[] recipients, uint256[] amounts);
    event Execute(address indexed target, uint256 value, bytes data);
    event DaoRevenueTokensChanged(uint256 _amount);

    constructor(
        address _initialOwner,
        address _ipAssetRegistry,
        address _licensingModule,
        address _pilTemplate,
        address _coreMetadataViewModule,
        address _registrationWorkflows,
        address _derivativeWorkflows,
        address _royaltyModule,
        string memory _spgName,
        string memory _spgSymbol
    ) Ownable(_initialOwner) {
        IP_ASSET_REGISTRY = IIPAssetRegistry(_ipAssetRegistry);
        LICENSING_MODULE = ILicensingModule(_licensingModule);
        PIL_TEMPLATE = IPILicenseTemplate(_pilTemplate);
        CORE_METADATA_VIEW_MODULE = ICoreMetadataViewModule(_coreMetadataViewModule);
        REGISTRATION_WORKFLOWS = IRegistrationWorkflows(_registrationWorkflows);
        DERIVATIVE_WORKFLOWS = IDerivativeWorkflows(_derivativeWorkflows);
        ROYALTY_MODULE = IRoyaltyModule(_royaltyModule);

        SPG_NFT = ISPGNFT(
            REGISTRATION_WORKFLOWS.createCollection(
                ISPGNFT.InitParams({
                    name: _spgName,
                    symbol: _spgSymbol,
                    baseURI: "",
                    contractURI: "",
                    maxSupply: 10000,
                    mintFee: 0,
                    mintFeeToken: address(0),
                    mintFeeRecipient: address(this),
                    owner: address(this),
                    mintOpen: true,
                    isPublicMinting: false
                })
            )
        );
    }

    // For adding already registered assets
    function addAsset(address assetId) public onlyOwner {
        require(assetId != address(0), "Invalid asset ID");
        require(!hasAsset(assetId), "Asset already exists");
        require(CORE_METADATA_VIEW_MODULE.getOwner(assetId) == address(this), "Contract must own the asset");

        assets.push(assetId);
        emit AssetAdded(assetId);
    }

    function _removeAsset(address assetId) internal {
        require(hasAsset(assetId), "Asset does not exist");

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == assetId) {
                _removeAssetAtIndex(i);
                break;
            }
        }
    }

    function _removeAssetAtIndex(uint256 index) internal {
        require(index < assets.length, "Index out of bounds");
        assets[index] = assets[assets.length - 1];
        assets.pop();
    }

    function createAssetFromNFT(
        address tokenCollection,
        uint256 tokenId,
        uint256 licenseTermsId
    ) external onlyOwner returns (address ipId) {
        // require(IERC721(tokenCollection).ownerOf(tokenId) == address(this), "Contract must own the NFT");
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(tokenCollection), tokenId);  // Checks for ownership
        addAsset(ipId);
        attachLicenseTerms(ipId, licenseTermsId);
    }

    // Mint an NFT and register it in the same call via the Story Protocol Gateway.
    function createAsset(
        string memory _ipMetadataURI,
        string memory _ipMetadataHash,
        string memory _nftMetadataURI,
        string memory _nftMetadataHash,
        address[] memory creators,
        uint256[] memory royaltyShares
    ) external onlyOwner returns (address ipId, uint256 tokenId){
        (ipId, tokenId) = REGISTRATION_WORKFLOWS.mintAndRegisterIp(
            address(SPG_NFT),
            address(this),  // receiver
            WorkflowStructs.IPMetadata({
                ipMetadataURI: _ipMetadataURI,
                ipMetadataHash: bytes32(bytes(_ipMetadataHash)),
                nftMetadataURI: _nftMetadataURI,
                nftMetadataHash: bytes32(bytes(_nftMetadataHash))
            }),
            true  // allow duplicates with same metadata
        );

        addAsset(ipId);
        transferIPARoyaltyTokens(
            ipId,
            creators,
            royaltyShares
        );
    }

    function transferAsset(address assetId, address collection, address to, uint256 tokenId) external onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");
        require(to != address(0), "Invalid recipient address");

        IERC721(collection).safeTransferFrom(address(this), to, tokenId);

        // Remove the asset from the manager
        _removeAsset(assetId);
        emit AssetTransferred(assetId, collection, to, tokenId);
    }

    function attachLicenseTerms(address assetId, uint256 licenseTermsId) public onlyOwner {
        require(hasAsset(assetId), "Asset does not exist");
        LICENSING_MODULE.attachLicenseTerms(assetId, address(PIL_TEMPLATE), licenseTermsId);
        emit TermsAttached(assetId, licenseTermsId);
    }

    // For owner to mint custom licnese tokens only. Not for public use.
    function mintLicenseTokens(
        address licensorIpId,
        uint256 licenseTermsId,
        uint256 amount,
        address receiver
    ) external onlyOwner returns (uint256 startLicenseTokenId) {
        require(hasAsset(licensorIpId), "Asset does not exist");

        startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens(
            licensorIpId,
            address(PIL_TEMPLATE),
            licenseTermsId,
            amount,
            receiver,
            "",
            0,
            100 // Won't hurt because this is only for owner
        );

        emit LicenseTokensMinted(licensorIpId, licenseTermsId, amount, receiver);
    }

    // For owner to create derivatives for own or other assets.
    function mintAndRegisterAndMakeDerivative(
        address[] calldata _parentIpIds,
        uint256[] calldata _licenseTermsIds,
        string memory _ipMetadataURI,
        string memory _ipMetadataHash,
        string memory _nftMetadataURI,
        string memory _nftMetadataHash
    ) external onlyOwner {
        (address childIpId, uint256 childTokenId) = DERIVATIVE_WORKFLOWS.mintAndRegisterIpAndMakeDerivative(
            address(SPG_NFT),
            WorkflowStructs.MakeDerivative({
                parentIpIds: _parentIpIds,
                licenseTemplate: address(PIL_TEMPLATE),
                licenseTermsIds: _licenseTermsIds,
                royaltyContext: "",
                maxMintingFee: 0,
                maxRts: 0,
                maxRevenueShare: 30
            }),
            WorkflowStructs.IPMetadata({
                ipMetadataURI: _ipMetadataURI,
                ipMetadataHash: bytes32(bytes(_ipMetadataHash)),
                nftMetadataURI: _nftMetadataURI,
                nftMetadataHash: bytes32(bytes(_nftMetadataHash))
            }),
            address(this),
            false  // allow duplicates
        );

        addAsset(childIpId);

        emit DerivativeAssetCreated(childIpId, childTokenId, _parentIpIds, _licenseTermsIds);
    }

    // For owner to transfer royalty tokens from the royalty vault to recipients.
    function transferIPARoyaltyTokens(
        address ipId,
        address[] memory recipients,
        uint256[] memory amounts
    ) public onlyOwner {
        require(hasAsset(ipId), "Asset does not exist");
        address royaltyVaultAddress = ROYALTY_MODULE.ipRoyaltyVaults(ipId);
        
        bytes memory tranferData;
        for (uint256 i = 0; i < recipients.length; i++) {
            // TODO: Make sure amounts sums to max royalty tokens and DAO is among recipients
            if (recipients[i] == address(this)) require(amounts[i] == daoRevenueTokens, "Invalid tokens amount for DAO");

            // Encode the transfer call data
            tranferData = abi.encodeWithSelector(
                IERC20.transfer.selector,
                recipients[i],
                amounts[i]
            );

            IIPAccount(payable(ipId)).execute(
                royaltyVaultAddress,
                0,  // value: 0 ETH
                tranferData
            );
        }

        emit RoyaltyTokensTransferred(ipId, recipients, amounts);
    }

    // For owner to execute arbitrary calls.
    // Like giving allowance to QuizManager, transferring tokens, etc.
    function execute (
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner {
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "Execution failed");

        emit Execute(target, value, data);
    }

    function setRevenueTokenPercentage(uint256 _amount) external onlyOwner {
        daoRevenueTokens = _amount;
        emit DaoRevenueTokensChanged(_amount);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        // Ensure the contract is receiving an NFT
        require(IERC721(msg.sender).ownerOf(tokenId) == address(this), "NFT not owned by this contract");
        emit NFTReceived(msg.sender, from, tokenId);

        return this.onERC721Received.selector;
    }

    function getAssets() external view returns (address[] memory) {
        return assets;
    }

    function hasAsset(address assetId) public view returns (bool) {
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == assetId) {
                return true;
            }
        }
        return false;
    }

    function getAssetCount() external view returns (uint256) {
        return assets.length;
    }

    function getRoyaltyVaultAddress(
        address ipId
    ) external view returns (address) {
        return ROYALTY_MODULE.ipRoyaltyVaults(ipId);
    }
}
