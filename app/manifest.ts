import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AGRIGAL · Quaderno di campagna",
    short_name: "AGRIGAL",
    description: "Gestione agricola multiazienda, trattamenti, magazzino e quaderno digitale.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f2",
    theme_color: "#102419",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/agrigal-icon-192.png?v=7",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/agrigal-icon-512.png?v=7",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/agrigal-icon-maskable-512.png?v=7",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
