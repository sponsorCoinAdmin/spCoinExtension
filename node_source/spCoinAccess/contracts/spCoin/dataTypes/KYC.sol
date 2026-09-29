// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract KYC {

   mapping(string => string)  public kyc ;
 
   function setUserName(string memory name) external {
      kyc[name] = name;
   }

   function setUserEmail(string memory email) external {
      kyc[email] = email;
   }

   function setUserAddress1(string memory address1) external {
      kyc[address1] = address1;
   }

   function setUserAddress2(string memory address2) external {
      kyc[address2] = address2;
   }

   function setUserZipPostalCode(string memory zipPostalCode) external {
      kyc[zipPostalCode] = zipPostalCode;
   }

   function setUserHomePhone(string memory homePhone) external {
      kyc[homePhone] = homePhone;
   }

   function setUserMobilePhone(string memory mobilePhone) external {
      kyc[mobilePhone] = mobilePhone;
   }
}