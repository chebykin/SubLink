export function getPayload(pathname: string) {
  if (pathname === "/health") {
    return { ok: true };
  }

  return {
    name: "sublink-backend",
    ok: true,
    path: pathname
  };
}

export function startServer(port = Number(Bun.env.PORT ?? 3000)) {
  return Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      return Response.json(getPayload(url.pathname));
    }
  });
}

if (import.meta.main) {
  const server = startServer();
  console.log(`Backend listening on http://localhost:${server.port}`);
}
