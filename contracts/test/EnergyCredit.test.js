const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyCredit Token", function () {
    let energyCredit;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const EnergyCredit = await ethers.getContractFactory("EnergyCredit");
        energyCredit = await EnergyCredit.deploy(1000); // 1000 tokens initial supply
        await energyCredit.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await energyCredit.owner()).to.equal(owner.address);
        });

        it("Should assign the initial supply to the owner", async function () {
            const ownerBalance = await energyCredit.balanceOf(owner.address);
            expect(await energyCredit.totalSupply()).to.equal(ownerBalance);
        });

        it("Should have correct name and symbol", async function () {
            expect(await energyCredit.name()).to.equal("EnergyCredit");
            expect(await energyCredit.symbol()).to.equal("ENGC");
        });

        it("Should have 18 decimals", async function () {
            expect(await energyCredit.decimals()).to.equal(18);
        });
    });

    describe("Minting", function () {
        it("Should allow owner to mint tokens", async function () {
            const mintAmount = 100;
            await energyCredit.mint(addr1.address, mintAmount);

            const balance = await energyCredit.balanceOf(addr1.address);
            expect(balance).to.equal(ethers.parseEther(mintAmount.toString()));
        });

        it("Should emit TokensMinted event when minting", async function () {
            const mintAmount = 50;
            await expect(energyCredit.mint(addr1.address, mintAmount))
                .to.emit(energyCredit, "TokensMinted");
        });

        it("Should not allow non-owner to mint tokens", async function () {
            await expect(
                energyCredit.connect(addr1).mint(addr2.address, 100)
            ).to.be.reverted;
        });

        it("Should not mint to zero address", async function () {
            await expect(
                energyCredit.mint(ethers.ZeroAddress, 100)
            ).to.be.revertedWith("Cannot mint to zero address");
        });

        it("Should mint for demo with reason", async function () {
            await energyCredit.mintForDemo(addr1.address, 50, "Registration bonus");
            const balance = await energyCredit.balanceOf(addr1.address);
            expect(balance).to.equal(ethers.parseEther("50"));
        });
    });

    describe("Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            // Transfer 50 tokens from owner to addr1
            await energyCredit.transfer(addr1.address, ethers.parseEther("50"));
            expect(await energyCredit.balanceOf(addr1.address)).to.equal(
                ethers.parseEther("50")
            );

            // Transfer 25 tokens from addr1 to addr2
            await energyCredit.connect(addr1).transfer(addr2.address, ethers.parseEther("25"));
            expect(await energyCredit.balanceOf(addr2.address)).to.equal(
                ethers.parseEther("25")
            );
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await energyCredit.balanceOf(owner.address);

            await expect(
                energyCredit.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
            ).to.be.reverted;

            expect(await energyCredit.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });
    });

    describe("Burning", function () {
        it("Should allow users to burn their tokens", async function () {
            await energyCredit.transfer(addr1.address, ethers.parseEther("100"));

            const initialBalance = await energyCredit.balanceOf(addr1.address);
            await energyCredit.connect(addr1).burn(ethers.parseEther("50"));

            expect(await energyCredit.balanceOf(addr1.address)).to.equal(
                initialBalance - ethers.parseEther("50")
            );
        });

        it("Should emit TokensBurned event", async function () {
            await energyCredit.transfer(addr1.address, ethers.parseEther("100"));

            await expect(energyCredit.connect(addr1).burn(ethers.parseEther("50")))
                .to.emit(energyCredit, "TokensBurned")
                .withArgs(addr1.address, ethers.parseEther("50"));
        });

        it("Should fail if burning more than balance", async function () {
            await expect(
                energyCredit.connect(addr1).burn(ethers.parseEther("1"))
            ).to.be.revertedWith("Insufficient balance to burn");
        });
    });

    describe("Balance queries", function () {
        it("Should return balance in tokens", async function () {
            await energyCredit.mint(addr1.address, 100);
            expect(await energyCredit.balanceOfInTokens(addr1.address)).to.equal(100);
        });
    });
});
