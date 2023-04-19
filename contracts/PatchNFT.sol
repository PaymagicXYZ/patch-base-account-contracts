pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./strings.sol";
import "./Base64.sol";

contract PatchNFT is ERC721, ERC721Pausable, Ownable {
    using strings for *;

    event Minted(
        address indexed to,
        string indexed userId,
        uint256 indexed tokenId
    );

    uint256 private count;

    constructor(address newOwner) ERC721("Patch: Edition 0", "PATCH") {
        pause();
        transferOwnership(newOwner);
    }

    mapping(uint256 => string) public userIds;

    function totalSupply() public view returns (uint256) {
        return count;
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
        uint256 tokenId = count;
        count++;
        _addUserId(tokenId, userId);
        _mint(to, tokenId);
        emit Minted(to, userId, tokenId);
    }

    function mint(address to, string calldata userId) external onlyOwner {
        mint_(to, userId);
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
        ] = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" fill="none"><style>.B{font-family:Arial}.C{fill-rule:evenodd}.D{font-weight:700}.E{stroke-linecap:round}</style><g clip-path="url(#B)"><g class="C"><path d="M862.886 0H120C53.726 0 0 53.726 0 120v840c0 66.27 53.726 120 120 120h840c66.27 0 120-53.73 120-120V248.476L862.886 0z" fill="#07091b"/><path d="M862.889.003 1080 248.477h-97.111c-66.274 0-120-53.726-120-120V.003z" fill="#1e213b"/></g><path d="M162.697 132.449v-56.93h21.349c4.374 0 8.043.815 11.008 2.446 2.984 1.631 5.236 3.873 6.755 6.727 1.539 2.835 2.308 6.06 2.308 9.674 0 3.651-.769 6.894-2.308 9.729s-3.808 5.069-6.81 6.7c-3.002 1.612-6.7 2.418-11.092 2.418h-14.149v-8.478h12.759c2.558 0 4.652-.445 6.283-1.335s2.835-2.112 3.614-3.669c.797-1.557 1.195-3.345 1.195-5.365s-.398-3.799-1.195-5.337c-.779-1.538-1.993-2.733-3.642-3.586-1.631-.871-3.734-1.306-6.31-1.306h-9.452v48.313h-10.313zm54.802.862c-2.706 0-5.143-.482-7.311-1.445-2.15-.983-3.855-2.428-5.115-4.337-1.242-1.909-1.863-4.262-1.863-7.061 0-2.409.445-4.401 1.335-5.976a10.33 10.33 0 0 1 3.641-3.781c1.538-.945 3.271-1.658 5.198-2.14a42.136 42.136 0 0 1 6.033-1.084l6.087-.695c1.557-.223 2.688-.556 3.392-1.001.723-.463 1.084-1.177 1.084-2.141v-.166c0-2.094-.621-3.716-1.863-4.865s-3.03-1.724-5.365-1.724c-2.464 0-4.42.538-5.865 1.612-1.427 1.075-2.391 2.344-2.891 3.808l-9.396-1.334c.741-2.595 1.965-4.763 3.67-6.505 1.704-1.761 3.789-3.076 6.254-3.947 2.465-.889 5.189-1.334 8.173-1.334 2.057 0 4.105.241 6.143.723a17.3 17.3 0 0 1 5.588 2.391c1.686 1.093 3.039 2.585 4.058 4.476 1.038 1.89 1.557 4.253 1.557 7.089v28.576h-9.674v-5.865h-.333c-.612 1.186-1.474 2.298-2.586 3.336-1.093 1.019-2.474 1.844-4.142 2.474-1.649.611-3.586.917-5.809.917zm2.613-7.394c2.02 0 3.771-.399 5.253-1.195 1.483-.816 2.623-1.891 3.42-3.225a8.216 8.216 0 0 0 1.223-4.364v-5.032c-.315.26-.853.5-1.613.723-.741.222-1.575.417-2.501.584l-2.752.444-2.363.334c-1.501.204-2.845.537-4.031 1.001s-2.122 1.112-2.808 1.946c-.685.815-1.028 1.871-1.028 3.169 0 1.853.676 3.252 2.029 4.197s3.076 1.418 5.171 1.418zm44.717-36.166v7.784h-24.546v-7.784h24.546zm-18.486-10.23h10.063v40.085c0 1.353.204 2.39.612 3.113.426.704.982 1.186 1.668 1.446s1.445.389 2.279.389a9.91 9.91 0 0 0 1.724-.139l1.223-.25 1.695 7.866c-.537.186-1.306.39-2.307.612-.982.222-2.187.352-3.614.389-2.52.074-4.79-.306-6.81-1.14-2.02-.852-3.623-2.168-4.809-3.947-1.168-1.779-1.742-4.003-1.724-6.671V79.522zm38.414 53.762c-4.262 0-7.922-.935-10.98-2.807-3.039-1.872-5.384-4.457-7.033-7.756-1.631-3.317-2.446-7.135-2.446-11.453 0-4.336.834-8.163 2.502-11.48 1.668-3.336 4.021-5.93 7.06-7.784 3.058-1.872 6.672-2.808 10.842-2.808 3.465 0 6.532.639 9.201 1.918 2.687 1.26 4.828 3.049 6.421 5.365 1.594 2.298 2.502 4.986 2.725 8.062h-9.619c-.389-2.057-1.315-3.771-2.779-5.143-1.446-1.39-3.383-2.085-5.81-2.085-2.057 0-3.864.556-5.421 1.668-1.557 1.094-2.77 2.669-3.641 4.726-.853 2.057-1.279 4.522-1.279 7.394 0 2.91.426 5.412 1.279 7.506.852 2.076 2.047 3.679 3.585 4.809 1.557 1.112 3.383 1.668 5.477 1.668 1.482 0 2.807-.278 3.975-.834 1.186-.575 2.177-1.399 2.974-2.474s1.344-2.381 1.64-3.92h9.619c-.241 3.021-1.131 5.699-2.669 8.034-1.538 2.317-3.632 4.133-6.282 5.449-2.651 1.297-5.764 1.945-9.341 1.945zm29.964-25.852v25.018h-10.063v-56.93h9.84v21.488h.501c1.001-2.409 2.548-4.309 4.642-5.699 2.113-1.409 4.8-2.113 8.062-2.113 2.965 0 5.55.621 7.755 1.862s3.911 3.058 5.115 5.448c1.223 2.391 1.835 5.31 1.835 8.757v27.186h-10.063v-25.63c0-2.872-.741-5.105-2.224-6.699-1.464-1.612-3.521-2.418-6.171-2.418-1.779 0-3.373.389-4.781 1.168-1.39.76-2.484 1.863-3.281 3.308-.778 1.446-1.167 3.197-1.167 5.254z" fill="#fff"/><path d="M307.38 64.556c1.075-.949 2.637-1.394 3.969-1.748 5.461-1.449 12.048-2.268 17.54-.518 10.952 3.49 16.31 16.241 18.856 26.342 3.457 13.72 4.681 27.803 4.681 41.918 0 6.94 7.557-14.048 9.173-20.797.768-3.204 2.338-7.922 4.099-9.816 3.347-4.229 6.459 2.285 8.889 6.343 2.08 3.473 9.328 26.689 12.098 23.946.524-.518 2.473-4.426 2.624-4.729l.008-.017c1.817-3.624 4.135-8.472 5.782-11.995 5.561-11.895 10.592-24.13 17.345-35.424 6.356-10.63 13.649-20.693 25.414-25.155m-.856 40.706c-8.262.454-17.078 1.756-22.501 8.802-3.564 4.63-5.459 12.289-4.854 18.122.427 4.125 2.285 7.976 6.127 9.816 4.551 2.179 9.51-2.479 12.275-5.653 4.537-5.206 7.961-11.793 10.032-18.359.482-1.528 2.273-10.253 1.014-3.452-1.803 9.733-1.37 19.417-.151 29.168m14.327-74.453c-.213 24.84-2.614 49.746-.776 74.559m13.959-87.476c.195 29.026-4.11 71.04 1.761 87.087m17.33-9.986c7.78-4.339 17.426-8.963 22.221-16.871 1.409-2.324 2.971-6.249 2.071-9.061-1.374-4.295-12.459-2.942-15.172-2.345-6.873 1.512-10.785 6.118-13.995 12.399-3.25 6.356-4.133 13.396 1.035 19.071 7.278 7.991 21.766 12.171 35.465-5.833m45.077-76.417c-7.82 11.375-13.98 23.638-19.373 36.33-5.42 12.756-10.48 25.803-13.376 39.394-.517 2.426-2.995 9.778-.992 12.297 2.197 2.763 10.479.538 12.815.129 11.915-2.084 23.619-5.462 35.294-8.543m-55.531-33.785c16.263-1.251 32.623-1.553 48.93-1.553" stroke="#ff7557" stroke-width="9.785" class="E"/><path d="M107.194 58.002c-3.897-.573-7.847.637-10.639 3.329L76.342 80.827a11.69 11.69 0 0 0-3.136 11.702l7.758 26.991c1.208 4.204 4.637 7.513 8.994 8.68l27.971 7.495c4.357 1.168 8.981.016 12.13-3.021l20.213-19.495a11.686 11.686 0 0 0 3.589-8.912l-46.666-46.264z" fill="#ff7557" class="C"/><g filter="url(#A)" class="C"><path d="m107.196 58.004 46.659 46.256a12.688 12.688 0 0 1-1.543-.335l-27.971-7.495c-4.357-1.167-7.785-4.477-8.994-8.681l-7.757-26.99c-.273-.948-.361-1.8-.394-2.755z" fill="#f8baad"/></g><path d="M-164.346 596.434c5.764-58.602 21.116-124.175 70.743-161.771 52.267-39.596 137.977-34.448 196.001-13.692 69.449 24.844 127.02 71.304 201.325 82.914 64.59 10.092 123.114 3.675 184.084-19.271 38.298-14.413 91.086-31.995 115.369-68.207 8.859-13.21 5.149-29.177-11.157-31.821-11.237-1.823-41.747-3.359-49.697-3.804l-37.02-1.902c-5.52-.151-63.804-1.11-70.742 2.536-3.935 2.068 2.349 9.985 6.465 11.664 70.926 28.933 216.222 51.041 271.308 58.952 81.727 11.737 163.731 22.271 246.079 28.272 595.328 43.381-69.541-18.66 495.198-.254" stroke="#ff7557" stroke-width="20" class="E"/><path d="M20 760c0-22.091 17.909-40 40-40h960c22.09 0 40 17.909 40 40v200c0 55.23-44.77 100-100 100H120c-55.228 0-100-44.77-100-100V760z" fill="#151728"/><text fill="#fff" xml:space="preserve" style="white-space:pre" font-size="68" letter-spacing="-.04em" class="B"><tspan x="72" y="953.574">';
        parts[1] = social;
        parts[
            2
        ] = ':</tspan></text><text fill="#ff7557" xml:space="preserve" style="white-space:pre" font-size="68" letter-spacing="-.04em" class="B D"><tspan x="72" y="1009.57">';
        parts[3] = name;
        parts[
            4
        ] = '</tspan></text><text fill="#9d4a38" xml:space="preserve" style="white-space:pre" font-size="100" letter-spacing="-.04em" class="B D"><tspan x="68" y="840.668">#';
        parts[5] = toString(tokenId);
        parts[
            6
        ] = '</tspan></text><text fill="#6c3529" xml:space="preserve" style="white-space:pre" font-size="60" letter-spacing="-.04em" class="B"><tspan x="768" y="806.801">Edition</tspan></text><text fill="#9d4a38" xml:space="preserve" style="white-space:pre" font-size="60" letter-spacing=".085em" class="B D"><tspan x="946" y="806.801">#0</tspan></text></g><defs><clipPath id="B"><rect width="1080" height="1080" rx="120" fill="#fff"/></clipPath><filter id="A" x="98.378" y="50.244" width="66.997" height="63.892" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="A"/><feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="B"/><feOffset dy="1.058"/><feGaussianBlur stdDeviation="4.409"/><feComposite in2="B" operator="out"/><feColorMatrix values="0 0 0 0 0.258118 0 0 0 0 0.0462694 0 0 0 0 0.000215292 0 0 0 0.35 0"/><feBlend in2="A" result="C"/><feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="B"/><feOffset dx="7.054" dy="4.585"/><feGaussianBlur stdDeviation="2.233"/><feComposite in2="B" operator="out"/><feColorMatrix values="0 0 0 0 0.321344 0 0 0 0 0.0603862 0 0 0 0 0.00365627 0 0 0 0.1 0"/><feBlend in2="C"/><feBlend in="SourceGraphic"/></filter></defs></svg>';

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
            memory description = unicode"Patch Wallets are Ethereum wallets for everyone. So you can gift NFTs and tokens to friends, family, and customers. 🎁  No seed phrases or custodian required. 🙂\\n\\nEdition 0 is for our early adopters. We treasure our early community. 🤗";

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
