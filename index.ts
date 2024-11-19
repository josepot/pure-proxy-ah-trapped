import { dot, dotAh } from "@polkadot-api/descriptors"
import { createClient, Enum } from "polkadot-api"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { chainSpec as chainSpecAh } from "polkadot-api/chains/polkadot_asset_hub"
import { start } from "polkadot-api/smoldot"
import { getSmProvider } from "polkadot-api/sm-provider"

const smoldot = start({ logCallback: () => {} })
const relayChain = smoldot.addChain({ chainSpec })
const ahChain = relayChain.then((chain) =>
  smoldot.addChain({
    chainSpec: chainSpecAh,
    potentialRelayChains: [chain],
  }),
)
const [relayClient, ahClient] = [relayChain, ahChain].map((chain) =>
  createClient(getSmProvider(chain)),
)
const dotApi = relayClient.getTypedApi(dot)
const ahApi = ahClient.getTypedApi(dotAh)

const potentialAddresses = (await dotApi.query.Proxy.Proxies.getEntries())
  .filter(
    ({ value: [delegations] }) =>
      delegations.length === 1 && Enum.is(delegations[0].proxy_type, "Any"),
  )
  .map(({ keyArgs: [address] }) => address)

const problematicAddresses = (
  await ahApi.query.System.Account.getValues(potentialAddresses.map((x) => [x]))
)
  .map(({ sufficients }, idx) => ({
    address: potentialAddresses[idx],
    sufficients,
  }))
  .filter(({ sufficients }) => sufficients > 0)
  .map(({ address }) => address)
console.log(problematicAddresses)

relayClient.destroy()
ahClient.destroy()
smoldot.terminate()
