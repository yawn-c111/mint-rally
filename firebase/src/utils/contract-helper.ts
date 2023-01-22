import * as ethers from 'ethers'
import * as eventManagerABI from '../abi/EventManagerv2.json'

class EthersService {
  private currentProvider: any

  constructor() {
    const providers = ethers.providers
    this.currentProvider = new providers.JsonRpcProvider(
      process.env.JSON_RPC_PROVIDER
    )
  }

  getEventManager() {
    return new ethers.Contract(
      process.env.CONTRACT_EVENT_MANAGER!,
      eventManagerABI.abi,
      this.currentProvider
    )
  }
}

export default new EthersService()
