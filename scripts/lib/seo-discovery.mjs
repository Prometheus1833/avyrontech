/** Follow ordinary HTML links, including public noindex/follow catalog hubs. */
export function discoveryReport(pages, indexableRoutes, origin = "https://avyron.ro") {
  const graph = new Map(pages.map(page => [page.route, page.links || []]));
  const depth = new Map([["/", 0]]), queue = ["/"];
  while (queue.length) {
    const route = queue.shift();
    for (const href of graph.get(route) || []) {
      let target;
      try {
        const url = new URL(href, `${origin}${route}`);
        if (url.origin !== origin) continue;
        target = url.pathname.replace(/\/+$/, "") || "/";
      } catch { continue; }
      if (graph.has(target) && !depth.has(target)) {
        depth.set(target, depth.get(route) + 1);
        queue.push(target);
      }
    }
  }
  return {
    reachablePages: indexableRoutes.filter(route => depth.has(route)).length,
    orphanPages: indexableRoutes.filter(route => !depth.has(route)),
    deepPages: indexableRoutes.filter(route => depth.get(route) > 3).map(route => ({ route, depth: depth.get(route) })),
  };
}
