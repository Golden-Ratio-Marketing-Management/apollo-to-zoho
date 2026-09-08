import { useEffect, useState } from "react"
import { Button, Flex, Select, Tooltip } from "@mantine/core"
import toast from "react-hot-toast"

import { useZoho } from "../lib/hooks/useZoho"
import { apolloURL, zohoURL } from "../config.json"

export default function Toolbar({
  selectedList,
  setSelectedList = () => {},
  selectedCampaign,
  setSelectedCampaign = () => {},
  onPull = () => {},
  disablePull = true,
  pulling = false
}) {
  const { zoho, isReady } = useZoho()

  const [loadingLists, setLoadingLists] = useState(false)
  const [lists, setLists] = useState([])

  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [campaigns, setCampaigns] = useState([])

  async function fetchClientCampaignOptions() {
    setLoadingCampaigns(true)

    try {
      const data = await zoho.CRM.CONNECTION.invoke("zoho_settings", {
        url: zohoURL + "/settings/global_picklists/6968892000004029154",
        method: "GET"
      })
      const options = data?.details?.statusMessage?.global_picklists?.[0]?.pick_list_values

      setCampaigns((prev) => {
        if (!Array.isArray(options)) {
          return prev
        }

        return options
          .filter((o) => o.display_value !== "-None-")
          .map((option) => ({
            label: option.display_value,
            value: option.actual_value
          }))
      })
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch client campaigns.")
    } finally {
      setLoadingCampaigns(false)
    }
  }

  async function fetchApolloLists() {
    setLoadingLists(true)

    try {
      const data = await zoho.CRM.CONNECTION.invoke("apollo", {
        url: apolloURL + "/labels",
        method: "GET"
      })
      const options =
        typeof data?.details?.statusMessage === "string"
          ? JSON.parse(data?.details?.statusMessage)
          : null

      setLists((prev) => {
        if (!Array.isArray(options)) {
          return prev
        }

        return options.map((option) => ({
          label: option.name,
          value: option.id
        }))
      })
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch lists from Apollo.")
    } finally {
      setLoadingLists(false)
    }
  }

  useEffect(() => {
    if (!isReady) return

    fetchApolloLists()
    fetchClientCampaignOptions()
  }, [zoho, isReady])

  return (
    <Flex gap="lg" align="end">
      <Select
        label="Apollo list"
        placeholder="Select list"
        data={lists}
        loading={loadingLists}
        value={selectedList}
        onChange={setSelectedList}
        allowDeselect={false}
      />
      <Select
        label="Client-Campaign"
        placeholder="Select"
        data={campaigns}
        loading={loadingCampaigns}
        value={selectedCampaign}
        onChange={setSelectedCampaign}
        allowDeselect={false}
      />
      <Tooltip
        position="right"
        withArrow
        label="Select at least one row, and a campaign."
        disabled={!disablePull}
      >
        <Button onClick={onPull} loading={pulling} disabled={disablePull}>
          Pull Leads
        </Button>
      </Tooltip>
    </Flex>
  )
}
