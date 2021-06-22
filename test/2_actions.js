
const { expect } = require('chai')
const { keys } = require('../../accounts.json')

const provider = waffle.provider

const BASE_NETWORK = 56
const BASE_URI = 'http://prs.onl'
const FEE = 3
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

// hardhat accounts
const privateKeys = {
  contractAdmin: keys[0],
  registrar1: keys[1],
  user1: keys[2],
  user2: keys[3],
  user3: keys[4],
  user4: keys[5]
}

describe('Registry contract actions', function () {
  let registry, contractAdmin, registrar1, user1, user2, user3, user4

  before(async () => {
    [
      contractAdmin, registrar1, user1, user2, user3, user4
    ] = await ethers.getSigners()

    const Registry = await ethers.getContractFactory('RegistryV1')

    registry = await Registry.deploy(BASE_NETWORK, BASE_URI, FEE)
  })

  describe('all actions', function () {
    before(async () => {
      await expect(
        registry.connect(contractAdmin).updateRegistrar(registrar1.address)
      ).to.emit(registry, 'RegistrarUpdated')

      await expect(
        registry.connect(contractAdmin).updateFee(5)
      ).to.emit(registry, 'FeeUpdated')
    })

    describe('general actions', function () {
      it('only users with valid registrar, signature and fee can create persona', async () => {
        const name = 'kinana'
        const fee = await registry.fee()

        await expect(await registry.name(user1.address)).to.equal('')
        await expect((await registry.persona(name)).user).to.equal(EMPTY_ADDRESS)

        const prePersona = await registry.persona(name)

        await expect(prePersona.created).to.equal(0)
        await expect(prePersona.key).to.equal(0)

        await expect(await registry.count()).to.equal(0)

        const hash = ethers.utils.solidityKeccak256(['string', 'address'], [name, user1.address])
        const prefixedHash = ethers.utils.solidityKeccak256(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', hash])

        const userSigner = new ethers.utils.SigningKey(privateKeys.user1)
        const invalidSignature = ethers.utils.joinSignature(userSigner.signDigest(prefixedHash))

        // _name, _registrar, _addr, _uri, _kind, _resolver, _active, _signature

        await expect(
          registry.connect(user1)
            .registerName(
              name, user1.address, invalidSignature, { value: fee }
            )
        ).to.be.revertedWith('Invalid signer')

        const registrarSigner = new ethers.utils.SigningKey(privateKeys.registrar1)
        const validSignature = ethers.utils.joinSignature(registrarSigner.signDigest(prefixedHash))

        await expect(
          registry.connect(user1)
            .registerName(
              name, user1.address, validSignature, { value: 0 }
            )
        ).to.be.revertedWith('Invalid fee')

        await expect(
          registry.connect(user1)
            .registerName(
              name, user1.address, validSignature, { value: fee }
            )
        ).to.emit(registry, 'NameRegistered')

        await expect(await registry.name(user1.address)).to.equal(name)
        await expect((await registry.persona(name)).user).to.equal(user1.address)

        const postPersona = await registry.persona(name)

        await expect((postPersona.created).toNumber()).to.be.greaterThan(0)
        await expect((postPersona.key).toNumber()).to.be.greaterThan(0)

        await expect(await registry.count()).to.equal(1)
      })

      it('only registrars can create new persona without signature', async () => {
        const name = 'fanta'
        const fee = await registry.fee()

        await expect(await registry.name(user2.address)).to.equal('')
        await expect((await registry.persona(name)).user).to.equal(EMPTY_ADDRESS)

        const prePersona = await registry.persona(name)

        await expect(prePersona.created).to.equal(0)
        await expect(prePersona.key).to.equal(0)

        await expect(await registry.count()).to.equal(1)

        const hash = ethers.utils.solidityKeccak256(['string', 'address'], [name, user2.address])
        const prefixedHash = ethers.utils.solidityKeccak256(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', hash])

        const userSigner = new ethers.utils.SigningKey(privateKeys.user2)
        const invalidSignature = ethers.utils.joinSignature(userSigner.signDigest(prefixedHash))

        await expect(
          registry.connect(user2)
            .registerName(
              name, user2.address, invalidSignature, { value: fee }
            )
        ).to.be.revertedWith('Invalid signer')

        await expect(
          registry.connect(user2)
            .registerName(
              name, user2.address, '0x', { value: fee }
            )
        ).to.be.revertedWith('ECDSA: invalid signature length')

        await expect(
          registry.connect(registrar1)
            .registerName(
              name, user2.address, '0x', { value: fee }
            )
        ).to.emit(registry, 'NameRegistered')

        await expect(await registry.name(user2.address)).to.equal(name)
        await expect((await registry.persona(name)).user).to.equal(user2.address)

        const postPersona = await registry.persona(name)

        await expect((postPersona.created).toNumber()).to.be.greaterThan(0)
        await expect((postPersona.key).toNumber()).to.be.greaterThan(0)

        await expect(await registry.count()).to.equal(2)
      })

      it('an already claimed name cannot be re-registered', async () => {
        const name = 'fanta'
        const fee = await registry.fee()

        await expect((await registry.persona(name)).user).to.equal(user2.address)
        await expect(await registry.name(user3.address)).to.equal('')

        const hash = ethers.utils.solidityKeccak256(['string', 'address'], [name, user3.address])
        const prefixedHash = ethers.utils.solidityKeccak256(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', hash])

        const registrarSigner = new ethers.utils.SigningKey(privateKeys.registrar1)
        const validSignature = ethers.utils.joinSignature(registrarSigner.signDigest(prefixedHash))

        await expect(
          registry.connect(user3)
            .registerName(
              name, user3.address, validSignature, { value: fee }
            )
        ).to.be.revertedWith('Name already claimed')
      })

      it('registrar cannot re-register already claimed name', async () => {
        const name = 'fanta'
        const fee = await registry.fee()

        await expect((await registry.persona(name)).user).to.equal(user2.address)
        await expect(await registry.name(user3.address)).to.equal('')

        await expect(
          registry.connect(registrar1)
            .registerName(
              name, user3.address, '0x', { value: fee }
            )
        ).to.be.revertedWith('Name already claimed')
      })

      it('an account cannot register multiple names', async () => {
        const name = 'coke'
        const fee = await registry.fee()

        await expect((await registry.persona(name)).user).to.equal(EMPTY_ADDRESS)
        await expect(await registry.name(user2.address)).to.not.equal('')

        await expect(
          registry.connect(registrar1)
            .registerName(
              name, user2.address, '0x', { value: fee }
            )
        ).to.be.revertedWith('Claimant already registered')
      })

      it('cannot register names when paused', async () => {
        const name = 'coke2'
        const fee = await registry.fee()

        await expect(registry.connect(contractAdmin).pause()).to.emit(registry, 'Paused')
        await expect(await registry.paused()).to.equal(true)

        await expect((await registry.persona(name)).user).to.equal(EMPTY_ADDRESS)
        await expect(await registry.name(user2.address)).to.not.equal('')

        await expect(
          registry.connect(registrar1)
            .registerName(
              name, user2.address, '0x', { value: fee }
            )
        ).to.be.revertedWith('Pausable: paused')

        await expect(registry.connect(contractAdmin).unpause()).to.emit(registry, 'Unpaused')
        await expect(await registry.paused()).to.equal(false)
      })
    })

    describe('revenues', function () {
      it('only contract admin can withdraw revenues', async () => {
        const initialUserBalance = await provider.getBalance(user4.address)
        const initialContractBalance = await provider.getBalance(registry.address)

        await expect(registry.connect(user1).withdrawFees(user4.address)).to.be.revertedWith('Only admin')

        await expect(registry.connect(contractAdmin).withdrawFees(user4.address)).to.emit(registry, 'FeesWithdrawn')

        await expect(
          await provider.getBalance(registry.address)
        ).to.equal(0)

        await expect(
          await provider.getBalance(user4.address)
        ).to.equal(initialUserBalance.add(initialContractBalance))
      })
    })
  })
})
