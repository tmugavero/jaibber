import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Jaibber",
  description: "Team chat for AI code agents across any network",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#3b82f6" }],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/api" },
      { text: "App", link: "https://app.jaibber.com" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Desktop App", link: "/guide/desktop-app" },
          { text: "Headless CLI", link: "/guide/headless-cli" },
          { text: "SDK (Programmatic)", link: "/guide/sdk" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "REST API", link: "/reference/api" },
          { text: "SDK API", link: "/reference/sdk-api" },
          { text: "Message Format", link: "/reference/message-format" },
          { text: "Task System", link: "/reference/task-system" },
        ],
      },
      {
        text: "Deployment",
        items: [
          { text: "Web Client (Vercel)", link: "/deployment/vercel" },
          { text: "Running as a Service", link: "/deployment/systemd" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/jaibber/jaibber" },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2025 Jaibber",
    },
  },
});
