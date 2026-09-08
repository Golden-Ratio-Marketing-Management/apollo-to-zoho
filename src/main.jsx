import { createRoot } from "react-dom/client"
import { Toaster } from "react-hot-toast"
import { createTheme, MantineProvider, Select, Table } from "@mantine/core"
import "@mantine/core/styles.css"

import { ZohoProvider } from "./lib/context/zoho.jsx"
import App from "./App.jsx"

const theme = createTheme({
  defaultRadius: 4,
  primaryColor: "indigo",
  fontFamily: "system-ui",
  components: {
    Table: Table.extend({
      styles: { th: { fontWeight: 500 } }
    }),
    Select: Select.extend({
      defaultProps: {
        comboboxProps: { shadow: "md" },
        scrollAreaProps: { type: "always" }
      },
      styles: { label: { fontWeight: 500 } }
    })
  }
})
createRoot(document.getElementById("widget")).render(
  <ZohoProvider>
    <MantineProvider theme={theme}>
      <App />
      {/* <Button variant="outline" onClick={() => window.location.reload()} mt="xl">
        Reload widget
      </Button> */}
    </MantineProvider>
    <Toaster position="top-right" />
  </ZohoProvider>
)
