const { expect , assert } = require("chai");
const { ethers } = require("hardhat");

describe("The whole test started!",async function () {
  let deployer, owner, maker, taker, addr4;
  let WETH9_deployed, v4token_deployed, v4NFT_deployed, FullMigration_deployed, ZeroEx_deployed, 
      ERC721OrdersFeature_deployed, WETH9, v4token, ERC721OrdersFeature, ZeroEx, FullMigration;
  const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    [deployer, owner, maker, taker, addr4] = await ethers.getSigners();
    const WETH9_deploy = await ethers.getContractFactory("WETH");
    WETH9_deployed = await WETH9_deploy.deploy();
    WETH9 = await WETH9_deployed.deployed();

    const v4token_deploy = await ethers.getContractFactory("V4Token");
    v4token_deployed = await v4token_deploy.deploy();
    v4token = await v4token_deployed.deployed();

    const v4NFT_deploy = await ethers.getContractFactory("V4NFT");
    v4NFT_deployed = await v4NFT_deploy.deploy();
    v4NFT = await v4NFT_deployed.deployed();

    const ERC721OrdersFeature_deploy = await ethers.getContractFactory("ERC721OrdersFeature");
    ERC721OrdersFeature_deployed = await ERC721OrdersFeature_deploy.deploy(ZERO_ADDRESS, WETH9.address);
    ERC721OrdersFeature = await ERC721OrdersFeature_deployed.deployed();
  });

  function getERC721Order() {
    const order = {
      direction : 0,    //0 for sell order, 1 for buy order
      maker : maker.address,
      taker : taker.address,
      expiry : Math.floor(Date.now() / 1000 + 1000),
      nonce : Math.floor(Math.random()*1000),
      erc20Token : v4token.address,
      erc20TokenAmount : 90,
      fees : [{           //   This is something like placeholder
        recipient: "0x0148bE2b36E7Ff2F86E2b6c41554379921312902",
        amount: 10,
        feeData: "0x",
      }],
      erc721Token : v4NFT.address,
      erc721TokenId : 0,
      erc721TokenProperties : []
    }
    return order;
  };

  function getPreSignedSignature() {
    const signature = {
      signatureType: 4,
      v: 0,
      r: '0x0000000000000000000000000000000000000000000000000000006d6168616d',
      s: '0x0000000000000000000000000000000000000000000000000000006d6168616d'
    };
    return signature;
  }

  describe("ETH", async function () {
    it("Selling with ETH", async function () {
      const order = getERC721Order();
      order.erc20Token = ETH_TOKEN_ADDRESS;
      order.taker = ZERO_ADDRESS;

      var signature = getPreSignedSignature();

      await v4token_deployed.transfer(taker.address, 1000);

      await v4NFT_deployed.safeMint(maker.address,0);
      await v4NFT_deployed.connect(maker).approve(ERC721OrdersFeature.address, 0);

      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await v4token_deployed.connect(taker).approve(ERC721OrdersFeature.address, 100);

      const options = { value: ethers.utils.parseEther("100") };
      await ERC721OrdersFeature_deployed.connect(taker).buyERC721(order, signature, "0x", options);
    });
  });

  describe("Cancel Order", async function () {
    it("Can cancel order", async function () {

      const order = getERC721Order();

      var result1 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      await ERC721OrdersFeature_deployed.connect(maker).cancelERC721Order(order.nonce);

      var resultOrderState = await ERC721OrdersFeature_deployed.getERC721OrderStatus(order);
      expect(resultOrderState).equal(2);

      var result2 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      assert(result1 != result2, "Something is wrong with cancel order!");
    });

    it("Can cancel order twice", async function () {
      const order = getERC721Order();

      var result1 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      await ERC721OrdersFeature_deployed.connect(maker).cancelERC721Order(order.nonce);

      await ERC721OrdersFeature_deployed.connect(maker).cancelERC721Order(order.nonce);

      var resultOrderState = await ERC721OrdersFeature_deployed.getERC721OrderStatus(order);
      expect(resultOrderState).equal(2);

      var result2 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      assert(result1 != result2, "Something is wrong with canceling order twice!");
    });

    it("Can fill canceled order", async function () {

      const order = getERC721Order();

      var result1 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      await ERC721OrdersFeature_deployed.connect(maker).cancelERC721Order(order.nonce);

      var resultOrderState = await ERC721OrdersFeature_deployed.getERC721OrderStatus(order);
      // expect(resultOrderState).equal(2);

      var result2 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      // assert(result1 != result2, "Something is wrong with cancel order!");

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(maker.address,0);
      await v4NFT_deployed.connect(maker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(taker.address, 1000);
      await v4token_deployed.connect(taker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      await expect(ERC721OrdersFeature_deployed.connect(taker).buyERC721(order, signature, "0x"))
            .to.be.revertedWith("reverted with an unrecognized custom error");
    });

    it("Can order not be canceled by taker(not maker)", async function() {
      const order = getERC721Order();

      // var result1 = await ERC721OrdersFeature_deployed.getERC721OrderStatusBitVector(maker.address, order.nonce >> 8);

      await ERC721OrdersFeature_deployed.connect(taker).cancelERC721Order(order.nonce);

      var resultOrderState = await ERC721OrdersFeature_deployed.getERC721OrderStatus(order);
      expect(resultOrderState).equal(1);
    });
  });

  describe("Selling", async function(){
    it("Selling erc20", async function(){
      const order = getERC721Order();

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(maker.address,0);
      await v4NFT_deployed.connect(maker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(taker.address, 1000);
      await v4token_deployed.connect(taker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      await ERC721OrdersFeature_deployed.connect(taker).buyERC721(order, signature, "0x");

      expect(await v4token_deployed.balanceOf(maker.address)).equal(90);
    });
    it("Fail if not taker try to buy NFT with simple order", async function(){
      const order = getERC721Order();

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(maker.address,0);
      await v4NFT_deployed.connect(maker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(owner.address, 1000);
      await v4token_deployed.connect(owner).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      await expect(ERC721OrdersFeature_deployed.connect(owner).buyERC721(order, signature, "0x"))
            .to.be.revertedWith("reverted with an unrecognized custom error");
    });
    it("Can sell to anyone with spec order", async function(){
      const order = getERC721Order();
      order.taker = ZERO_ADDRESS;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(maker.address,0);
      await v4NFT_deployed.connect(maker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(owner.address, 1000);
      await v4token_deployed.connect(owner).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      await ERC721OrdersFeature_deployed.connect(owner).buyERC721(order, signature, "0x");
      expect(await v4token_deployed.balanceOf(maker.address)).equal(90);
    });
  });

  describe("Buying", async function () {
    it("Buying erc20", async function () {
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x");

      expect(await v4token_deployed.balanceOf(taker.address)).equal(90);
    });
    it("Can not buy twice with same order", async function(){
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x");
      await expect(ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
                        .to.be.revertedWith("VM Exception while processing transaction: reverted with an unrecognized custom error");
    });
    it("can buy twice with different nonce from same maker", async function(){
      const order1 = getERC721Order();
      const order2 = getERC721Order();
      order1.direction = 1; order2.direction = 1;
      order1.erc721TokenId = 0; order2.erc721TokenId = 1;
      order1.nonce = 0; order2.nonce = 0;
      order2.maker = addr4.address;

      var signature1 = getPreSignedSignature();
      var signature2 = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.safeMint(taker.address,1);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 1);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 210);
      await v4token_deployed.transfer(addr4.address, 1000);
      await v4token_deployed.connect(addr4).approve(ERC721OrdersFeature.address, 210);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order1);
      await ERC721OrdersFeature_deployed.connect(addr4).preSignERC721Order(order2);
  
      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order1, signature1, order1.erc721TokenId, false, "0x");
      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order2, signature2, order2.erc721TokenId, false, "0x");
    });
    it("Can not buy with canceled order", async function () {
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await ERC721OrdersFeature_deployed.connect(maker).cancelERC721Order(order.nonce);
  
      await expect(ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
                  .to.be.revertedWith("VM Exception while processing transaction: reverted with an unrecognized custom error");
    });
    it("Can not buy with ETH", async function () {
      const order = getERC721Order();
      order.direction = 1;
      order.erc20Token = ETH_TOKEN_ADDRESS;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await expect(ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
                  .to.be.revertedWith("NFTOrders::_validateBuyOrder/NATIVE_TOKEN_NOT_ALLOWED");
    });
    it("Can not buy with expired order", async function () {
      const order = getERC721Order();
      order.direction = 1;
      order.expiry = Math.floor(Date.now() / 1000 - 1);

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await expect(ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
              .to.be.revertedWith("VM Exception while processing transaction: reverted with an unrecognized custom error");
    });
    it("Can not buy with sell order", async function () {
      const order = getERC721Order();
      order.direction = 0;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await expect(ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
              .to.be.revertedWith("NFTOrders::_validateBuyOrder/WRONG_TRADE_DIRECTION");
    });
    it("Only taker can sell", async function () {
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await expect(ERC721OrdersFeature_deployed.connect(deployer).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
            .to.be.revertedWith("VM Exception while processing transaction: reverted with an unrecognized custom error");
    });
    it("Can buy using ETH", async function () {
      const order = getERC721Order();
      order.direction = 1;
      order.erc20Token = WETH9.address;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      // await v4token_deployed.transfer(maker.address, 1000);
      const options = { value: ethers.utils.parseEther("105") };
      await WETH9.connect(maker).deposit(options);
      await WETH9.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x");
    });
  });

  describe("Fee", async function(){
    it("One fee is working", async function(){
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      order.fees[0].recipient = addr4.address;
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);

      await ERC721OrdersFeature_deployed.setMarketOwner(addr4.address);
      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x");

      expect(await v4token_deployed.balanceOf(addr4.address)).equal(10);
    });
    it("Two fee is working", async function(){
      const order = getERC721Order();
      order.direction = 1;
      order.fees = [
        {
          recipient: ZERO_ADDRESS,
          amount : 5,
          feeData : "0x"
        },
        {
          recipient: owner.address,
          amount : 5,
          feeData : "0x"
        }
      ];

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 1000);
  
      order.fees[0].recipient = addr4.address;
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      var beforeDeployerTokenAmount = await v4token_deployed.balanceOf(deployer.address);
      await ERC721OrdersFeature_deployed.setMarketOwner(addr4.address);
      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x");

      expect(await v4token_deployed.balanceOf(addr4.address)).equal(5);
      expect(await v4token_deployed.balanceOf(owner.address)).equal(5);
    });
    it("Order with no fee occurs error", async function(){
      const order = getERC721Order();
      order.direction = 1;
      order.fees = [];

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      var beforeDeployerTokenAmount = await v4token_deployed.balanceOf(deployer.address);
      await ERC721OrdersFeature_deployed.setMarketOwner(addr4.address);
      await expect(ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x"))
        .to.be.revertedWith("Order must have at least one fee");
    });
  });

  describe("MarketOwner", async function(){
    it("Can get marketOwner", async function(){
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
  
      var result = await ERC721OrdersFeature_deployed.getMarketOwner();

      expect(result).equal("0x0148bE2b36E7Ff2F86E2b6c41554379921312902");
    });
    it("Can set marketOwner", async function(){
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      order.fees[0].recipient = addr4.address;
      await ERC721OrdersFeature_deployed.connect(maker).preSignERC721Order(order);
      
      await ERC721OrdersFeature_deployed.setMarketOwner(addr4.address);

      await ERC721OrdersFeature_deployed.connect(taker).sellERC721(order, signature, order.erc721TokenId, false, "0x");

      expect(await v4token_deployed.balanceOf(addr4.address)).equal(10);
    });
    it("Only owner can set marketOwner", async function(){
      const order = getERC721Order();
      order.direction = 1;

      var signature = getPreSignedSignature();

      await v4NFT_deployed.safeMint(taker.address,0);
      await v4NFT_deployed.connect(taker).approve(ERC721OrdersFeature.address, 0);
      await v4token_deployed.transfer(maker.address, 1000);
      await v4token_deployed.connect(maker).approve(ERC721OrdersFeature.address, 105);
  
      await expect(
        ERC721OrdersFeature_deployed.connect(taker).setMarketOwner(addr4.address)
      ).to.be.revertedWith("Only Owner can call this function");
    });
  });
});
