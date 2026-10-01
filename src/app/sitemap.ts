import type { MetadataRoute } from "next";

const routes = [
  "",
  "/leaderboard",
  "/daily",
  "/stats",
  "/history",
  "/settings",
  "/about",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://fintype.app${route}`,
    changeFrequency: route === "/daily" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
