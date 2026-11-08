import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { staticBlogPosts, mergeBlogPosts } from "@/lib/blogFeed";
import { resolveBlogMediaUrl, BLOG_COVER_FALLBACK } from "@/lib/blogMedia";
import BlogCover from "@/components/site/BlogCover";

afterEach(cleanup);
it("shares chronological, language-specific articles between blog and landing", () => {
  for (const language of ["ro", "en"] as const) {
    const posts = staticBlogPosts(language);
    expect(posts.length).toBeGreaterThanOrEqual(6);
    expect(
      posts.every(
        (post) => post.language === language && post.status === "published",
      ),
    ).toBe(true);
    expect(posts[0].slug).toBe(
      language === "ro"
        ? "variante-produs-magazin-online-ux-seo"
        : "ai-act-reguli-transparenta-2-august-2026",
    );
    expect(new Set(posts.map((post) => post.slug)).size).toBe(posts.length);
    expect(posts.map((post) => new Date(post.published_at!).getTime())).toEqual(
      posts
        .map((post) => new Date(post.published_at!).getTime())
        .sort((a, b) => b - a),
    );
  }
});
it("uses current published API edits without duplicate slugs", () => {
  const archive = staticBlogPosts("ro"),
    original = archive[0];
  const updated = {
    ...original,
    title: "Titlu publicat actualizat",
    cover_image_url: "/news/nou.webp",
  };
  const merged = mergeBlogPosts([updated], archive, "ro");
  expect(merged).toHaveLength(archive.length);
  expect(merged[0]).toMatchObject(updated);
});
it("excludes unpublished, future, invalid-date and wrong-language API records", () => {
  const original = staticBlogPosts("ro")[0];
  const remote = [
    { ...original, slug: "draft", status: "draft" as const },
    { ...original, slug: "future", published_at: "2099-01-01" },
    { ...original, slug: "invalid", published_at: "invalid" },
    { ...original, slug: "en-only", language: "en" as const },
    { ...original, status: "archived" as const },
  ];
  expect(mergeBlogPosts(remote, [original], "ro")).toEqual([]);
});
it("resolves existing API media and refuses unsafe public cover schemes", () => {
  expect(resolveBlogMediaUrl(" /news/test.webp ")).toBe("/news/test.webp");
  expect(resolveBlogMediaUrl("/api/blog/media/test.webp")).toContain(
    "/api/blog/media/test.webp",
  );
  for (const input of [
    "javascript:alert(1)",
    "//untrusted.test/test.webp",
    "data:image/png;base64,AA",
    "",
    null,
  ])
    expect(resolveBlogMediaUrl(input)).toBe(BLOG_COVER_FALLBACK);
});
it("recovers broken covers once, then shows an accessible placeholder without storage bypass", () => {
  const { container, rerender } = render(
    <BlogCover
      src="https://example.test/unavailable.webp"
      alt="Copertă editorială"
    />,
  );
  fireEvent.error(container.querySelector("img")!);
  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    BLOG_COVER_FALLBACK,
  );
  fireEvent.error(container.querySelector("img")!);
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector('[role="img"]')).toHaveAttribute(
    "aria-label",
    "Copertă editorială",
  );
  rerender(<BlogCover src="/news/restored.webp" alt="Copertă actualizată" />);
  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    "/news/restored.webp",
  );
});
