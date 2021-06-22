// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import "./IRegistryV1.sol";

/// @title Personas Registry V1 Contract

contract RegistryV1 is IRegistryV1, Context, Pausable {
  ////////////
  // libraries
  ////////////

  using EnumerableSet for EnumerableSet.AddressSet;

  //////////
  // storage
  //////////

  struct Space {
    uint256 key;
    address user;
    uint256 created;
  }

  EnumerableSet.AddressSet internal admins;

  mapping(address => string) public name;
  mapping(string => Space) public persona;
  mapping(uint256 => string) public record;

  uint256 public count;

  uint256 public network;
  string public uri;

  uint256 public version = 1;

  uint256 public fee;
  address public registrar;

  //////////////
  // constructor
  //////////////

  constructor(
    uint256 _network,
    string memory _uri,
    uint256 _fee // solhint-disable-next-line func-visibility
  ) {
    admins.add(_msgSender());

    registrar = _msgSender();

    fee = _fee;
    network = _network;
    uri = _uri;
  }

  /////////
  // events
  /////////

  ////////////
  // modifiers
  ////////////

  modifier onlyAdmin() {
    require(isAdmin(_msgSender()), "Only admin");
    _;
  }

  ////////////////
  // admin actions
  ////////////////

  function addAdmin(address _acc) public override onlyAdmin {
    admins.add(_acc);
    emit AdminAdded(_acc);
  }

  function removeAdmin(address _acc) public override onlyAdmin {
    require(adminCount() > 1, "Last admin");

    admins.remove(_acc);
    emit AdminRemoved(_acc);
  }

  function updateRegistrar(address _registrar) public override onlyAdmin {
    registrar = _registrar;
    emit RegistrarUpdated(_registrar);
  }

  function updateFee(uint256 _fee) public override onlyAdmin {
    fee = _fee;
    emit FeeUpdated(_fee);
  }

  function updateUri(string memory _uri) public override onlyAdmin {
    uri = _uri;
    emit UriUpdated(_uri);
  }

  function updateNetwork(uint256 _network) public override onlyAdmin {
    network = _network;
    emit NetworkUpdated(_network);
  }

  function pause() public override whenNotPaused onlyAdmin {
    _pause();
  }

  function unpause() public override whenPaused onlyAdmin {
    _unpause();
  }

  function withdrawFees(address _to) public override onlyAdmin {
    uint256 _balance = address(this).balance;
    payable(_to).transfer(_balance);
    emit FeesWithdrawn(_msgSender(), _to, _balance);
  }

  ////////////////////
  // registrar actions
  ////////////////////

  function registerName(
    string memory _name,
    address _user,
    bytes calldata _signature
  ) public payable override whenNotPaused {
    require(msg.value >= fee, "Invalid fee");
    require(persona[_name].created == 0, "Name already claimed");
    require(bytes(name[_user]).length == 0, "Claimant already registered");

    if (_msgSender() != registrar) {
      bytes32 hash = keccak256(abi.encodePacked(_name, _user));
      bytes32 prefixedHash = ECDSA.toEthSignedMessageHash(hash);
      require(
        ECDSA.recover(prefixedHash, _signature) == registrar,
        "Invalid signer"
      );
    }

    count++;

    name[_user] = _name;

    persona[_name] = Space({key: count, user: _user, created: block.timestamp});

    record[count] = _name;

    emit NameRegistered(_name, _user, count);
  }

  ///////////////
  // public views
  ///////////////

  // admins

  function isAdmin(address _acc) public view override returns (bool) {
    return admins.contains(_acc);
  }

  function adminCount() public view override returns (uint256) {
    return admins.length();
  }

  function getAdmin(uint256 _id) public view override returns (address) {
    return admins.at(_id);
  }

  // meta

  // solhint-disable-next-line
  fallback() external payable {}

  receive() external payable {}
}
