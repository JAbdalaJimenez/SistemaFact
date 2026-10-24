import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ElectroCba - Instalaciones & Facturación",
    short_name: "ElectroCba",
    description: "Plataforma institucional para instaladores electricistas de Córdoba.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B132B",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/logo-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
