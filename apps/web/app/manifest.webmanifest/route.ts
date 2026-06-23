// Served as /manifest.webmanifest so the PWA is installable on mobile.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Learn Anything",
    short_name: "Learn",
    description: "A privacy-first second brain that teaches you.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#0b0d12",
    orientation: "portrait-primary",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
