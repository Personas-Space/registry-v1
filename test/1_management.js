
const { expect } = require('chai')

const provider = waffle.provider

const BASE_NETWORK = 56
const BASE_URI = 'http://psn.onl'
const FEE = 2

describe('Personas contract management', function () {
  let registry, contractAdmin1, contractAdmin2, registrar2, randomUser1, randomUser2

  before(async () => {
    [
      contractAdmin1, contractAdmin2, registrar2, randomUser1, randomUser2
    ] = await ethers.getSigners()

    const Registry = await ethers.getContractFactory('RegistryV1')

    registry = await Registry.deploy(BASE_NETWORK, BASE_URI, FEE)
  })

  describe('deploy tests', function () {
    it('deploys successfully', async () => {
      expect(registry.address).to.not.equal(null)

      await expect((await registry.network())).to.equal(BASE_NETWORK)
      await expect((await registry.uri())).to.equal(BASE_URI)
      await expect((await registry.fee())).to.equal(FEE)
    })

    it('deployer is contract admin', async () => {
      await expect(await registry.isAdmin(contractAdmin1.address)).to.equal(true)
    })

    it('deployer is a registrar', async () => {
      await expect(await registry.registrar()).to.equal(contractAdmin1.address)
    })

    it('version should be *1*', async () => {
      await expect(await registry.version()).to.equal(1)
    })

    it('not paused', async () => {
      await expect(await registry.paused()).to.equal(false)
    })

    it('persona count is 0', async () => {
      await expect(await registry.count()).to.equal(0)
    })

    it('admin and registrar count are 1 and 1 respectively', async () => {
      await expect(await registry.adminCount()).to.equal(1)
    })
  })

  describe('contract management', function () {
    describe('contract admin actions', function () {
      it('user should not be admin', async () => {
        expect(await registry.isAdmin(contractAdmin2.address)).to.equal(false)
      })

      it('only contract admin can add other admin', async () => {
        await expect(await registry.adminCount()).to.equal(1)
        expect(await registry.isAdmin(contractAdmin2.address)).to.equal(false)
        await expect(registry.connect(randomUser1).addAdmin(contractAdmin2.address)).to.be.revertedWith('Only admin')

        await registry.connect(contractAdmin1).addAdmin(contractAdmin2.address)
        expect(await registry.isAdmin(contractAdmin2.address)).to.equal(true)
        await expect(await registry.adminCount()).to.equal(2)
      })

      it('only contract admin can remove other admin', async () => {
        await expect(registry.connect(randomUser1).removeAdmin(contractAdmin2.address)).to.be.revertedWith('Only admin')

        await registry.connect(contractAdmin1).removeAdmin(contractAdmin2.address)
        expect(await registry.isAdmin(contractAdmin2.address)).to.equal(false)
        await expect(await registry.adminCount()).to.equal(1)
      })

      it('only contract admin can pause contract', async () => {
        await expect(await registry.paused()).to.equal(false)
        await expect(registry.connect(randomUser1).pause()).to.be.revertedWith('Only admin')

        await expect(registry.connect(contractAdmin1).pause()).to.emit(registry, 'Paused')
        await expect(await registry.paused()).to.equal(true)
      })

      it('only contract admin can unpause contract', async () => {
        await expect(await registry.paused()).to.equal(true)
        await expect(registry.connect(randomUser1).unpause()).to.be.revertedWith('Only admin')

        await expect(registry.connect(contractAdmin1).unpause()).to.emit(registry, 'Unpaused')
        await expect(await registry.paused()).to.equal(false)
      })

      it('only contract admin can update contract registrar', async () => {
        await expect(await registry.registrar()).to.equal(contractAdmin1.address)

        await expect(
          registry.connect(randomUser1).updateRegistrar(registrar2.address)
        ).to.be.revertedWith('Only admin')

        await expect(
          registry.connect(contractAdmin1).updateRegistrar(registrar2.address)
        ).to.emit(registry, 'RegistrarUpdated')

        await expect(await registry.registrar()).to.equal(registrar2.address)
      })

      it('only contract admin can update contract fees', async () => {
        const newFee = (await registry.fee()).add(2)

        await expect(
          registry.connect(randomUser1).updateFee(newFee)
        ).to.be.revertedWith('Only admin')

        await expect(
          registry.connect(contractAdmin1).updateFee(newFee)
        ).to.emit(registry, 'FeeUpdated')

        await expect(await registry.fee()).to.equal(newFee)
      })

      it('only contract admin can update contract uri', async () => {
        const newUri = 'https://api.personas.space'

        await expect(registry.connect(randomUser1).updateUri(newUri)).to.be.revertedWith('Only admin')

        await expect(registry.connect(contractAdmin1).updateUri(newUri)).to.emit(registry, 'UriUpdated')
        await expect(await registry.uri()).to.equal(newUri)
      })

      it('only contract admin can withdraw contract revenue', async () => {
        const initialRandomUser2GasBalance = await provider.getBalance(randomUser2.address)
        const initialRegistryContractGasBalance = await provider.getBalance(registry.address)

        await expect(
          registry.connect(randomUser1).withdrawFees(randomUser1.address)
        ).to.be.revertedWith('Only admin')

        const expectedRandomUser2GasBalance = initialRandomUser2GasBalance.add(initialRegistryContractGasBalance)

        await expect(registry.connect(contractAdmin1).withdrawFees(randomUser2.address))
          .to.emit(registry, 'FeesWithdrawn')

        await expect(await provider.getBalance(registry.address)).to.equal(0)
        await expect(await provider.getBalance(randomUser2.address)).to.equal(expectedRandomUser2GasBalance)
      })

      it('last admin cannot be removed', async () => {
        await expect(await registry.adminCount()).to.equal(1)

        await expect(
          registry.connect(contractAdmin1).removeAdmin(contractAdmin1.address)
        ).to.be.revertedWith('Last admin')

        await expect(await registry.adminCount()).to.equal(1)
        await expect(await registry.isAdmin(contractAdmin1.address)).to.equal(true)
      })
    })
  })
})
