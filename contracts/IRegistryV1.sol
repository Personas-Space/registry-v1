// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

/// @title Personas Registry V1 Interface

interface IRegistryV1 {
  /////////
  // events
  /////////

  event AdminAdded(address _acc);
  event AdminRemoved(address _acc);
  event RegistrarUpdated(address _registrar);
  event FeeUpdated(uint256 _fee);
  event UriUpdated(string _uri);
  event NetworkUpdated(uint256 _network);
  event FeesWithdrawn(address _by, address _to, uint256 _balance);
  event NameRegistered(string _name, address _user, uint256 _count);

  ////////////////
  // admin actions
  ////////////////

  function addAdmin(address _acc) external;

  function removeAdmin(address _acc) external;

  function updateRegistrar(address _registrar) external;

  function updateFee(uint256 _fee) external;

  function updateUri(string memory _uri) external;

  function updateNetwork(uint256 _network) external;

  function pause() external;

  function unpause() external;

  function withdrawFees(address _to) external;

  ////////////////////
  // registrar actions
  ////////////////////

  function registerName(
    string memory _name,
    address _user,
    bytes calldata _signature
  ) external payable;

  ///////////////
  // public views
  ///////////////

  // admins

  function isAdmin(address _acc) external view returns (bool);

  function adminCount() external view returns (uint256);

  function getAdmin(uint256 _id) external view returns (address);
}
