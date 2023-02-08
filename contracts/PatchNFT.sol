pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Base64.sol";

contract PatchNFT is ERC721, ERC721Pausable, Ownable {
    using Counters for Counters.Counter;

    event Minted(string indexed userId);

    Counters.Counter private _tokenIdCounter;

    constructor(address newOwner) ERC721("Patch: Edition 1", "PATCH") {
        pause();
        transferOwnership(newOwner);
    }

    mapping(uint256 => string) public userIds;

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
        emit Minted(userId);
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

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        string[5] memory parts;

        parts[
            0
        ] = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="384" height="384" viewBox="0 0 500 800" preserveAspectRatio="xMidYMid meet"><linearGradient id="g857" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="0%" y2="100%"> <stop stop-color="#90FF4F" offset="0"/><stop stop-color="#E3A820" offset="1"/> </linearGradient> <rect x="-150" y="0" width="1000" height="812" fill="url(#g857)" /> <path style="fill:#B28D5B;" d="M482.358,444.632c0,23.812-19.304,43.116-43.116,43.116H51.2c-23.812,0-43.116-19.304-43.116-43.116 v-302.15h474.274V444.632z"/> <path style="fill:#99774F;" d="M8.084,142.482h75.453v345.266H51.2c-23.812,0-43.116-19.322-43.116-43.158V142.482z M482.358,293.536H320.674c-23.812,0-43.116,19.304-43.116,43.116v0.085c0,23.812,19.304,43.116,43.116,43.116h161.684 c11.906,0,21.558-9.651,21.558-21.558v-43.201C503.916,303.188,494.264,293.536,482.358,293.536z"/> <path style="fill:#FFE77C;" d="M342.232,336.694c0,8.938-7.239,16.185-16.168,16.185c-8.929,0-16.168-7.246-16.168-16.185 c0-8.938,7.239-16.185,16.168-16.185C334.992,320.509,342.232,327.756,342.232,336.694z"/> <path style="fill:#CEA05D;" d="M450.021,196.43H61.979c-29.765,0-53.895-24.13-53.895-53.895v-0.107 c0-29.765,24.13-53.895,53.895-53.895h388.042c17.86,0,32.337,14.477,32.337,32.337v43.222 C482.358,181.952,467.881,196.43,450.021,196.43z"/> <path style="fill:#84D88B;" d="M305.139,40.377l37.092,102.104H94.316L270.124,28.612C282.861,20.362,299.954,26.106,305.139,40.377 z"/> <path style="fill:#91F18B;" d="M392.37,39.895l37.268,102.588H180.547l176.64-114.409C369.985,19.783,387.16,25.554,392.37,39.895z"/> <path d="M490.442,286.341V120.395c0-22.288-18.132-40.421-40.421-40.421h-35.49L398.97,37.087 c-3.319-9.147-10.507-16.167-19.721-19.259c-9.202-3.088-19.15-1.829-27.293,3.454l-36.39,23.597l-2.827-7.792 c-3.319-9.147-10.507-16.167-19.721-19.259c-9.202-3.088-19.149-1.829-27.293,3.454l-19.065,12.362 c-3.746,2.428-4.814,7.435-2.384,11.181c2.431,3.747,7.435,4.813,11.182,2.384l19.065-12.362c3.983-2.585,8.85-3.201,13.353-1.691 c4.514,1.514,8.037,4.957,9.665,9.446l4.102,11.306l-123.487,80.078H121.64l106.421-69.01c3.746-2.43,4.813-7.435,2.384-11.181 c-2.431-3.747-7.435-4.814-11.182-2.384l-44.148,28.631c-0.338-0.044-0.684-0.066-1.035-0.066H61.979 C27.803,79.975,0,107.777,0,141.952v302.68c0,28.232,22.969,51.2,51.2,51.2h388.042c28.231,0,51.2-22.968,51.2-51.199v-32.876 c0-4.465-3.618-8.084-8.084-8.084s-8.084,3.62-8.084,8.084v32.876c0,19.316-15.715,35.032-35.032,35.032H91.621V239.292 c0-4.465-3.618-8.084-8.084-8.084c-4.466,0-8.084,3.62-8.084,8.084v240.372H51.2c-19.317,0-35.032-15.715-35.032-35.032v-260.74 c11.344,12.451,27.68,20.274,45.811,20.274h388.042c9.092,0,17.493-3.018,24.253-8.103v89.157h-153.6 c-28.231,0-51.2,22.968-51.2,51.199v0.189c0,28.231,22.969,51.199,51.2,51.199h161.684c16.344,0,29.642-13.297,29.642-29.642 v-43.303C512,301.319,502.87,289.868,490.442,286.341z M450.021,96.142c13.372,0,24.253,10.879,24.253,24.253v13.591H434.13 l-13.731-37.844H450.021z M450.021,187.998H61.979c-25.26,0-45.811-20.55-45.811-45.809v-0.236c0-25.259,20.55-45.809,45.811-45.809 h88.304l-58.359,37.844H72.758c-4.466,0-8.084,3.62-8.084,8.084c0,4.465,3.618,8.084,8.084,8.084H94.2 c0.082,0.001,0.164,0.001,0.247,0h85.985c0.082,0.001,0.164,0.001,0.247,0h161.553c4.466,0,8.084-3.62,8.084-8.084 c0-4.465-3.618-8.084-8.084-8.084h-134.36l152.882-99.138c3.983-2.585,8.848-3.201,13.353-1.691 c4.514,1.514,8.037,4.957,9.665,9.446l33.158,91.384H374.57c-4.466,0-8.084,3.62-8.084,8.084c0,4.465,3.618,8.084,8.084,8.084 h53.707c0.126,0.003,0.251,0.003,0.376,0h45.621v13.591C474.274,177.119,463.393,187.998,450.021,187.998z M495.832,358.166 c0,7.429-6.044,13.474-13.474,13.474H320.674c-19.317,0-35.032-15.715-35.032-35.03v-0.189c0-19.316,15.715-35.032,35.032-35.032 h161.587c0.056,0.001,0.115,0.001,0.174,0c7.393,0.042,13.397,6.07,13.397,13.474V358.166z M326.063,312.227 c-13.372,0-24.253,10.895-24.253,24.287c0,13.392,10.88,24.287,24.253,24.287s24.253-10.894,24.253-24.287 C350.316,323.121,339.436,312.227,326.063,312.227z M326.063,344.634c-4.458,0-8.084-3.642-8.084-8.12s3.626-8.12,8.084-8.12 s8.084,3.642,8.084,8.12S330.521,344.634,326.063,344.634z"/> <text  x="50%" y="80%" font-size="38" text-anchor="middle"  font-family="monospace" font-weight="bold">';
        parts[1] = userIds[tokenId];
        parts[
            2
        ] = '</text><text  x="50%" y="87%" font-size="38" text-anchor="end" font-family="monospace" font-weight="bold">';
        parts[3] = toString(tokenId);
        parts[4] = "</text></svg>";

        string memory output = string(
            abi.encodePacked(parts[0], parts[1], parts[2], parts[3], parts[4])
        );

        string
            memory description = unicode"Patch Wallets are Ethereum wallets for everyone. So you can gift NFTs and tokens to friends, family, and customers. 🎁  No seed phrases or custodian required. 🙂\\n\\nEdition 1 is for our early adopters. We treasure our early community.🤗";

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
                        '", "attributes": [{"trait_type": "tokenId", "value": ',
                        toString(tokenId),
                        '}, {"trait_type": "userId", "value": "',
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
