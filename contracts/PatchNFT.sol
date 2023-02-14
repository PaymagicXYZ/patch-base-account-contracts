pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./strings.sol";
import "./Base64.sol";

contract PatchNFT is ERC721, ERC721Pausable, Ownable {
    using Counters for Counters.Counter;
    using strings for *;

    event Minted(
        address indexed to,
        string indexed userId,
        uint256 indexed tokenId
    );

    Counters.Counter private _tokenIdCounter;

    constructor(address newOwner) ERC721("Patch: Edition 0", "PATCH") {
        pause();
        transferOwnership(newOwner);
    }

    mapping(uint256 => string) public userIds;

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Pausable) {
        if (from != address(0)) {
            require(!paused(), "ERC721Pausable: token transfer while paused");
        }

        ERC721._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _addUserId(uint256 _id, string calldata _userId) internal {
        userIds[_id] = _userId;
    }

    function mint_(address to, string calldata userId) internal onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _addUserId(tokenId, userId);
        _mint(to, tokenId);
        emit Minted(to, userId, tokenId);
    }

    function mint(address to, string calldata userId) external onlyOwner {
        mint_(to, userId);
    }

    function mintMultiple(address[] calldata to, string[] calldata userId)
        external
        onlyOwner
    {
        uint256 num = to.length;
        require(num == userId.length);
        for (uint8 i; i < num; ++i) {
            mint_(to[i], userId[i]);
        }
    }

    function transfer(address to, uint256 tokenId) external {
        _transfer(msg.sender, to, tokenId);
    }

    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT license
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function split(string storage userId)
        internal
        pure
        returns (string memory, string memory)
    {
        strings.slice memory delim = ":".toSlice();
        strings.slice memory s = userId.toSlice();
        return (s.split(delim).toString(), s.rsplit(delim).toString());
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        (string memory social, string memory name) = split(userIds[tokenId]);
        string[7] memory parts;

        parts[
            0
        ] = '<svg width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg"> <g clip-path="url(#clip0_1706_412)"> <path fill-rule="evenodd" clip-rule="evenodd" d="M862.886 0H120C53.7258 0 0 53.7258 0 120V960C0 1026.27 53.7258 1080 120 1080H960C1026.27 1080 1080 1026.27 1080 960V248.476L862.886 0Z" fill="#07091B"/> <path fill-rule="evenodd" clip-rule="evenodd" d="M862.888 0.00227356L1080 248.477H982.888C916.614 248.477 862.888 194.751 862.888 128.477V0.00227356Z" fill="#1E213B"/> <text fill="white" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="78.28" font-weight="600" letter-spacing="-0.085em"><tspan x="157.082" y="132.055">Patch</tspan></text> <path d="M307.38 64.5558C308.455 63.607 310.017 63.1617 311.349 62.8083C316.809 61.3597 323.397 60.5404 328.889 62.2905C339.84 65.7806 345.198 78.5312 347.744 88.6321C351.202 102.352 352.426 116.435 352.426 130.55C352.426 137.49 359.983 116.502 361.599 109.753C362.367 106.549 363.937 101.831 365.698 99.9368C369.045 95.708 372.156 102.222 374.587 106.28C376.667 109.753 383.914 132.969 386.685 130.226C387.208 129.708 389.158 125.8 389.308 125.497L389.317 125.48C391.134 121.856 393.452 117.008 395.099 113.485C400.659 101.59 405.691 89.3553 412.444 78.061C418.8 67.4311 426.093 57.3685 437.858 52.9059M437.002 93.6115C428.739 94.0659 419.923 95.3677 414.5 102.414C410.937 107.044 409.041 114.703 409.646 120.536C410.074 124.661 411.932 128.512 415.773 130.352C420.325 132.531 425.284 127.873 428.049 124.699C432.585 119.493 436.01 112.906 438.081 106.34C438.563 104.812 440.354 96.0874 439.095 102.888C437.292 112.621 437.725 122.305 438.944 132.056M453.271 57.6027C453.058 82.4427 450.656 107.349 452.494 132.162M466.453 44.6865C466.649 73.7129 462.344 115.726 468.215 131.773M485.545 121.787C493.325 117.448 502.971 112.824 507.766 104.916C509.175 102.592 510.737 98.6672 509.837 95.8553C508.463 91.5607 497.378 92.9133 494.665 93.5103C487.792 95.0223 483.88 99.6288 480.669 105.909C477.42 112.265 476.536 119.305 481.705 124.98C488.982 132.971 503.471 137.151 517.17 119.147M562.247 42.7295C554.426 54.105 548.267 66.3675 542.874 79.0598C537.453 91.8157 532.394 104.863 529.498 118.454C528.981 120.88 526.503 128.232 528.506 130.751C530.703 133.514 538.984 131.289 541.32 130.88C553.235 128.796 564.94 125.418 576.615 122.337M521.084 88.5523C537.347 87.3013 553.707 86.999 570.013 86.999" stroke="#FF7557" stroke-width="9.785" stroke-linecap="round"/> <path fill-rule="evenodd" clip-rule="evenodd" d="M107.194 58.0017C103.297 57.4283 99.3465 58.6388 96.5551 61.331L76.3417 80.8266C73.1931 83.8634 71.9978 88.3241 73.2062 92.5283L80.9637 119.519C82.1721 123.723 85.6005 127.032 89.9575 128.199L117.928 135.694C122.285 136.862 126.909 135.71 130.058 132.673L150.271 113.178C152.728 110.808 153.996 107.571 153.86 104.266L107.194 58.0017Z" fill="#FF7557"/> <g filter="url(#filter0_dd_1706_412)"> <path fill-rule="evenodd" clip-rule="evenodd" d="M107.197 58.0042L153.855 104.26C153.328 104.186 152.835 104.065 152.312 103.925L124.341 96.4305C119.984 95.263 116.556 91.954 115.347 87.7498L107.59 60.7594C107.317 59.8111 107.23 58.9592 107.197 58.0042Z" fill="#F8BAAD"/> </g> <path d="M-164.345 585.759C-158.581 527.157 -143.229 461.584 -93.6023 423.988C-41.335 384.392 44.3749 389.54 102.399 410.296C171.847 435.14 229.418 481.6 303.724 493.21C368.314 503.302 426.837 496.885 487.808 473.939C526.105 459.526 578.893 441.944 603.177 405.732C612.036 392.522 608.326 376.555 592.02 373.91C580.783 372.088 550.273 370.552 542.323 370.107C529.986 369.417 517.655 368.544 505.303 368.205C499.782 368.054 441.498 367.095 434.56 370.741C430.625 372.809 436.91 380.726 441.026 382.405C511.952 411.338 657.248 433.446 712.334 441.357C794.061 453.094 876.065 463.628 958.412 469.629C1553.74 513.01 888.872 450.969 1453.61 469.375" stroke="#FF7557" stroke-width="20" stroke-linecap="round"/> <path d="M20 752C20 729.909 37.9086 712 60 712H1020C1042.09 712 1060 729.909 1060 752V960C1060 1015.23 1015.23 1060 960 1060H120C64.7715 1060 20 1015.23 20 960V752Z" fill="#151728"/> <text fill="white" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="88" font-weight="500" letter-spacing="-0.04em"><tspan x="68" y="936">';
        parts[1] = social;
        parts[
            2
        ] = ':</tspan></text> <text fill="#FF7557" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="88" font-weight="bold" letter-spacing="-0.04em"><tspan x="68" y="1012">';
        parts[3] = name;
        parts[
            4
        ] = '</tspan></text> <text fill="#9D4A38" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="100" font-weight="bold" letter-spacing="-0.04em"><tspan x="68" y="830.364">#';
        parts[5] = toString(tokenId);
        parts[
            6
        ] = '</tspan></text> <text fill="#6C3529" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="60" letter-spacing="-0.04em"><tspan x="758" y="799.818">Edition</tspan></text> <text fill="#9D4A38" xml:space="preserve" style="white-space: pre" font-family="Inter" font-size="60" font-weight="bold" letter-spacing="-0.04em"><tspan x="946" y="799.818">#0</tspan></text> </g> <defs> <filter id="filter0_dd_1706_412" x="98.3785" y="50.2442" width="66.9977" height="63.892" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix"/> <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/> <feOffset dy="1.05817"/> <feGaussianBlur stdDeviation="4.40904"/> <feComposite in2="hardAlpha" operator="out"/> <feColorMatrix type="matrix" values="0 0 0 0 0.258118 0 0 0 0 0.0462694 0 0 0 0 0.000215292 0 0 0 0.35 0"/> <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1706_412"/> <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/> <feOffset dx="7.05446" dy="4.5854"/> <feGaussianBlur stdDeviation="2.23326"/> <feComposite in2="hardAlpha" operator="out"/> <feColorMatrix type="matrix" values="0 0 0 0 0.321344 0 0 0 0 0.0603862 0 0 0 0 0.00365627 0 0 0 0.1 0"/> <feBlend mode="normal" in2="effect1_dropShadow_1706_412" result="effect2_dropShadow_1706_412"/> <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1706_412" result="shape"/> </filter> <clipPath id="clip0_1706_412"> <rect width="1080" height="1080" rx="120" fill="white"/> </clipPath> </defs> </svg>';

        string memory output = string(
            abi.encodePacked(
                parts[0],
                parts[1],
                parts[2],
                parts[3],
                parts[4],
                parts[5],
                parts[6]
            )
        );

        string
            memory description = unicode"Patch Wallets are Ethereum wallets for everyone. So you can gift NFTs and tokens to friends, family, and customers. 🎁  No seed phrases or custodian required. 🙂\\n\\nEdition 1 is for our early adopters. We treasure our early community. 🤗";

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Patch Wallet #',
                        toString(tokenId),
                        '", "description": "',
                        description,
                        '", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '", "attributes": [{"trait_type": "tokenId", "value": "',
                        toString(tokenId),
                        '"}, {"trait_type": "userId", "value": "',
                        userIds[tokenId],
                        '"}]',
                        "}"
                    )
                )
            )
        );

        output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return output;
    }
}
