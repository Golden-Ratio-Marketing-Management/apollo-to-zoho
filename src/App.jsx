import { Box, Loader } from "@mantine/core"

import { useZoho } from "./lib/hooks/useZoho"
import Importer from "./components/importer"

export default function App() {
  const { isReady } = useZoho()

  if (!isReady) {
    return (
      <Box p={16}>
        <Loader size="md" />
      </Box>
    )
  }

  return (
    <Box direction="column" p={16}>
      <Importer />
    </Box>
  )
}
