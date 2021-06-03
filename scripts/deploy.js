async function main () {
  const [deployer] = await ethers.getSigners()

  const provider = waffle.provider // ethers.getDefaultProvider()
  const { chainId } = await provider.getNetwork()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())
  console.log('Deployment network chain id:', chainId)

  const BASE_NETWORK = chainId
  const BASE_URI = 'https://api.personas.space'
  const FEE = 0

  const Registry = await ethers.getContractFactory('RegistryV1')
  const contract = await Registry.deploy(BASE_NETWORK, BASE_URI, FEE)

  console.log('Registry address:', contract.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
