import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AGRIGAL · Quaderno di campagna",
    short_name: "AGRIGAL",
    description: "Gestione agricola multiazienda, trattamenti, magazzino e quaderno digitale.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f6f2",
    theme_color: "#102419",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/agrigal-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/agrigal-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
