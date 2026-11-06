export const servicePageQueryKey = (
  pageKey: string,
  preview: boolean,
  revision: number,
  identity: string,
) =>
  preview
    ? ([
        "service-page-content",
        pageKey,
        "preview",
        revision,
        identity,
      ] as const)
    : (["service-page-content", pageKey, "published"] as const);
